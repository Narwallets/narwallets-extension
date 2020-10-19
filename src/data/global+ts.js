import * as nacl from "../util/tweetnacl/nacl-fast.js"
import * as naclUtil from "../util/tweetnacl/nacl-util.js";
import * as sha256 from "../util/fast-sha256/sha256.js"
import * as Network from "./Network+ts.js";
import { showErr } from "../common+ts.js";

const DATA_VERSION="0.1"

/*+
import type {NetworkInfo} from "./Network+ts";

//---- GLOBAL STATE ----
/*+
//data that's not encrypted
type NarwalletData= {
  dataVersion: string;
  usersList: string[];
  currentUser:string;
  unlockSHA?: string;
}

//user NEAR accounts info type
type AccountInfo = {
  type: string;
  stakingPool: string;
  lockingContract: string;
  lastBalance: string;
}

type NetworkNameType=string;
type AccountIdType=string;

//data that's encrypted before saving in the chrome.storage.sync
// for each-user
type NarwalletSecureData = {
  dataVersion: string;
  hashedPass?: string;
  initialNetworkName: string;
  accounts: Record<NetworkNameType,Record<AccountIdType,AccountInfo>>; 
}
+*/
// SecureState.accounts => { network { accountId { ...info

export const EmptyState/*:NarwalletData*/ = {
  dataVersion: DATA_VERSION,
  usersList: [],
  currentUser: "",
  unlockSHA: undefined,
};

export var State = EmptyState;

const EmptySecureState/*:NarwalletSecureData*/ = {
  dataVersion: DATA_VERSION,
  hashedPass: undefined,
  initialNetworkName: Network.defaultName,
  accounts: {}
};

export var SecureState/*:NarwalletSecureData*/ = EmptySecureState;
export var unlocked = false;


export function clearState(){
  State = Object.assign({},EmptyState);
  unlocked = false;
}

export function saveState() {
  chrome.storage.sync.set({ "S": State }, () => {
    if (chrome.runtime.lastError) showErr(chrome.runtime.lastError.message /*+as string+*/);
  })
  //localStorage.setItem("S", JSON.stringify(State))
}

/*+
type callbackERR = (err:string) => void;
+*/

export function recoverState()/*:Promise<void>*/ {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("S", (keys) => {
        State = (keys.S || {}) /*+as NarwalletData+*/;
        if (Object.keys(State).length==0) Object.assign(State,EmptyState);
        return resolve()
      })
      // const stringState = localStorage.getItem("S")
      // if (stringState) {
      //   try {
      //     State = JSON.parse(stringState);
      //   }
      //   catch {
      //     alert("CRITICAL. Invalid state. State reset");
      //   }
      //   finally { }
      // }
    }
    catch (err) {
      console.error("CRITICAL. Can't recover state", err.message);
      reject()
    }
    finally { }
  });
}

function sha256PwdBase64(password/*:string*/)/*:string*/ {
  return naclUtil.encodeBase64(sha256.hash(naclUtil.decodeUTF8(password)));
}

export function lock(){
  unlocked =false;
  State.unlockSHA=undefined;
  SecureState = EmptySecureState;
}


export function createSecureState(password/*:string*/) {
  SecureState.hashedPass = sha256PwdBase64(password);
  SecureState.accounts = {}
  saveSecureState();
  unlocked=true;
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
  const dataToStore/*:any*/={}
  dataToStore[State.currentUser] = base64FullMessage;
  chrome.storage.sync.set(dataToStore, () => {
    if (chrome.runtime.lastError) showErr(chrome.runtime.lastError.message /*+as string+*/);
  })

}


export function setAutoUnlock(password/*:string*/) {
  State.unlockSHA = sha256PwdBase64(password); //auto-unlock key
  saveState();
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

  if (decrypted==null||!decrypted) throw new Error("Invalid Password");

  const base64DecryptedMessage = naclUtil.encodeUTF8(decrypted /*+as Uint8Array+*/);
  return JSON.parse(base64DecryptedMessage);
 }

//recover with PASSWORD
export function tryRecoverSecureState(user/*:string*/,password/*:string*/) /*:Promise<void>*/ {
  return tryRecoverSecureStateSHA(user, sha256PwdBase64(password))
}

//recover with PASSWORD_HASH
export function tryRecoverSecureStateSHA(user/*:string*/, hashedPassBase64/*:string*/) /*:Promise<void>*/ {
  //const encryptedState = localStorage.getItem("SS")
  return new Promise((resolve, reject) => {
      try {
        if (!user) throw new Error("user is null")
        chrome.storage.sync.get(user, (obj) => {
          try {
            const decrypted=decryptIntoJson(hashedPassBase64, obj[State.currentUser]);
            SecureState = decrypted
            State.currentUser=user;
            Network.setCurrent(SecureState.initialNetworkName);
            unlocked=true;
            resolve()
          }
          catch(ex){
            SecureState = EmptySecureState;
            unlocked=false;
            reject(ex);
          }
        })
      } catch (ex) {
        SecureState = EmptySecureState;
        unlocked=false;
        reject(ex);
      }
  });
}


//--background page
/*+
type BackgroundPage ={
  backgroundFunction(msg:string):void;
}
+*/

