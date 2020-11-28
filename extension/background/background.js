import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import { options } from "../data/options.js"
import * as Network from "../data/Network.js"
import * as nearAccounts from "../util/near-accounts.js"

import * as near from "../api/near-rpc.js"
import { setRpcUrl } from "../api/utils/json-rpc.js"
import { localStorageSet } from "../data/util.js"

/*HAY QUE HACER QUE BACKGROUND JS HAGA TODO LO RELACIONADO CON COMUNICARSE CON near
Y debe saber CUAL ES LA RED SELECCIONADA, ETC, ETC
-POPUP DEBE USAR BACKGROUND (askBackground) PARA TODO
*/

//---------------------------------------------------
//listen to msgs from content_script->via port
//---------------------------------------------------
let contentScriptPort/*:chrome.runtime.Port|undefined*/ = undefined;
chrome.runtime.onConnect.addListener(function (port) {
  console.log("contentScriptPort onConnect .....");
  contentScriptPort = port;
  //on-message
  port.onMessage.addListener(messageFromWebPage)
  //on-disconnect (page unloaded?)
  port.onDisconnect.addListener(function (port) {
    _webPageAcceptedConnection = false;
    contentScriptPort = undefined;
  });
})

//---------------------------------------------------
//process msgs from web-page->content-script->port
//---------------------------------------------------
async function messageFromWebPage(msg/*:any*/) {

  if (msg.dest != "ext") return;

  console.log("ext message received from web-page", msg);

  switch (msg.code) {

    case "connected":
      connectedWebPageInfo = msg;
      _webPageAcceptedConnection = (!msg.err);
      break;

    case "view":
      //view-call request
      let resultErrData = { dest: "page", code: "request-resolved", requestId: msg.requestId, err: undefined, data: undefined }
      try {
        resultErrData.data = await near.view(msg.contract, msg.method, msg.args);
      }
      catch (ex) {
        resultErrData.err = ex.message;
      }
      if (contentScriptPort) { contentScriptPort.postMessage(resultErrData) }
      break;

    case "apply":
      //load popup window for the user to approve
      const width=600
      const height=600
      chrome.windows.create({ 
        url: 'popups/approve/approve.html',
        type: 'popup',
        left: screen.width / 2 - width / 2,
        top: screen.height / 2 - height / 2,
        width: width,
        height: height,
        focused:true 
        },function(popupWindow){
            if (popupWindow) {
              popupWindow.alwaysOnTop = true;
              msg.dest="approve"
              setTimeout(()=>{chrome.runtime.sendMessage(msg)}, 100)
            }
        })
      break;

    default:
      console.error("unk msg.code")
  }

}


//----------------------------------------
//-- LISTEN to "chrome.runtime.message" from own POPUPs or content script
//-- msg path is popup->here->action->sendResponse(err,data)
//----------------------------------------
chrome.runtime.onMessage.addListener(runtimeMessageHandler)
function runtimeMessageHandler(msg/*:any*/, sender/*:chrome.runtime.MessageSender*/, sendResponse/*:Function*/) {
  const fromPage = sender.tab != undefined && sender.tab != null;
  console.log("runtimeMessage received " + (fromPage ? "FROM PAGE " : "from popup ") + JSON.stringify(msg));
  if (fromPage) {
    console.error("ONLY runtime.messages from own popups accepted")
    return;
  }
  if (msg.dest != "ext") {
    sendResponse({ err: "msg.dest must be 'ext'" })
    return;
  }
  getActionPromise(msg)
    .then((data) => { sendResponse({ data: data }) })
    .catch((ex) => { sendResponse({ err: ex.message }) })
  return true;//meaning sendResponse will be called async 
}
//create a promise to resolev action requested by popup
function getActionPromise(msg/*:Record<string,any>*/)/*:Promise<any>*/ {

  if (msg.code == "set-network") {
    try {
      Network.setCurrent(msg.network);
      return Promise.resolve();
    }
    catch (ex) {
      return Promise.reject(ex)
    }
  }
  else if (msg.code == "connect") {
    connectedWebPageInfo = msg;
    return connectToWebPage(msg.accountId, msg.network);
  }
  else if (msg.code == "disconnect") {
    disconnectFromWebPage()
    return Promise.resolve();
  }
  else if (msg.code == "isConnected") {
    return Promise.resolve(_webPageAcceptedConnection);
  }
  else if (msg.code == "view") {
    //view-call request
    return near.view(msg.contract, msg.method, msg.args);
  }
  else if (msg.code == "apply") {
    //apply transaction request
    //from Popup
    //tx.apply request
    if (msg.contract && msg.method && msg.accountId) {
      const accInfo = global.SecureState.accounts[Network.current][msg.accountId]
      if (!accInfo.privateKey) return Promise.reject(Error(`account ${msg.accountId} is read-only`))
      return near.call_method(msg.contract, msg.method, msg.args, msg.accountId, accInfo.privateKey, near.ONE_TGAS.muln(msg.Tgas || 25))
    }
  }
  return Promise.reject(Error(`invalid msg.code ${JSON.stringify(msg)}`))
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
  console.log("onSuspend.");
  chrome.browserAction.setBadgeText({ text: "" });
});


//------------------------
//----- expire auto-unlock
//------------------------
const UNLOCK_EXPIRED = "unlock-expired"
function popupUnloading(unlockSHA/*:string*/, expireMs/*:number*/) {
  console.log("BACK: popupUnloading", expireMs);
  if (expireMs <= 0) {
    chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
  }
  else {
    chrome.alarms.create(UNLOCK_EXPIRED, { when: Date.now() + expireMs })
    chrome.storage.local.set({ uk: unlockSHA, exp: Date.now() + expireMs })
  }
}

//------------------------
//expire alarm
//------------------------
chrome.alarms.onAlarm.addListener(
  function (alarm/*:any*/) {
    //console.log("chrome.alarms.onAlarm fired ", alarm);
    if (alarm.name == UNLOCK_EXPIRED) {
      chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
    }
  }
);

// function backgroundFunction(msg /*:string*/) {
//   console.log("backgound funtion executed, meg:" + msg);
//   return "I'm backman";
// }

// function hold(key /*:string*/) {
//   //(console.log("hold:", key);
//   chrome.storage.local.set({ uk: key })
// }

// function getHoldKey(callback/*:any*/) {
//   chrome.storage.local.get("uk", (obj) => {
//     callback(obj.uk)
//   });
// }

//-------------------------------------------
// listen to runtime messages from the popup 
//-------------------------------------------
// chrome.runtime.onMessage.addListener(
//   function(message, callback) {
//     if (message == "runContentScript"){
//       //execute contentScript on activeTab
//       //contentScript opens a port for receivin messages from bakcground.js and redirecting to the page
//       //it also listens to page messages and sends them thru the port
//       //basically acts as a proxy to pass messages from background<->activeTab
//       chrome.tabs.executeScript({file: 'background/contentScript.js'},function(){
//         if (chrome.runtime.lastError) console.error(JSON.stringify(chrome.runtime.lastError))
//       })
//       // chrome.tabs.executeScript({code: 'console.log("test")'},function(){
//       //   if (chrome.runtime.lastError) console.error(JSON.stringify(chrome.runtime.lastError))
//       // })
//     }
//     else if (message.dest=="page"){ 
//       if (connectedPort) {
//         connectedPort.postMessage(message);
//       }
//       else{
//         console.error("can't send message. port Not connected")
//         console.error(message)
//       }
//     }

//   });


/**
 * Tries to connect to web page.
 * There are several steps involved
 * 1. inject proxy-content-script
 * 2. wait for injected-proxy to open the contenScriptPort
 * 3. send "connect" 
 * 4. check response from the page
 */
function connectToWebPage(accountId/*:string*/, network/*:string*/)/*: Promise<any>*/ {
  return new Promise((resolve, reject) => {
    if (_webPageAcceptedConnection) return reject(Error("already connected"))
    _webPageAcceptedConnection = false;
    if (contentScriptPort) {
      //contentScript already injected - WARN: DO NO inject another because its NOT REPLACED, just added in a new VM
      //if you keep calling chrome.tabs.executeScript you end up with 4 or 5 running contentScripts
      //Send to the page connection info
      contentScriptPort.postMessage({ dest: "page", code: "connect", data: { accountId: accountId, network: network } })
      setTimeout(() => {
        if (_webPageAcceptedConnection) { //page connected and responded with connection info
          return resolve();
        }
        else {
          return reject(Error(connectedWebPageInfo.err || "Web page not responding / Not a Narwallets compatible NEAR web app (2)"))
        }
      }, 250);
    }
    else {
      //execute contentScript on activeTab
      //contentScript opens a port for receiving messages from bakcground.js and redirecting to the page
      //it also listens to page messages and sends them thru the port
      //basically contentScript.js acts as a proxy to pass messages from ext<->activeTab
      chrome.tabs.executeScript({ file: 'background/contentScript.js' },
        function () {
          if (chrome.runtime.lastError) {
            console.error(JSON.stringify(chrome.runtime.lastError))
            return reject(chrome.runtime.lastError)
          }
          else {
            if (!contentScriptPort) { //contentScript didn't open port back
              return reject(Error("Web page not responding / Not a Narwallets compatible NEAR web app (1)"))
            }
            //Send connection info to the page
            contentScriptPort.postMessage({ dest: "page", code: "connect", data: { accountId: accountId, network: network } })
            setTimeout(() => {
              if (_webPageAcceptedConnection) { //page connected and responded with connection info
                return resolve();
              }
              else {
                return reject(Error(connectedWebPageInfo.err || "Web page not responding / Not a Narwallets compatible NEAR web app (2)"))
              }
            }, 250);
          }
      })
    }
  })
}

function OLDconnectToWebPage(accountId/*:string*/, network/*:string*/)/*: Promise<any>*/ {
  return new Promise((resolve, reject) => {
    _webPageAcceptedConnection = false;
    //execute contentScript on activeTab
    //contentScript opens a port for receiving messages from bakcground.js and redirecting to the page
    //it also listens to page messages and sends them thru the port
    //basically contentScript.js acts as a proxy to pass messages from ext<->activeTab
    chrome.tabs.executeScript({ file: 'background/contentScript.js' },
      function () {
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError))
          return reject(chrome.runtime.lastError)
        }
        else {
          if (!contentScriptPort) { //contentScript didn't open port back
            return reject(Error("Web page not responding / Not a Narwallets compatible NEAR web app (1)"))
          }
          //Send to the page connection info
          contentScriptPort.postMessage({ dest: "page", code: "connect", data: { accountId: accountId, network: network } })
          setTimeout(() => {
            if (_webPageAcceptedConnection) { //page connected and responded with connection info
              return resolve();
            }
            else {
              return reject(Error(connectedWebPageInfo.err || "Web page not responding / Not a Narwallets compatible NEAR web app (2)"))
            }
          }, 250);
        }
      })
  })
}



let _webPageAcceptedConnection/*:boolean*/ = false;
let connectedWebPageInfo/*:any*/;

/*+
type RequestResult ={
  err?:string;
  data?:any;
}
+*/

function disconnectFromWebPage() {
  _webPageAcceptedConnection = false;
  if (!contentScriptPort) return;
  contentScriptPort.postMessage({ dest: "page", code: "disconnect" })
  contentScriptPort.disconnect();
  contentScriptPort = undefined;
  return;
}

function isConnected() { return _webPageAcceptedConnection }

console.log("background.js loaded")
//https://developer.chrome.com/extensions/background_pages
// chrome.runtime.onMessage.addListener(function(message, callback) {
//   if (message.data == “setAlarm”) {
//     chrome.alarms.create({delayInMinutes: 5})
//   } else if (message.data == “runLogic”) {
//     chrome.tabs.executeScript({file: 'logic.js'});
//   } else if (message.data == “changeColor”) {
//     chrome.tabs.executeScript(
//         {code: 'document.body.style.backgroundColor="orange"'});
//   };
// });
