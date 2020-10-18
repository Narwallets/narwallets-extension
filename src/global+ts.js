import * as nacl from "./util/tweetnacl/nacl-fast.js"
import * as naclUtil from "./util/tweetnacl/nacl-util.js";
import * as sha256 from "./util/fast-sha256/sha256.js"
import { showErr } from "./common+ts.js";

//---- GLOBAL STATE ----
/*+
//data that's not encrypted
type NarwalletData= {
  network: string;
  networkName: string;
  networkRootAccount: string;
  secureStateExists?:boolean;
  unlockSHA?: string;
}

//data that's encrypted before saving in the chrome.storage.sync
type AccountInfo = {
  type: string;
  stakingPool: string;
  lockingContract: string;
}


//data that's encrypted before saving in the chrome.storage.sync
type NarwalletSecureData = {
  passHash?: string;
  accounts: Record<string,AccountInfo>;
}
+*/

export var State/*:NarwalletData*/ = {
  network: "testnet",
  networkName: "NEAR Testnet",
  networkRootAccount: "testnet"
};

export var SecureState/*:NarwalletSecureData*/ = {
  accounts: {} 
};

export function saveState() {
  chrome.storage.sync.set({ "S": State },()=>{
    if (chrome.runtime.lastError) showErr(chrome.runtime.lastError.message /*+as string+*/);
  })
  //localStorage.setItem("S", JSON.stringify(State))
}

/*+
type callbackERR = (err:string) => void;
+*/

export function recoverState(callback/*:callbackERR*/) {
  try {
    chrome.storage.sync.get("S", (keys) => {
      State = (keys.S||{}) /*+as NarwalletData+*/;
      if (!State.network) {
        State.network = "testnet";
        State.networkName = "NEAR Testnet";
        State.networkRootAccount = "testnet";
      }
      callback("")
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
    callback(err.message);
    alert("CRITICAL. Can't recover state " + err.message);
  }
  finally { }

}

function sha256PwdBase64(password/*:string*/)/*:string*/ {
  return naclUtil.encodeBase64(sha256.hash(naclUtil.decodeUTF8(password)));
}


export function createSecureState(password/*:string*/) {
  SecureState.passHash = sha256PwdBase64(password);
  SecureState.accounts = {}
  saveSecureState();
}

export function saveSecureState() {

  if (!SecureState.passHash) { throw new Error("Invalid SecureState, no passHash") }

  const keyPair = nacl.sign_keyPair_fromSeed(naclUtil.decodeBase64(SecureState.passHash));
  const keyUint8Array = keyPair.publicKey;

  const nonce = nacl.randomBytes(nacl.secretbox_nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(JSON.stringify(SecureState));
  const box = nacl.secretbox(messageUint8, nonce, keyUint8Array);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  const base64FullMessage = naclUtil.encodeBase64(fullMessage);

  //localStorage.setItem("SS", base64FullMessage)
  chrome.storage.sync.set({SS: base64FullMessage })

  State.secureStateExists = true;
  saveState()
}


export function setAutoUnlock(password/*:string*/) {
  State.unlockSHA = sha256PwdBase64(password); //auto-unlock key
  saveState();
}


function decryptSecureState(passHashBase64/*:string*/, encryptedState/*:string*/)/*:boolean*/ {

  if (!encryptedState) return false;

  const keyPair = nacl.sign_keyPair_fromSeed(naclUtil.decodeBase64(passHashBase64));
  const keyUint8Array = keyPair.publicKey;

  const messageWithNonceAsUint8Array = naclUtil.decodeBase64(encryptedState);
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox_nonceLength);
  const message = messageWithNonceAsUint8Array.slice(
    nacl.secretbox_nonceLength,
    encryptedState.length
  );

  const decrypted = nacl.secretbox_open(message, nonce, keyUint8Array);

  if (!decrypted) return false;

  const base64DecryptedMessage = naclUtil.encodeUTF8(decrypted);

  try {
    SecureState = JSON.parse(base64DecryptedMessage);
    return true;
  }
  catch (ex) {
    console.error(ex.message);
    return false;
  }
  finally { }
}

/*+
type callbackOK = (ok:boolean) => void;
+*/

export function recoverSecureState(password/*:string*/, callback/*:callbackOK*/) {
  tryRecoverSecureStateSHA(sha256PwdBase64(password),callback)
}

export function tryRecoverSecureStateSHA(passHashBase64/*:string*/, callback/*:callbackOK*/) /*:void*/ {
  //const encryptedState = localStorage.getItem("SS")
  try {
    chrome.storage.sync.get("SS", (keys) => {
      callback(decryptSecureState(passHashBase64, keys.SS)); //decryptSecureState() does the job and return true:success or false:failure
    })
  } catch (ex) {
    callback(ex.message);
  }
}


//--background page
/*+
type BackgroundPage ={
  backgroundFunction(msg:string):void;
}
+*/

