//on the browser this scripts are imported by the HTML
//can't do for example: nacl=require("./tweetnacl/nacl-fast")
//because it won't work in the browser
const sha=require("./util/js-sha256.js")
const nacl=require("./tweetnacl/nacl-fast.js")
nacl.util=require("./tweetnacl/nacl-util.js");

//--- GLOBAL CONSTANTS ---
const OPEN = "open"
const CLICK = "click"
const CREATE="create"

const HIDDEN = "hidden"

const ERR_DIV = "err-div"

//---- GLOBAL STATE ----
/*+
//data that's not encrypted
type NarwalletData= {
  network: string;
  networkName: string;
  secureStateExists:boolean;
  unlockSHA: Uint8Array;
}
declare var State:NarwalletData;

//data that's encrypted before saving in the localStorage
type NarwalletSecureData = {
  passHash: Uint8Array;
}
declare var SecureState:NarwalletSecureData;
+*/


//@ts-ignore
State/*:NarwalletData*/ = {};
//@ts-ignore
SecureState/*:NarwalletSecureData*/ = {};

function saveState() {
  localStorage.setItem("S", JSON.stringify(State))
}

function recoverState() {
  try {
    const stringState = localStorage.getItem("S")
    if (stringState) {
      try {
        State = JSON.parse(stringState);
      }
      catch {
        alert("CRITICAL. Invalid state. State reset");
      }
      finally { }
    }
  }
  catch (err) {
    alert("CRITICAL. Can't recover state " + err.message);
  }
  finally { }

  //default State values
  if (!State) {
    //@ts-ignore
    State = {}
  }
  if (!State.network) {
    State.network = "testnet";
    State.networkName = "NEAR Testnet";
  }
}

function createSecureState(password/*:string*/) {
  SecureState.passHash = new Uint8Array(sha.sha256.arrayBuffer(password));
  saveSecureState();
}

function saveSecureState() {

  if (!SecureState.passHash){throw new Error("Invalid SecureState, no passHash")}

  const keyPair = nacl.sign.keyPair.fromSeed(SecureState.passHash);
  const keyUint8Array = keyPair.publicKey;

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = nacl.util.decodeUTF8(JSON.stringify(SecureState));
  const box = nacl.secretbox(messageUint8, nonce, keyUint8Array);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  const base64FullMessage = nacl.util.encodeBase64(fullMessage);

  localStorage.setItem("SS", base64FullMessage)

  State.secureStateExists=true;
  saveState()
}

function recoverSecureState(password/*:string*/)/*:boolean*/ {
  return recoverSecureStateSHA(new Uint8Array(sha.sha256.arrayBuffer(password)))
}

function recoverSecureStateSHA(passHash/*:Uint8Array*/)/*:boolean*/ {

  const encryptedState = localStorage.getItem("SS")
  if (!encryptedState) return false;

  const keyPair = nacl.sign.keyPair.fromSeed(passHash);
  const keyUint8Array = keyPair.publicKey;

  const messageWithNonceAsUint8Array = nacl.util.decodeBase64(encryptedState);
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox.nonceLength);
  const message = messageWithNonceAsUint8Array.slice(
    nacl.secretbox.nonceLength,
    encryptedState.length
  );

  const decrypted = nacl.secretbox.open(message, nonce, keyUint8Array);

  if (!decrypted) return false;

  const base64DecryptedMessage = nacl.util.encodeUTF8(decrypted);

  try {
    SecureState = JSON.parse(base64DecryptedMessage);
  }
  catch {
    return false;
  }
  finally { }

  return true;
}


//------- GLOBAL FUNCTIONS -------------

/**
 * wrapper around document.getElementById
 * @param id 
 */
function byId(id/*:string*/)/*:HTMLElement*/ {
  try {
    return document.getElementById(id) /*+as HTMLElement+*/
  }
  catch {
    return new HTMLElement();
  }
}
function textById(id/*:string*/)/*:HTMLTextAreaElement*/ {
  try {
    return document.getElementById(id) /*+as HTMLTextAreaElement+*/
  }
  catch {
    return new HTMLTextAreaElement();
  }
}


//--background page
/*+
type BackgroundPage ={
  backgroundFunction(msg:string):void;
}
+*/


/**
* removes class=hidden from an element
* @param id 
*/
function showPage(id/*:string*/) {
  const toShow = byId(id);
  toShow.classList.remove(HIDDEN); //show requested
  document.querySelectorAll(".page").forEach((el) => {
    //hide all others
    if (el !== toShow) el.classList.add(HIDDEN);
  })
}
function hideDiv(id/*:string*/) {
  byId(id).classList.add(HIDDEN);
};

// shows a message on ERR_DIV for 5 seconds
// requires div id="err-div" and class .show
function showErr(msg/*:string*/) {
  const errDiv = byId(ERR_DIV)
  if (!errDiv) {
    console.error("MISSING err-div ON THIS PAGE")
    alert(msg);
    return;
  }
  errDiv.innerText = msg;
  errDiv.classList.add("show");
  setTimeout(() => { errDiv.classList.remove("show") }, 5000);
}

