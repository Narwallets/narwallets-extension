import * as nacl from "../util/tweetnacl/nacl-fast.js";
import * as naclUtil from "../util/tweetnacl/nacl-util.js";
import * as sha256 from "../api/sha256.js";
import * as Network from "../api/network.js";
import { recoverFromLocalStorage, localStorageSave, localStorageGet } from "./util.js";
import { log } from "../api/log.js";
const DATA_VERSION = "0.1";
const INVALID_USER_OR_PASS = "Invalid User or Password";
//---- GLOBAL STATE ----
export const EmptyState = {
    dataVersion: DATA_VERSION,
    usersList: [],
    currentUser: "",
};
export var State = Object.assign({}, EmptyState);
export var workingData = { unlockSHA: "" };
// SecureState.accounts => { network { accountId { ...info
const EmptySecureState = {
    dataVersion: DATA_VERSION,
    hashedPass: undefined,
    autoUnlockSeconds: 30,
    advancedMode: false,
    accounts: {}
};
export var SecureState = Object.assign({}, EmptySecureState);
export function clearState() {
    State = Object.assign({}, EmptyState);
}
export function saveState() {
    localStorageSave("State", "S", State);
}
export async function recoverState() {
    State = await recoverFromLocalStorage("State", "S", EmptyState);
}
export function sha256PwdBase64(password) {
    return naclUtil.encodeBase64(sha256.hash(naclUtil.decodeUTF8(password)));
}
export function lock() {
    workingData.unlockSHA = "";
    SecureState = Object.assign({}, EmptySecureState);
    log("LOCKED");
}
export function createSecureState(password) {
    SecureState.hashedPass = sha256PwdBase64(password);
    SecureState.accounts = {};
    saveSecureState();
}
export function saveSecureState() {
    if (!SecureState.hashedPass) {
        throw new Error("Invalid/locked SecureState");
    }
    const keyPair = nacl.sign_keyPair_fromSeed(naclUtil.decodeBase64(SecureState.hashedPass));
    const keyUint8Array = keyPair.publicKey;
    const nonce = nacl.randomBytes(nacl.secretbox_nonceLength);
    const messageUint8 = naclUtil.decodeUTF8(JSON.stringify(SecureState));
    const box = nacl.secretbox(messageUint8, nonce, keyUint8Array);
    const fullMessage = new Uint8Array(nonce.length + box.length);
    fullMessage.set(nonce);
    fullMessage.set(box, nonce.length);
    const base64FullMessage = naclUtil.encodeBase64(fullMessage);
    //localStorage.setItem("SS", base64FullMessage)
    localStorageSave("Secure State", State.currentUser, base64FullMessage);
}
export function setCurrentUser(user) {
    if (State.currentUser != user) {
        //remember last user
        try {
            State.currentUser = user;
            saveState();
        }
        catch { }
    }
}
export function isLocked() {
    //DEBUG
    if (!SecureState)
        log("isLocked()? yes, !SecureState");
    else if (!SecureState.hashedPass)
        log("isLocked()? yes, !SecureState.hashedPass");
    return !SecureState || !SecureState.hashedPass;
}
function decryptIntoJson(hashedPassBase64, encryptedMsg) {
    if (!encryptedMsg)
        throw new Error("encryptedState is empty");
    const keyPair = nacl.sign_keyPair_fromSeed(naclUtil.decodeBase64(hashedPassBase64));
    const keyUint8Array = keyPair.publicKey;
    const messageWithNonceAsUint8Array = naclUtil.decodeBase64(encryptedMsg);
    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox_nonceLength);
    const message = messageWithNonceAsUint8Array.slice(nacl.secretbox_nonceLength, encryptedMsg.length);
    const decrypted = nacl.secretbox_open(message, nonce, keyUint8Array);
    if (decrypted == null || !decrypted)
        throw Error(INVALID_USER_OR_PASS);
    const base64DecryptedMessage = naclUtil.encodeUTF8(decrypted);
    return JSON.parse(base64DecryptedMessage);
}
//recover with PASSWORD_HASH or throws
export async function unlockSecureStateSHA(email, hashedPassBase64) {
    //const encryptedState = localStorage.getItem("SS")
    if (!email)
        throw new Error("email is null");
    const encryptedState = await localStorageGet(email);
    if (!encryptedState)
        throw Error(INVALID_USER_OR_PASS);
    const decrypted = decryptIntoJson(hashedPassBase64, encryptedState);
    SecureState = decrypted;
    workingData.unlockSHA = hashedPassBase64; //auto-save on popup-unload (with expiry time)
    setCurrentUser(email); // set & save State.currentUser
}
//------------------
// get existing account on Network.current or throw
export function getAccount(accName) {
    log("getAccount", accName);
    if (isLocked())
        throw Error(`Narwallets: Wallet is locked`);
    const network = Network.current;
    if (!network)
        throw Error(`Narwallets: No network selected. Unlock the wallet`);
    const accounts = SecureState.accounts[network];
    if (!accounts)
        throw Error(`Narwallets: No info on ${network}. Unlock the wallet`);
    const accInfo = accounts[accName];
    if (!accInfo)
        throw Error(`Narwallets: account ${accName} NOT FOUND on wallet. Network:${network}`);
    return accInfo;
}
//------------------
export function saveAccount(accName, accountInfo) {
    if (!accName || !accountInfo) {
        console.error("saveFoundAccount called but no data");
        return;
    }
    let accountsForCurrentNetwork = SecureState.accounts[Network.current];
    if (accountsForCurrentNetwork == undefined) { //no accounts yet
        accountsForCurrentNetwork = {}; //create empty object
        SecureState.accounts[Network.current] = accountsForCurrentNetwork;
    }
    accountsForCurrentNetwork[accName] = accountInfo;
    saveSecureState();
}
export function getNetworkAccountsCount() {
    const accounts = SecureState.accounts[Network.current];
    if (!accounts)
        return 0;
    return Object.keys(accounts).length;
}
export function getAutoUnlockSeconds() {
    let aul = SecureState.autoUnlockSeconds;
    if (aul == undefined)
        aul = 30;
    return aul;
}
