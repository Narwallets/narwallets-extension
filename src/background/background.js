
chrome.runtime.onInstalled.addListener(function (details) {

  console.log("onInstalled")

  if (details.reason == "install") {
    //call a function to handle a first install
  } else if (details.reason == "update") {
    //call a function to handle an update
  }
});

chrome.runtime.onSuspend.addListener(function () {
  console.log("onSuspend.");
  chrome.browserAction.setBadgeText({ text: "" });
});


//----- expire auto-unlock
const UNLOCK_EXPIRED = "unlock-expired"
function popupUnloading(unlockSHA/*:string*/, expireMs/*:number*/){
  //console.log("BACK: popupUnloading", expireMs);
  if (expireMs<=0){
      chrome.storage.local.remove("uk") //clear unlock sha
  }
  else {
    chrome.alarms.create(UNLOCK_EXPIRED, { when: Date.now() + expireMs })
    chrome.storage.local.set({ uk: unlockSHA })
  }
}

chrome.alarms.onAlarm.addListener(
  function (alarm/*:any*/) {
    //console.log("chrome.alarms.onAlarm fired ", alarm);
    if (alarm.name == UNLOCK_EXPIRED) {
      chrome.storage.local.remove("uk") //clear unlock sha
    }
  }
);
  
// chrome.extension.onConnect.addListener(function(port) {
//   console.log("Connected .....");
//   port.onMessage.addListener(function(msg) {
//        console.log("backgound.js: message recieved" + msg);
//        port.postMessage("Hi Popup.js");
//   });
// })

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

// console.log("back: chrome.runtime.onMessage.addListener");
// chrome.runtime.onMessage.addListener(
//   function (request, sender, sendResponse) {
//     console.log("chrome.runtime.onMessage fired", request, sender);
//     if (request.kind == "xxxx") {
//     }
//   });


