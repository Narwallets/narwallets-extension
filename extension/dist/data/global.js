import * as secret from "../lib/naclfast-secret-box/nacl-fast.js";
import * as Network from "../lib/near-api-lite/network.js";
import { recoverFromLocalStorage, localStorageSave, localStorageGet, } from "./util.js";
import { log } from "../lib/log.js";
import * as clite from "../lib/crypto-lite/crypto-primitives-browser.js";
import { encodeBase64, decodeBase64, stringFromUint8Array, Uint8ArrayFromString, } from "../lib/crypto-lite/encode.js";
const DATA_VERSION = "0.1";
const INVALID_USER_OR_PASS = "Invalid User or Password";
import { isValidEmail } from "../lib/near-api-lite/utils/valid.js";
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
    autoUnlockSeconds: 1800,
    advancedMode: false,
    accounts: {},
    contacts: {},
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
export async function sha256PwdBase64Async(password) {
    const hash = await clite.sha256Async(Uint8ArrayFromString(password));
    return encodeBase64(new Uint8Array(hash));
}
export function lock(source) {
    workingData.unlockSHA = "";
    SecureState = Object.assign({}, EmptySecureState);
    log("LOCKED from:" + source);
    log("LOCKED call stack:" + JSON.stringify(new Error().stack));
}
export async function createUserAsync(email, password) {
    if (!isValidEmail(email)) {
        throw Error("Invalid email");
    }
    else if (State.usersList.includes(email)) {
        throw Error("User already exists");
    }
    else if (!password || password.length < 8) {
        throw Error("password must be at least 8 characters long");
    }
    lock("createUserAsync"); //log out current user
    State.currentUser = email;
    await createSecureStateAsync(password);
    //save new user in usersList
    State.usersList.push(email);
    saveState();
}
export async function createSecureStateAsync(password) {
    SecureState.hashedPass = await sha256PwdBase64Async(password);
    SecureState.accounts = {};
    saveSecureState();
}
export function saveSecureState() {
    if (!SecureState.hashedPass) {
        throw new Error("Invalid/locked SecureState");
    }
    const keyPair = secret.sign_keyPair_fromSeed(decodeBase64(SecureState.hashedPass));
    const keyUint8Array = keyPair.publicKey;
    const nonce = secret.randomBytes(secret.secretbox_nonceLength);
    const messageUint8 = Uint8ArrayFromString(JSON.stringify(SecureState));
    const box = secret.secretbox(messageUint8, nonce, keyUint8Array);
    const fullMessage = new Uint8Array(nonce.length + box.length);
    fullMessage.set(nonce);
    fullMessage.set(box, nonce.length);
    const base64FullMessage = encodeBase64(fullMessage);
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
    const keyPair = secret.sign_keyPair_fromSeed(decodeBase64(hashedPassBase64));
    const keyUint8Array = keyPair.publicKey;
    const messageWithNonceAsUint8Array = decodeBase64(encryptedMsg);
    const nonce = messageWithNonceAsUint8Array.slice(0, secret.secretbox_nonceLength);
    const message = messageWithNonceAsUint8Array.slice(secret.secretbox_nonceLength, encryptedMsg.length);
    const decrypted = secret.secretbox_open(message, nonce, keyUint8Array);
    if (decrypted == null || !decrypted)
        throw Error(INVALID_USER_OR_PASS);
    const decryptedAsString = stringFromUint8Array(decrypted);
    return JSON.parse(decryptedAsString);
}
export async function unlockSecureStateAsync(email, password) {
    const hash = await sha256PwdBase64Async(password);
    return unlockSecureStateSHA(email, hash);
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
        log("saveFoundAccount called but no data");
        return;
    }
    let accountsForCurrentNetwork = SecureState.accounts[Network.current];
    if (accountsForCurrentNetwork == undefined) {
        //no accounts yet
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
export let nearDollarPrice = 0;
export async function calculateDollarValue() {
    try {
        let result = await fetch("https://api.diadata.org/v1/quotation/NEAR");
        let response = await result.json();
        nearDollarPrice = response.Price;
        document.querySelector("#usd-price-link")?.dispatchEvent(new CustomEvent("usdPriceReady", {
            detail: "Dollar price",
        }));
    }
    catch (ex) {
        console.log(ex);
    }
}
//# sourceMappingURL=global.js.map