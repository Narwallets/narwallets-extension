chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({color: '#3aa757'}, function() {
    console.log("The color is green.");
  });
});

// chrome.extension.onConnect.addListener(function(port) {
//   console.log("Connected .....");
//   port.onMessage.addListener(function(msg) {
//        console.log("backgound.js: message recieved" + msg);
//        port.postMessage("Hi Popup.js");
//   });
// })

function backgroundFunction(msg /*:string*/){ 
  console.log("backgound funtion executed, meg:" + msg);
  return "I'm backman";
}

