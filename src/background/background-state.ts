import * as secret from "../lib/naclfast-secret-box/nacl-fast.js";
import { sha256Async } from "../lib/crypto-lite/crypto-primitives-browser.js";
import * as Network from "../lib/near-api-lite/network.js";
import {
    localStorageRemove,
    recoverFromLocalStorage,
    localStorageSave,
    localStorageSet,
    localStorageGet,
} from "../data/local-storage.js";
//import { showErr } from "../util/document.js";

//import { askBackground, askBackgroundViewMethod } from "../background/askBackground.js";
import { log } from "../lib/log.js";

import * as clite from "../lib/crypto-lite/crypto-primitives-browser.js";
import {
    encodeBase64,
    decodeBase64,
    stringFromUint8Array,
    Uint8ArrayFromString,
} from "../lib/crypto-lite/encode.js";

import type { NetworkInfo } from "../lib/near-api-lite/network.js";
import type { StateStruct } from "../structs/state-structs.js";
import { isValidEmail } from "../lib/near-api-lite/utils/valid.js";
import { GContact } from "../data/contact.js";
//import { activeNetworkInfo } from "../index.js";
import { yton } from "../util/conversions.js";
import { Account } from "../structs/account-info.js";

const DATA_VERSION = "0.1";

const INVALID_USER_OR_PASS = "Invalid Password";


//---- GLOBAL STATE ----

export const EmptyState: StateStruct = {
    dataVersion: DATA_VERSION,
    usersList: [],
    currentUser: "",
};

export var state = Object.assign({}, EmptyState);

type NetworkNameType = string;
type AccountIdType = string;

//data that's stored *encrypted* in local storage
// for each-user
type NarwalletSecureData = {
    dataVersion: string;
    hashedPass?: string;
    autoUnlockSeconds: number;
    advancedMode: boolean;
    // SecureState.accounts => { network { accountId { ...info
    accounts: Record<NetworkNameType, Record<AccountIdType, Account>>;
    contacts: Record<NetworkNameType, Record<AccountIdType, GContact>>;
};

const EmptySecureState: NarwalletSecureData = {
    dataVersion: DATA_VERSION,
    hashedPass: undefined,
    autoUnlockSeconds: 1800,
    advancedMode: false,
    accounts: {},
    contacts: {},
};

export var secureState: NarwalletSecureData = Object.assign(
    {},
    EmptySecureState
);

export function clearState() {
    state = Object.assign({}, EmptyState);
}

export function saveState() {
    localStorageSave("State", "S", state);
    log("STATE SAVED " + JSON.stringify(state));
}

type callbackERR = (err: string) => void;

export async function recoverState(): Promise<void> {
    state = await recoverFromLocalStorage("State", "S", EmptyState);
    //console.log("Recover state", State)
}

export async function sha256PwdBase64Async(password: string): Promise<string> {
    const hash = await clite.sha256Async(Uint8ArrayFromString(password));
    return encodeBase64(new Uint8Array(hash));
}


export function saveUnlockSHA(unlockSHA: string) {
    localStorageSet({ _us: unlockSHA });
}
export async function getUnlockSHA() {
    return localStorageGet("_us")
}
export function clearUnlockSHA() {
    localStorageRemove("_us");
}

export function isLocked() {
    //DEBUG
    // if (!SecureState) log("isLocked()? yes, !SecureState");
    // else if (!SecureState.hashedPass)
    //   log("isLocked()? yes, !SecureState.hashedPass");
    return !secureState || !secureState.hashedPass;
}
export function lock(source: string) {
    clearUnlockSHA()
    // clear SecureState && SecureState.hashedPass
    secureState = Object.assign({}, EmptySecureState);
    log("LOCKED from:" + source);
    // log("LOCKED call stack:" + JSON.stringify(new Error().stack));
}

export async function changePasswordAsync(
    email: string,
    password: string
): Promise<void> {
    if (!password || password.length < 8) {
        throw Error("password must be at least 8 characters long");
    }

    state.currentUser = email;
    secureState.hashedPass = await sha256PwdBase64Async(password);
    saveSecureState();

    lock("changePasswordAsync"); //log out current user
}

export async function createUserAsync(
    email: string,
    password: string
): Promise<void> {
    if (!isValidEmail(email)) {
        throw Error("Invalid email");
    } else if (state.usersList.includes(email)) {
        throw Error("User already exists");
    } else if (!password || password.length < 8) {
        throw Error("password must be at least 8 characters long");
    }
    lock("createUserAsync"); //log out current user

    state.currentUser = email;
    await createSecureStateAsync(password);
    //save new user in usersList
    state.usersList.push(email);
    saveState();
}

export async function createSecureStateAsync(password: string) {
    secureState.hashedPass = await sha256PwdBase64Async(password);
    secureState.accounts = {};
    saveSecureState();
    saveUnlockSHA(secureState.hashedPass)
}

export function saveSecureState() {
    if (!secureState.hashedPass) {
        throw new Error("Invalid/locked SecureState");
    }

    const keyPair = secret.sign_keyPair_fromSeed(
        decodeBase64(secureState.hashedPass)
    );
    const keyUint8Array = keyPair.publicKey;

    const nonce = secret.randomBytes(secret.secretbox_nonceLength);
    const messageUint8 = Uint8ArrayFromString(JSON.stringify(secureState));
    const box = secret.secretbox(messageUint8, nonce, keyUint8Array);

    const fullMessage = new Uint8Array(nonce.length + box.length);
    fullMessage.set(nonce);
    fullMessage.set(box, nonce.length);

    const base64FullMessage = encodeBase64(fullMessage);

    //localStorage.setItem("SS", base64FullMessage)
    localStorageSave("Secure State", state.currentUser, base64FullMessage);
}

export function setCurrentUser(user: string) {
    if (state.currentUser != user) {
        //remember last user
        try {
            state.currentUser = user;
            saveState();
        } catch { }
    }
}

function decryptIntoJson(
    hashedPassBase64: string,
    encryptedMsg: string
): NarwalletSecureData {
    if (!encryptedMsg) throw new Error("encryptedState is empty");

    const keyPair = secret.sign_keyPair_fromSeed(decodeBase64(hashedPassBase64));
    const keyUint8Array = keyPair.publicKey;

    const messageWithNonceAsUint8Array = decodeBase64(encryptedMsg);
    const nonce = messageWithNonceAsUint8Array.slice(
        0,
        secret.secretbox_nonceLength
    );
    const message = messageWithNonceAsUint8Array.slice(
        secret.secretbox_nonceLength,
        encryptedMsg.length
    );

    const decrypted = secret.secretbox_open(message, nonce, keyUint8Array);

    if (decrypted == null || !decrypted) throw Error(INVALID_USER_OR_PASS);

    const decryptedAsString = stringFromUint8Array(decrypted as Uint8Array);
    return JSON.parse(decryptedAsString);
}

export async function unlockSecureStateAsync(
    email: string,
    password: string
): Promise<void> {
    const hash = await sha256PwdBase64Async(password);
    return unlockSecureStateSHA(email, hash);
}

//recover with PASSWORD_HASH or throws
export async function unlockSecureStateSHA(
    email: string,
    hashedPassBase64: string
): Promise<void> {
    //const encryptedState = localStorage.getItem("SS")
    if (!email) throw new Error("email is null");
    const encryptedState = await localStorageGet(email);
    if (!encryptedState) throw Error(INVALID_USER_OR_PASS);
    const decrypted = decryptIntoJson(hashedPassBase64, encryptedState);
    secureState = decrypted;
    saveUnlockSHA(hashedPassBase64)
    setCurrentUser(email); // set & save State.currentUser
}

//------------------
// get existing account on Network.current or throw
export function getAccount(accName: string): Account {
    log("getAccount", accName);
    if (isLocked()) throw Error(`Narwallets: Wallet is locked`);
    const network = Network.current;
    if (!network)
        throw Error(`Narwallets: No network selected. Unlock the wallet`);
    const accounts = secureState.accounts[network];
    if (!accounts)
        throw Error(`Narwallets: No info on ${network}. Unlock the wallet`);
    const accInfo = accounts[accName];
    if (!accInfo)
        throw Error(
            `Narwallets: account ${accName} NOT FOUND on wallet. Network:${network}`
        );
    return accInfo;
}
//------------------
export function saveAccount(accName: string, accountInfo: Account) {
    if (!accName || !accountInfo || !accountInfo.network) {
        log("saveAccount called but no data");
        return;
    }

    let accountsForCurrentNetwork = secureState.accounts[accountInfo.network];
    if (accountsForCurrentNetwork == undefined) {
        //no accounts yet
        accountsForCurrentNetwork = {}; //create empty object
        secureState.accounts[accountInfo.network] = accountsForCurrentNetwork;
    }

    accountsForCurrentNetwork[accName] = accountInfo;

    saveSecureState();
}

export function getNetworkAccountsCount() {
    const accounts = secureState.accounts[Network.current];
    if (!accounts) return 0;
    return Object.keys(accounts).length;
}

export function getAutoUnlockSeconds() {
    let aul = secureState.autoUnlockSeconds;
    if (aul == undefined) aul = 30;
    return aul;
}

