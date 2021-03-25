//console.log("content-script executing")
//--------------------------------------
//events from background.js (sent via chrome.tabs.sendMessage)
// -> resend to page as window.postMessage
//--------------------------------------
chrome.runtime.onMessage.addListener(
    function(msg:any,sender,sendResponse){
        //console.log("@contentScript received runtime.onMessage",msg,"from",sender);
        if (msg.code=="ping"){
            sendResponse({code:"pong"})
            return;
        }
        if (msg.dest="page"){
            window.postMessage(msg,"*");    
        }
    });

//--------------------------------
//listen to messages from the web-page
//the content script and the web page only share the DOM. They don't share globalThis
//the only way to communicate is thru window.postMessage
// or by a DOM hidden element & custom event https://developer.chrome.com/extensions/content_scripts#host-page-communication
window.addEventListener("message", 
    function(event) {
        // We only accept messages from ourselves (the DApp/web app)
        if (event.source != window) return;
        if (event.data.dest=="ext") {
            //console.log("Content script received msg to ext: ", event.data);
            //send to background.js 
            try {
                chrome.runtime.sendMessage(event.data) //chrome.runtime.sendMessage includes origin(sender)
            }
            catch(ex){
                //maybe disconnected
                console.log(ex)
                if (event.data.requestId){
                    window.postMessage({dest:"page",code:"request-resolved",requestId:event.data.requestId,err:ex.message},"*")
                }
                //disconnect web-page
                window.postMessage({dest:"page",code:"disconnect"},"*")
            }
        }
    }, 
    false);

