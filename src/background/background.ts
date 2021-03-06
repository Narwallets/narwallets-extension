import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import { log, logEnabled } from "../api/log.js"

import * as Network from "../api/network.js"
import * as nearAccounts from "../util/search-accounts.js"

import * as near from "../api/near-rpc.js"
import { setRpcUrl } from "../api/utils/json-rpc.js"
import { localStorageSet, localStorageGet } from "../data/util.js"
import * as TX from "../api/transaction.js"

import { isValidEmail } from "../api/utils/valid.js"

import type { FunctionCall,DeleteAccountToBeneficiary } from "../api/batch-transaction.js"
import type {ResolvedMessage} from "../api/state-type.js"

//version: major+minor+version, 3 digits each
function semver(major:number,minor:number,version:number):number{return major*1e6+minor*1e3+version}
const WALLET_VERSION = semver(1,0,3) 

//---------- working data
let _connectedTabs:Record<number,ConnectedTabInfo> = {};
let _bgDataRecovered:boolean;

// if the transaction include attached near, store here to update acc balance async
let global_NearsSent = {from:"", to:"", amount:0};

//----------------------------------------
//-- LISTEN to "chrome.runtime.message" from own POPUPs or from content-scripts
//-- msg path is popup->here->action->sendResponse(err,data)
//-- msg path is tab->cs->here->action
//----------------------------------------
//https://developer.chrome.com/extensions/background_pages
chrome.runtime.onMessage.addListener(runtimeMessageHandler)

function runtimeMessageHandler(msg:any, sender:chrome.runtime.MessageSender, sendResponse:Function) {

  //check if it comes from the web-page or from this extension 
  const url = sender.url ? sender.url : "";
  const fromPage = !url.startsWith("chrome-extension://" + chrome.runtime.id + "/");

  //console.log("runtimeMessage received ",sender, url)
  log("runtimeMessage received " + (fromPage ? "FROM PAGE " : "from popup ") + JSON.stringify(msg));
  if (msg.dest != "ext") {
    sendResponse({ err: "msg.dest must be 'ext'" })
  }
  else if (fromPage) {
    // from web-app/tab -> content-script
    // process separated from internal requests for security
    msg.url = url; //add source
    msg.tabId = (sender.tab ? sender.tab.id : -1); //add tab.id
    setTimeout(()=>{processMessageFromWebPage(msg)},100); //execute async
  }
  else {
    //from internal pages like popup
    //other codes resolved by promises
    global_NearsSent = {from:"", to:"", amount:0};
    getActionPromise(msg)
      .then((data) => { //promise resolved OK
          setTimeout(reflectTransfer,200); //move amounts if accounts are in the wallet
          sendResponse({ data: data }) 
      })
      .catch((ex) => { 
        sendResponse({ err: ex.message }) 
      })
    //sendResponse will be called async .- always return true
    //returning void cancels all pending callbacks
  }
  return true; //a prev callback could be pending.- always return true
}

//-- reflec transfer in wallet accounts
function reflectTransfer() {
  try {
    if (global_NearsSent.amount==0 || !global.SecureState ) return;
    let modified=false;
    //check if sender is in this wallet
    if (global_NearsSent.from && global.SecureState.accounts[Network.current]) {
        const senderAccInfo = global.SecureState.accounts[Network.current][global_NearsSent.from]
        if (senderAccInfo) {
          senderAccInfo.lastBalance -= global_NearsSent.amount
          modified = true;
        }
    }
    //check if receiver is also in this wallet
    if (global_NearsSent.to && global.SecureState.accounts[Network.current]) {
        const receiverAccInfo = global.SecureState.accounts[Network.current][global_NearsSent.to]
        if (receiverAccInfo) {
          receiverAccInfo.lastBalance += global_NearsSent.amount
          modified = true;
        }
    }
    if (modified){
      global.saveSecureState();
    }
  }
  catch(ex){
    console.error(ex.message);
  }
}

//create a promise to resolve the action requested by the popup
function getActionPromise(msg:Record<string,any>):Promise<any> {

  try {

    if (msg.code == "set-network") {
      Network.setCurrent(msg.network)
      localStorageSet({ selectedNetwork: Network.current })
      return Promise.resolve(Network.currentInfo());
    }
    else if (msg.code == "get-network-info") {
      return Promise.resolve(Network.currentInfo());
    }

    else if (msg.code == "get-state") {
      return Promise.resolve(global.State);
    }
    else if (msg.code == "lock") {
      global.lock()
      return Promise.resolve()
    }
    else if (msg.code == "is-locked") {
      return Promise.resolve(global.isLocked())

    }
    else if (msg.code == "unlockSecureState") {
      return global.unlockSecureStateSHA(msg.email, global.sha256PwdBase64(msg.password))
    }

    else if (msg.code == "create-user") {

      if (!isValidEmail(msg.email)) {
        throw Error("Invalid email");
      }
      else if (global.State.usersList.includes(msg.email)) {
        throw Error("User already exists")
      }
      else if (!msg.password || msg.password.length < 8) {
        throw Error("password must be at least 8 characters long")
      }
      global.lock() //log out current user

      global.State.currentUser = msg.email;
      global.createSecureState(msg.password);
      //save new user in usersList
      global.State.usersList.push(msg.email);
      global.saveState()
      return Promise.resolve()
    }

    else if (msg.code == "set-options") {
      global.SecureState.advancedMode = msg.advancedMode;
      global.SecureState.autoUnlockSeconds = msg.autoUnlockSeconds;
      global.saveSecureState()
      return Promise.resolve()
    }
    else if (msg.code == "get-options") {
      return Promise.resolve({
        advancedMode: global.SecureState.advancedMode,
        autoUnlockSeconds: global.SecureState.autoUnlockSeconds,
      })
    }

    else if (msg.code == "get-account") {
      if (!global.SecureState.accounts[Network.current]) return Promise.resolve(undefined);
      return Promise.resolve(global.SecureState.accounts[Network.current][msg.accountId])
    }
    else if (msg.code == "set-account") {
      if (!msg.accountId) return Promise.reject(Error("!msg.accountId"))
      if (!msg.accInfo) return Promise.reject(Error("!msg.accInfo"))
      if (!global.SecureState.accounts[Network.current]) global.SecureState.accounts[Network.current] = {}
      global.SecureState.accounts[Network.current][msg.accountId] = msg.accInfo;
      global.saveSecureState()
      return Promise.resolve()
    }
    else if (msg.code == "set-account-order") { //whe the user reorders the account list
      try{
        let accInfo = global.getAccount(msg.accountId)
        accInfo.order = msg.order;
        global.saveSecureState()
        return Promise.resolve()
      }
      catch (ex){
        return Promise.reject(ex)
      }
    }
    else if (msg.code == "remove-account") {
      delete global.SecureState.accounts[Network.current][msg.accountId];
      //persist
      global.saveSecureState()
      return Promise.resolve()
    }

    else if (msg.code == "getNetworkAccountsCount") {
      return Promise.resolve(global.getNetworkAccountsCount())
    }
    else if (msg.code == "all-network-accounts") {
      const result = global.SecureState.accounts[Network.current]
      return Promise.resolve(result || {})
    }

    else if (msg.code == "connect") {
      if (!msg.network) msg.network = Network.current;
      return connectToWebPage(msg.accountId, msg.network);
    }
    else if (msg.code == "disconnect") {
      return disconnectFromWebPage()
    }
    else if (msg.code == "isConnected") {
      return isConnected();
    }

    else if (msg.code == "get-validators") {
      //view-call request
      return near.getValidators();
    }
    else if (msg.code == "access-key") {
      //check acess-key exists and get nonce
      return near.access_key(msg.accountId, msg.publicKey);
    }
    else if (msg.code == "query-near-account") {
      //check acess-key exists and get nonce
      return near.queryAccount(msg.accountId);
    }

    else if (msg.code == "view") {
      //view-call request
      return near.view(msg.contract, msg.method, msg.args);
    }

    else if (msg.code == "apply") {
      //apply transaction request from popup
      //{code:"apply", signerId:<account>, tx:BatchTransction} 
      //when resolved, send msg to content-script->page
      const signerId = msg.signerId || "...";
      const accInfo = global.getAccount(signerId);
      if (!accInfo.privateKey) throw Error(`Narwallets: account ${signerId} is read-only`)
      //convert wallet-api actions to near.TX.Action
      const actions:TX.Action[] = []
      for (let item of msg.tx.items) {
        //convert action
        switch (item.action) {
          case "call":
            const f = item as FunctionCall;
            actions.push(TX.functionCall(f.method, f.args, near.BNTGas(f.Tgas), near.BNntoy(f.attachedNear)))
            global_NearsSent = {from: signerId, to:msg.tx.receiver, amount:f.attachedNear};
            break;
          case "transfer":
            actions.push(TX.transfer(near.BNntoy(item.attachedNear)))
            global_NearsSent = {from: signerId, to:msg.tx.receiver, amount:item.attachedNear};
            break;
          case "delete":
            const d = item as DeleteAccountToBeneficiary;
            actions.push(TX.deleteAccount(d.beneficiaryAccountId))
            break;
          default:
            throw Error("batchTx UNKNOWN item.action=" + item.action)
        }
      }
      //returns the Promise required to complete this action
      return near.broadcast_tx_commit_actions(actions, signerId, msg.tx.receiver, accInfo.privateKey)
    }
    //default
    throw Error(`invalid msg.code ${JSON.stringify(msg)}`)
  }
  catch (ex) {
    return Promise.reject(ex)
  }
}

//---------------------------------------------------
//process msgs from web-page->content-script->here
//---------------------------------------------------
async function processMessageFromWebPage(msg:any) {

  log(`enter processMessageFromWebPage _bgDataRecovered ${_bgDataRecovered}`);

  if (!msg.tabId) {
    console.error("msg.tabId is ", msg.tabId)
    return;
  }

  if (!_bgDataRecovered) await retrieveBgInfoFromStorage()
  if (!_connectedTabs[msg.tabId]) _connectedTabs[msg.tabId] = {};
  const ctinfo = _connectedTabs[msg.tabId];

  //when resolved, send msg to content-script->page
  let resolvedMsg :ResolvedMessage = { dest: "page", code: "request-resolved", tabId: msg.tabId, requestId: msg.requestId }

  log(`processMessageFromWebPage _bgDataRecovered ${_bgDataRecovered}`, JSON.stringify(msg));

  switch (msg.code) {

    case "connected":
      ctinfo.aceptedConnection = (!msg.err)
      ctinfo.connectedResponse = msg
      break;

    case "disconnect":
      ctinfo.aceptedConnection = false
      break;

    case "get-account-balance":
      near.queryAccount(msg.accountId)
        .then(data => {
          resolvedMsg.data = data.amount;  //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch(ex => {
          resolvedMsg.err = ex.message;  //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
      break;

    case "get-account-state":
      near.queryAccount(msg.accountId)
        .then(data => {
          resolvedMsg.data = data;  //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch(ex => {
          resolvedMsg.err = ex.message;  //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
      break;
  
    case "view":
      //view-call request
      near.view(msg.contract, msg.method, msg.args)
        .then(data => {
          resolvedMsg.data = data;  //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch(ex => {
          resolvedMsg.err = ex.message;  //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
      break;

    case "apply":
      //tx apply, change call request, requires user approval
      try {
        if (!ctinfo.connectedAccountId) {
          throw Error("connectedAccountId is null")  //if error also send msg to content-script->tab
        }

        //verify account exists and is full-access
        const signerId = ctinfo.connectedAccountId
        const accInfo = global.getAccount(signerId)
        if (!accInfo.privateKey) throw Error(`Narwallets: account ${signerId} is read-only`)

        msg.dest = "approve" //send msg to the approval popup
        msg.signerId = ctinfo.connectedAccountId;
        msg.network = Network.current;

        //pass message via chrome.extension.getBackgroundPage() common window
        //@ts-ignore
        window.pendingApprovalMsg = msg;

        //load popup window for the user to approve
        const width = 500
        const height = 540
        chrome.windows.create({
          url: 'popups/approve/approve.html',
          type: 'popup',
          left: screen.width / 2 - width / 2,
          top: screen.height / 2 - height / 2,
          width: width,
          height: height,
          focused: true
        })
      }
      catch (ex) {
        //@ts-ignore
        window.pendingApprovalMsg = undefined;
        resolvedMsg.err = ex.message;  //if error, also send msg to content-script->tab
        chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
      }
      break;

    default:
      console.error("unk msg.code", JSON.stringify(msg))
  }

}

//------------------------
//on extension installed
//------------------------
chrome.runtime.onInstalled.addListener(function (details) {

  log("onInstalled")

  if (details.reason == "install") {
    //call a function to handle a first install
  } else if (details.reason == "update") {
    //call a function to handle an update
  }
});



/**
 * Tries to connect to web page. (CPS style)
 * There are several steps involved
 * 1. inject proxy-content-script
 * 2. wait for injected-proxy to open the contenScriptPort
 * 3. send "connect" 
 * 4. check response from the page
 */

//Continuation-Passing style data
type CPSDATA=
  {accountId:string,network:string, activeTabId:number,
        url:string|undefined, ctinfo:ConnectedTabInfo,
        resolve:Function, reject:Function
  }

function connectToWebPage(accountId:string, network:string): Promise<any> {
  log("connectToWebPage start")

  return new Promise((resolve, reject) => {

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

      const activeTabId = tabs[0].id || -1;
      if (!_connectedTabs) _connectedTabs={}
      if (!_connectedTabs[activeTabId]) _connectedTabs[activeTabId] = {};

      const cpsData:CPSDATA = {
        accountId: accountId,
        network: network,
        activeTabId: activeTabId,
        url: tabs[0].url,
        ctinfo: _connectedTabs[activeTabId],
        resolve: resolve,
        reject: reject
      }
      log("activeTabId", cpsData)
      cpsData.ctinfo = _connectedTabs[cpsData.activeTabId]
      cpsData.ctinfo.aceptedConnection = false; //we're connecting another
      cpsData.ctinfo.connectedResponse = {};

      //check if it responds (if it is already injected)
      try {
        chrome.tabs.sendMessage(cpsData.activeTabId, { code: "ping" }, function (response) {
          if (!response) {
            //not responding, set injected status to false
            cpsData.ctinfo.injected = false;
            //console.error(JSON.stringify(chrome.runtime.lastError));
          }
          else {
            //responded set injected status
            cpsData.ctinfo.injected = true;
          }
          //CPS
          return continueCWP_2(cpsData)
        })
      }
      catch (ex) {
        //err trying to talk to the page, set injected status
        cpsData.ctinfo.injected = false;
        console.error(ex);
        //CPS
        return continueCWP_2(cpsData)
      }
    })
  })
}

///inject if necessary
function continueCWP_2(cpsData:CPSDATA) {
  if (cpsData.ctinfo.injected) {
    //if responded, it was injected, continue
    return continueCWP_3(cpsData);
  }
  //not injected yet. Inject/execute contentScript on activeTab
  //contentScript replies with a chrome.runtime.sendmessage 
  //it also listens to page messages and relays via chrome.runtime.sendmessage 
  //basically contentScript.js acts as a proxy to pass messages from ext<->tab
  log("injecting")
  try {
    chrome.tabs.executeScript({ file: 'dist/background/contentScript.js' },
      function () {
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError))
          return cpsData.reject(chrome.runtime.lastError)
        }
        else {
          //injected ok
          cpsData.ctinfo.injected = true
          //CPS
          return continueCWP_3(cpsData);
        }
      })
  }
  catch (ex) {
    return cpsData.reject(ex)
  }
}

///send connect order
function continueCWP_3(cpsData:CPSDATA) {
  cpsData.ctinfo.connectedResponse={err:undefined};
  log("chrome.tabs.sendMessage to", cpsData.activeTabId, cpsData.url)
  //send connect order via content script. a response will be received later
  chrome.tabs.sendMessage(cpsData.activeTabId, { dest: "page", code: "connect", data: { accountId: cpsData.accountId, network: cpsData.network, version: WALLET_VERSION } })
  //wait 250 for response
  setTimeout(() => {
    if (cpsData.ctinfo.aceptedConnection) { //page responded with connection info
      cpsData.ctinfo.connectedAccountId = cpsData.accountId //register connected acount
      return cpsData.resolve();
    }
    else {
      let errMsg = cpsData.ctinfo.connectedResponse.err || "not responding / Not a Narwallets-compatible Web App"
      return cpsData.reject(Error(cpsData.url + ": " + errMsg))
    }
  }, 250);
}



type ConnectedTabInfo = {
    injected?:boolean;
    aceptedConnection?:boolean;
    connectedAccountId?:string;
    connectedResponse?:any;
}


function disconnectFromWebPage():Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTabId = tabs[0].id || -1
      if (_connectedTabs[activeTabId] && _connectedTabs[activeTabId].aceptedConnection) {
        _connectedTabs[activeTabId].aceptedConnection = false;
        chrome.tabs.sendMessage(activeTabId, { dest: "page", code: "disconnect" })
        return resolve();
      }
      else {
        return reject(Error("active web page is not connected"));
      }
    })
  })
}

function isConnected():Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!_connectedTabs) return resolve(false);
    chrome.tabs.query({ active: true, currentWindow: true },
      function (tabs) {
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError))
        }
        if (!tabs || tabs.length==0 || !tabs[0]) return resolve(false);
        const activeTabId = tabs[0].id
        if (!activeTabId) return resolve(false);
        return resolve(!!(_connectedTabs[activeTabId] && _connectedTabs[activeTabId].aceptedConnection))
      })
  })
}


function saveWorkingData() {
  localStorageSet({ _ct: [_connectedTabs, global.workingData.unlockSHA]})
  // if (!global.isLocked()) {
  //   localStorageSet({ _unlock:  })
  // }
}
//recover working data if it was suspended
async function recoverWorkingData():Promise<void> {
  [ _connectedTabs, global.workingData.unlockSHA ] = await localStorageGet("_ct");
  log("RECOVERED _connectedTabs", _connectedTabs)
  log("RECOVERED SHA", global.workingData.unlockSHA)
  //@ts-ignore 
  //_connectedTabs = await localStorageGet("_ct");
}


//------------------------
//on bg page suspended
//------------------------
chrome.runtime.onSuspend.addListener(function () {
  //save working data
  saveWorkingData()
  log("onSuspend.");
  chrome.browserAction.setBadgeText({ text: "" });
});


//------------------------
//----- expire auto-unlock
//------------------------
const UNLOCK_EXPIRED = "unlock-expired"

//------------------------
//expire alarm
//------------------------
chrome.alarms.onAlarm.addListener(
  function (alarm:any) {
    //log("chrome.alarms.onAlarm fired ", alarm);
    if (alarm.name == UNLOCK_EXPIRED) {
      global.lock()
      chrome.alarms.clearAll()
      window.close()//unload this background page 
      //chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
    }
  }
);

var lockTimeout:any;
var unlockExpire:any;
//only to receive "popupLoading"|"popupUnloading" events
window.addEventListener("message",
  async function (event) {
    if (event.data.code == "popupUnloading") {
      if (!global.isLocked()) {
        const autoUnlockSeconds = global.getAutoUnlockSeconds()
        unlockExpire = Date.now() + autoUnlockSeconds * 1000
        chrome.alarms.create(UNLOCK_EXPIRED, { when: unlockExpire })
        log(UNLOCK_EXPIRED, autoUnlockSeconds)
        if (autoUnlockSeconds < 60 * 5) {
          //also setTimeout to Lock, because alarms fire only once per minute
          if (lockTimeout) clearTimeout(lockTimeout)
          lockTimeout = setTimeout(global.lock, autoUnlockSeconds * 1000)
        }
      }
      return;
    }
    else if (event.data.code == "popupLoading") {
      log("popupLoading")
      await retrieveBgInfoFromStorage()
      chrome.runtime.sendMessage({dest:"popup",code:"can-init-popup"})
    }
  },
  false);

// called on popupLoading to consider the possibility the user added accounts to the wallet on another tab
  async function retrieveBgInfoFromStorage(){
    if (unlockExpire && Date.now()>unlockExpire) global.lock()
    if (lockTimeout) clearTimeout(lockTimeout)
    //To manage the possibilit that the user has added/removed accounts ON ANOTHER TAB
    //we reload state & secureState from storage when the popup opens
    await global.recoverState()
    if (!global.State.dataVersion) {
      global.clearState();
    }
    if (global.State.currentUser && global.workingData.unlockSHA){
      //try to recover secure state
      try {
        await global.unlockSecureStateSHA(global.State.currentUser, global.workingData.unlockSHA);
      }
      catch (ex) {
        console.error("recovering secure state on retrieveBgInfoFromStorage", ex.message)
      }
    }
    _bgDataRecovered = true;
    const nw = await localStorageGet("selectedNetwork") as string;
    if (nw) Network.setCurrent(nw);
    log("NETWORK=",nw);
}

//returns true if loaded-upacked, developer mode
//false if installed from the chrome store
function isDeveloperMode() {
  return !('update_url' in chrome.runtime.getManifest());
}

document.addEventListener('DOMContentLoaded', onLoad);
async function onLoad() {
  //WARNING:: if the background page wakes-up because a tx-apply
  //chrome will process "MessageFromPage" ASAP, meaning BEFORE the 2nd await.
  //solution: MessageFromPage is on a setTimeout to execute async
  //logEnabled(isDeveloperMode());
  log("background.js onLoad", new Date());
  [ _connectedTabs, global.workingData.unlockSHA ] = await localStorageGet("_ct");
  log("_ct RECOVERED ", JSON.stringify(_connectedTabs), global.workingData.unlockSHA)
  //await recoverWorkingData()
  if (!_bgDataRecovered) await retrieveBgInfoFromStorage()
}
