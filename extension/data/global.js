import * as nacl from "../util/tweetnacl/nacl-fast.js"
import * as naclUtil from "../util/tweetnacl/nacl-util.js";
import * as sha256 from "../api/sha256.js"
import * as Network from "./Network.js";
import { localStorageRemove, recoverFromLocalStorage, localStorageSave, localStorageSet, localStorageGet } from "./util.js";
import { showErr, IUOP as INVALID_USER_OR_PASS } from "../util/document.js";
import { Account } from "../data/Account.js"; //required for SecureState declaration

const DATA_VERSION = "0.1"


/*+
import type {NetworkInfo} from "./Network.js";

//---- GLOBAL STATE ----
/*+
//data that's not encrypted
type StateStruc= {
  dataVersion: string;
  usersList: string[];
  currentUser:string;
}
+*/


export const EmptyState/*:StateStruc*/ = {
  dataVersion: DATA_VERSION,
  usersList: [],
  currentUser: "",
};

export var State = Object.assign({}, EmptyState);

export const saveOnUnload = {
  unlockSHA: "" //while the extension is open. When the ext gets closed, this is saved if auto-unlock is enabled
}

/*+
type NetworkNameType=string;
type AccountIdType=string;

//data that's stored *encrypted* in local storage
// for each-user
type NarwalletSecureData = {
  dataVersion: string;
  hashedPass?: string;
  initialNetworkName: string;
  autoUnlockSeconds: number;
  advancedMode: boolean;
  accounts: Record<NetworkNameType,Record<AccountIdType,Account>>; 
}
+*/
// SecureState.accounts => { network { accountId { ...info

const EmptySecureState/*:NarwalletSecureData*/ = {
  dataVersion: DATA_VERSION,
  hashedPass: undefined,
  initialNetworkName: Network.defaultName,
  autoUnlockSeconds: 15,
  advancedMode: false,
  accounts: {}
};

export var SecureState/*:NarwalletSecureData*/ = Object.assign({}, EmptySecureState);
export var unlocked = false;


export function clearState() {
  State = Object.assign({}, EmptyState);
  unlocked = false;
}

export function saveState() {
  localStorageSave("State", "S", State)
}

/*+
type callbackERR = (err:string) => void;
+*/


export async function recoverState()/*:Promise<void>*/ {
  State = await recoverFromLocalStorage("State", "S", EmptyState)
}

function sha256PwdBase64(password/*:string*/)/*:string*/ {
  return naclUtil.encodeBase64(sha256.hash(naclUtil.decodeUTF8(password)));
}

export function lock() {
  unlocked = false;
  saveOnUnload.unlockSHA = "";
  SecureState = EmptySecureState;
  localStorageRemove('uk') //clear auto-unlock
}


export function createSecureState(password/*:string*/) {
  SecureState.hashedPass = sha256PwdBase64(password);
  SecureState.accounts = {}
  saveSecureState();
  unlocked = true;
}

export function saveSecureState() {

  if (!State.currentUser) throw new Error("No curent User")
  if (!SecureState.hashedPass) { throw new Error("Invalid SecureState, no hashedPass") }

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
  localStorageSave("Secure State", State.currentUser, base64FullMessage)

}


export function setAutoUnlock(user/*:string*/, hashedPassBase64/*:string*/) {

  if (State.currentUser != user) {
    //remember last user
    try { State.currentUser = user; saveState(); } catch { }
  }

  saveOnUnload.unlockSHA = hashedPassBase64; //auto-save on popup-unload (with expiry time)
  const expireMs = SecureState.autoUnlockSeconds * 1000
  localStorageSet({uk: hashedPassBase64, exp: Date.now() + expireMs})
}


function decryptIntoJson(hashedPassBase64/*:string*/, encryptedMsg/*:string*/)/*:NarwalletSecureData*/ {

  if (!encryptedMsg) throw new Error("encryptedState is empty");

  const keyPair = nacl.sign_keyPair_fromSeed(naclUtil.decodeBase64(hashedPassBase64));
  const keyUint8Array = keyPair.publicKey;

  const messageWithNonceAsUint8Array = naclUtil.decodeBase64(encryptedMsg);
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox_nonceLength);
  const message = messageWithNonceAsUint8Array.slice(
    nacl.secretbox_nonceLength,
    encryptedMsg.length
  );

  const decrypted = nacl.secretbox_open(message, nonce, keyUint8Array);

  if (decrypted == null || !decrypted) throw Error(INVALID_USER_OR_PASS);

  const base64DecryptedMessage = naclUtil.encodeUTF8(decrypted /*+as Uint8Array+*/);
  return JSON.parse(base64DecryptedMessage);
}

//recover with PASSWORD or throws
export async function unlockSecureState(email/*:string*/, password/*:string*/) /*:Promise<void>*/ {
  return unlockSecureStateSHA(email, sha256PwdBase64(password))
}

//recover with PASSWORD_HASH or throws
export async function unlockSecureStateSHA(email/*:string*/, hashedPassBase64/*:string*/) /*:Promise<void>*/ {
  //const encryptedState = localStorage.getItem("SS")
  if (!email) throw new Error("email is null")
  const encryptedState = await localStorageGet(email)
  if (!encryptedState) throw Error(INVALID_USER_OR_PASS)
  const decrypted = decryptIntoJson(hashedPassBase64, encryptedState);
  SecureState = decrypted
  unlocked = true;
  try { setAutoUnlock(email, hashedPassBase64); } catch { } //auto-unlock & set current user
  try { Network.setCurrent(SecureState.initialNetworkName) } catch { };
}

//------------------
export function saveAccount(accName/*:string*/, accountInfo/*:Account*/) {

  if (!accName || !accountInfo) {
    console.error("saveFoundAccount called but no data")
    return;
  }

  let accountsForCurrentNetwork = SecureState.accounts[Network.current]
  if (accountsForCurrentNetwork == undefined) { //no accounts yet
    accountsForCurrentNetwork = {} //create empty object
    SecureState.accounts[Network.current] = accountsForCurrentNetwork
  }

  accountsForCurrentNetwork[accName] = accountInfo

  saveSecureState()
}

export function getNetworkAccountsCount() {
  const accounts = SecureState.accounts[Network.current]
  if (!accounts) return 0;
  return Object.keys(accounts).length
}

export function getAutoUnlockSeconds() {
  let aul = SecureState.autoUnlockSeconds
  if (aul == undefined) aul = 15;
  return aul;
}

//--background page
/*+
type BackgroundPage ={
  backgroundFunction(msg:string):void;
}
+*/

