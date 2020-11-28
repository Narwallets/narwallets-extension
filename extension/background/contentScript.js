//console.log("content-script executing")

//connect a port to this extension's background.js
var port = chrome.runtime.connect();
//--------------------------------------
//events from background.js
// -> resend to page as window.postMessage
//--------------------------------------
port.onMessage.addListener(function(msg) {
    console.log("@contentScript received on port: " + JSON.stringify(msg));
    window.postMessage(msg,"*");
  });

//--------------------------------
//listen to messages from the web-page
//the content script and the web page only share the DOM. They don't share globalThis
//the only way to communicate is trhu window.postMessage
// or by a DOM hidden elelemet & custom event https://developer.chrome.com/extensions/content_scripts#host-page-communication
window.addEventListener("message", 
    function(event) {
        // We only accept messages from ourselves (the DApp/web app)
        if (event.source != window) return;
        if (event.data.dest=="ext") {
            console.log("Content script received msg to ext: ", event.data);
            //add origin
            event.data
            //send to background.js via port
            try {
                port.postMessage(event.data)
            }
            catch(ex){
                //maybe disconnected
                console.error(ex)
                if (event.data.requestId){
                    window.postMessage({dest:"page",code:"request-resolved",requestId:event.data.requestId,err:ex.message},"*")
                }
                //disconnect web-page
                window.postMessage({dest:"page",code:"disconnect"},"*")
            }
        }
    }, 
    false);

