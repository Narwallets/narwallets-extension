import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import { recoverOptions, options } from "../data/options.js"

import * as Network from "../api/network.js"
import * as nearAccounts from "../util/search-accounts.js"

import * as near from "../api/near-rpc.js"
import { setRpcUrl } from "../api/utils/json-rpc.js"
import { localStorageSet, localStorageGet } from "../data/util.js"
import * as TX from "../api/transaction.js"

import { isValidEmail } from "../api/utils/valid.js"

/*+
import type { FunctionCall } from "../api/batch-transaction.js"
import type {ResolvedMessage} from "../api/state-type.js"
+*/

/*HAY QUE HACER QUE BACKGROUND JS HAGA TODO LO RELACIONADO CON COMUNICARSE CON near
Y debe saber CUAL ES LA RED SELECCIONADA, ETC, ETC
-POPUP DEBE USAR BACKGROUND (askBackground) PARA TODO
*/

//----------------------------------------
//-- LISTEN to "chrome.runtime.message" from own POPUPs or from content-scripts
//-- msg path is popup->here->action->sendResponse(err,data)
//-- msg path is tab->cs->here->action
//----------------------------------------
//https://developer.chrome.com/extensions/background_pages
chrome.runtime.onMessage.addListener(runtimeMessageHandler)

function runtimeMessageHandler(msg/*:any*/, sender/*:chrome.runtime.MessageSender*/, sendResponse/*:Function*/) {

  //check if it comes from the web-page or from this extension 
  const url = sender.url ? sender.url : "";
  const fromPage = !url.startsWith("chrome-extension://" + chrome.runtime.id + "/");

  //console.log("runtimeMessage received ",sender, url)
  console.log("runtimeMessage received " + (fromPage ? "FROM PAGE " : "from popup ") + JSON.stringify(msg));
  if (msg.dest != "ext") {
    sendResponse({ err: "msg.dest must be 'ext'" })
  }
  else if (fromPage) {
    // from a tab/contents-script
    msg.url = url; //add source
    msg.tabId = (sender.tab ? sender.tab.id : -1); //add tab.id
    processMessageFromWebPage(msg)
  }
  else {
    //from internal pages like popup

    //simple messages
    if (msg.code == "popupUnloading") {
      const autoUnlockSeconds = global.getAutoUnlockSeconds()
      chrome.alarms.create(UNLOCK_EXPIRED, { when: Date.now() + autoUnlockSeconds * 1000 })
      return;
    }
    else if (msg.code == "network-changed") {
      try {
        Network.setCurrent(msg.network)
        localStorageSet({ backgroundNetwork: Network.current })
      }
      catch (ex) {
        console.error(ex)
      }
      return;
    }
    //other codes resolved by promises
    getActionPromise(msg)
      .then((data) => { sendResponse({ data: data }) })
      .catch((ex) => { sendResponse({ err: ex.message }) })
    //sendResponse will be called async .- always return true
    //returning void cancels all pending callbacks
  }
  return true; //a prev callback could be pending.- always return true
}

//create a promise to resolve the action requested by the popup
function getActionPromise(msg/*:Record<string,any>*/)/*:Promise<any>*/ {

  try {

    if (msg.code == "set-network") {
      Network.setCurrent(msg.network)
      return Promise.resolve();
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
    else if (msg.code == "unlockSecureState") {
      return global.unlockSecureState(msg.email, msg.password)
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
      if (!global.SecureState.accounts[Network.current]) global.SecureState.accounts[Network.current] = {}
      global.SecureState.accounts[Network.current][msg.accountId] = msg.accInfo;
      global.saveSecureState()
      return Promise.resolve()
    }
    else if (msg.code == "delete-account") {
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

    else if (msg.code == "view") {
      //view-call request
      return near.view(msg.contract, msg.method, msg.args);
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


    else if (msg.code == "apply") {
      //apply transaction request from popup
      //tx.apply request
      //when resolved, send msg to content-script->page
      const signerId = msg.signerId || "...";
      const accInfo = global.SecureState.accounts[Network.current][signerId]
      if (!accInfo) throw Error(`account ${signerId} NOT FOUND on wallet`)
      if (!accInfo.privateKey) throw Error(`account ${signerId} is read-only`)
      //convert wallet-api actions to near.TX.Action
      const actions/*:TX.Action[]*/ = []
      for (let item of msg.tx.items) {
        //convert action
        switch (item.action) {
          case "call":
            const f = item /*+as FunctionCall+*/;
            actions.push(TX.functionCall(f.method, f.args, near.ONE_TGAS.muln(f.Tgas), near.ONE_NEAR.muln(f.attachedNear)))
            break;
          case "transfer":
            actions.push(TX.transfer(near.ONE_NEAR.muln(item.attachedNear)))
            break;
          default:
            throw Error("batchTx UNKNOWN item.action=" + item.action)
        }
      }
      //restuns the Promise required to complete this action
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
function processMessageFromWebPage(msg/*:any*/) {

  console.log("processMessageFromWebPage", msg);

  if (!msg.tabId) {
    console.error("msg.tabId is ", msg.tabId)
    return;
  }
  if (!_connectedTabs[msg.tabId]) _connectedTabs[msg.tabId] = {};
  const ctinfo = _connectedTabs[msg.tabId];

  //when resolved, send msg to content-script->page
  let resolvedMsg /*:ResolvedMessage*/ = { dest: "page", code: "request-resolved", tabId: msg.tabId, requestId: msg.requestId }

  switch (msg.code) {

    case "connected":
      ctinfo.aceptedConnection = (!msg.err)
      ctinfo.connectedResponse = msg
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
      try {
        if (!ctinfo.connectedAccountId) {
          throw Error("connectedAccountId is null")  //if error also send msg to content-script->tab
        }

        //creify account exists and is full-access
        const signerId = ctinfo.connectedAccountId
        const accInfo = global.SecureState.accounts[Network.current][signerId]
        if (!accInfo) throw Error(`account ${signerId} NOT FOUND on wallet`)
        if (!accInfo.privateKey) throw Error(`account ${signerId} is read-only`)

        //load popup window for the user to approve
        const width = 600
        const height = 600
        chrome.windows.create({
          url: 'popups/approve/approve.html',
          type: 'popup',
          left: screen.width / 2 - width / 2,
          top: screen.height / 2 - height / 2,
          width: width,
          height: height,
          focused: true
        }, function (popupWindow) {
          if (popupWindow) {
            popupWindow.alwaysOnTop = true;
            msg.dest = "approve" //send msg to the approval popup
            msg.signerId = ctinfo.connectedAccountId;
            setTimeout(() => { chrome.runtime.sendMessage(msg) }, 100)
          }
        })
      }
      catch (ex) {
        resolvedMsg.err = ex.message;  //if error, also send msg to content-script->tab
        chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
      }
      break;

    default:
      console.error("unk msg.code", msg)
  }

}

//------------------------
//on extension installed
//------------------------
chrome.runtime.onInstalled.addListener(function (details) {

  console.log("onInstalled")

  if (details.reason == "install") {
    //call a function to handle a first install
  } else if (details.reason == "update") {
    //call a function to handle an update
  }
});

//------------------------
//on extension suspended
//------------------------
chrome.runtime.onSuspend.addListener(function () {
  global.lock()
  console.log("onSuspend.");
  chrome.browserAction.setBadgeText({ text: "" });
});


//------------------------
//----- expire auto-unlock
//------------------------
const UNLOCK_EXPIRED = "unlock-expired"
// function popupUnloading(unlockSHA/*:string*/, expireMs/*:number*/) {
//   console.log("BACK: popupUnloading", expireMs);
//   if (expireMs <= 0) {
//     chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
//   }
//   else {
//     chrome.alarms.create(UNLOCK_EXPIRED, { when: Date.now() + expireMs })
//     chrome.storage.local.set({ uk: unlockSHA, exp: Date.now() + expireMs })
//   }
// }

//------------------------
//expire alarm
//------------------------
chrome.alarms.onAlarm.addListener(
  function (alarm/*:any*/) {
    //console.log("chrome.alarms.onAlarm fired ", alarm);
    if (alarm.name == UNLOCK_EXPIRED) {
      global.lock()
      //chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
    }
  }
);


/**
 * Tries to connect to web page. (CPS style)
 * There are several steps involved
 * 1. inject proxy-content-script
 * 2. wait for injected-proxy to open the contenScriptPort
 * 3. send "connect" 
 * 4. check response from the page
 */
/*+
type CPSDATA=
  {accountId:string,network:string, activeTabId:number,
        url:string|undefined, ctinfo:ConnectedTabInfo,
        resolve:Function, reject:Function
  }
+*/
function connectToWebPage(accountId/*:string*/, network/*:string*/)/*: Promise<any>*/ {
  console.log("connectToWebPage start")

  return new Promise((resolve, reject) => {

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

      const activeTabId = tabs[0].id || -1;
      if (!_connectedTabs[activeTabId]) _connectedTabs[activeTabId] = {};

      const cpsData/*:CPSDATA*/ = {
        accountId: accountId,
        network: network,
        activeTabId: activeTabId,
        url: tabs[0].url,
        ctinfo: _connectedTabs[activeTabId],
        resolve: resolve,
        reject: reject
      }
      console.log("activeTabId", cpsData)
      cpsData.ctinfo = _connectedTabs[cpsData.activeTabId]
      cpsData.ctinfo.aceptedConnection = false; //we're connecting another
      cpsData.ctinfo.connectedResponse = {};

      //check if it responds
      try {
        chrome.tabs.sendMessage(cpsData.activeTabId, { code: "ping" }, function (response) {
          if (!response) {
            //not responding, set injected status
            cpsData.ctinfo.injected = false;
            console.error(chrome.runtime.lastError);
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
function continueCWP_2(cpsData/*:CPSDATA*/) {
  if (cpsData.ctinfo.injected) {
    //if responded, it was injected, continue
    return continueCWP_3(cpsData);
  }
  //not injected yet. Inject/execute contentScript on activeTab
  //contentScript replies with a chrome.runtime.sendmessage 
  //it also listens to page messages and relays via chrome.runtime.sendmessage 
  //basically contentScript.js acts as a proxy to pass messages from ext<->tab
  console.log("injecting")
  try {
    chrome.tabs.executeScript({ file: 'background/contentScript.js' },
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
function continueCWP_3(cpsData/*:CPSDATA*/) {
  console.log("chrome.tabs.sendMessage to", cpsData.activeTabId, cpsData.url)
  //send connect order via content script. a response will be received later
  chrome.tabs.sendMessage(cpsData.activeTabId, { dest: "page", code: "connect", data: { accountId: cpsData.accountId, network: cpsData.network } })
  //wait 250 for response
  setTimeout(() => {
    if (cpsData.ctinfo.aceptedConnection) { //page responded with connection info
      cpsData.ctinfo.connectedAccountId = cpsData.accountId //register connected acount
      return cpsData.resolve();
    }
    else {
      let errMsg = cpsData.url + " not responding / Not a Narwallets compatible NEAR web page"
      if (cpsData.ctinfo.connectedResponse) errMsg = cpsData.ctinfo.connectedResponse.err + " " + errMsg;
      return cpsData.reject(Error(errMsg))
    }
  }, 250);
}


// function OLDconnectToWebPage(accountId/*:string*/, network/*:string*/)/*: Promise<any>*/ {
//   console.log("connectToWebPage start")

//   return new Promise((resolve, reject) => {

//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

//       const activeTabId=tabs[0].id||-1
//       console.log("activeTabId",activeTabId)
//       if (!_connectedTabs[activeTabId]) _connectedTabs[activeTabId]={};
//       if (_connectedTabs[activeTabId].aceptedConnection){
//         //already connected, verify 
//         try {
//           chrome.tabs.sendMessage(activeTabId,{code: "ping"},function(response){
//             if (!response) {
//               _connectedTabs[activeTabId].injected=false;
//               _connectedTabs[activeTabId].aceptedConnection=false;
//               const errMsg="Try again. "+(chrome.runtime.lastError?chrome.runtime.lastError.message:"")
//               return reject(Error(errMsg))
//             }
//             else{
//               console.log("return reject(Error(already connected))")
//               return reject(Error("already connected"))
//             }
//           })
//           return;//verification is async
//         }
//         catch(ex){
//           return reject(ex)
//         }
//       }
//       if (!_connectedTabs[activeTabId].injected){
//         //not injected yet inject/execute contentScript on activeTab
//         //contentScript replies with a chrome.runtime.sendmessage 
//         //it also listens to page messages and relays via chrome.runtime.sendmessage 
//         //basically contentScript.js acts as a proxy to pass messages from ext<->tab
//         console.log("injecting")
//         chrome.tabs.executeScript({file: 'background/contentScript.js' },
//           function () {
//             if (chrome.runtime.lastError) {
//               console.error(JSON.stringify(chrome.runtime.lastError))
//               return reject(chrome.runtime.lastError)
//             }
//             else {
//               _connectedTabs[activeTabId].injected=true
//               console.log("chrome.tabs.sendMessage to", activeTabId,tabs[0].url)
//               //send via content script. a response will be received later
//               chrome.tabs.sendMessage(activeTabId,{ dest: "page", code: "connect", data: { accountId: accountId, network: network}})
//               //wait 250 for response
//               setTimeout(() => {
//                 if (_connectedTabs[activeTabId].aceptedConnection) { //page responded with connection info
//                   _connectedTabs[activeTabId].connectedAccountId //register connected acount
//                   return resolve();
//                 }
//                 else {
//                   let errMsg="Tab:"+activeTabId + " not responding / Not a Narwallets compatible NEAR web page"
//                   if (_connectedTabs[activeTabId].connectedResponse) errMsg= _connectedTabs[activeTabId].connectedResponse.err+" "+errMsg;
//                   return reject(Error(errMsg))
//                 }
//               }, 250);
//             }
//         })
//       }
//       else {
//         //it was injected already
//         //verify
//         chrome.tabs.sendMessage(activeTabId,{code: "ping"},function(response){
//           if (!response) {
//             _connectedTabs[activeTabId].injected=false;
//             return reject(chrome.runtime.lastError||Error("page not responding. Try again"))
//           }
//           else {
//             //send via content script. a response will be received later
//             console.log("chrome.tabs.sendMessage to", activeTabId,tabs[0].url)
//             chrome.tabs.sendMessage(activeTabId,{ dest: "page", code: "connect", data: { accountId: accountId, network: network}})
//             //wait 250 for response
//             setTimeout(() => {
//               if (_connectedTabs[activeTabId].aceptedConnection) { //page responded with connection info
//                 return resolve();
//               }
//               else {
//                 let errMsg="Tab:"+activeTabId + " not responding / Not a Narwallets compatible NEAR web page"
//                 if (_connectedTabs[activeTabId].connectedResponse) errMsg= _connectedTabs[activeTabId].connectedResponse.err+" "+errMsg;
//                 return reject(Error(errMsg))
//               }
//             }, 250);
//           }
//         })
//       }
//     })
//   })
// }


/*+
type ConnectedTabInfo = {
    injected?:boolean;
    aceptedConnection?:boolean;
    connectedAccountId?:string;
    connectedResponse?:any;
}
+*/

let _connectedTabs/*:Record<number,ConnectedTabInfo>*/ = {};

function disconnectFromWebPage()/*:Promise<any>*/ {
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

function isConnected()/*:Promise<boolean>*/ {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true },
      function (tabs) {
        const activeTabId = tabs[0].id || -1
        return resolve(_connectedTabs[activeTabId] && _connectedTabs[activeTabId].aceptedConnection)
      })
  })
}

async function onLoad() {
  console.log("background.js onLoad", new Date())
  await recoverOptions()
  await global.recoverState()
  //console.log(global.State)
  if (!global.State.dataVersion) {
    global.clearState();
  }
  const nw = await localStorageGet("backgroundNetwork");
  if (nw) Network.setCurrent(nw);
}

document.addEventListener('DOMContentLoaded', onLoad);
