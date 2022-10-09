// Received message from wallet selector
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source != window) {
    return;
  }
  const msg = event.data
  if (msg.type && (msg.type == "nw") && msg.dest == "ext") {
    // Sending message to narwallets extension background service worker 
    chrome.runtime.sendMessage(msg, function (response) {
      //console.log("content-script: response is ", response)
      if (response && response.action === "resend") {
        // the background service worker opened a popup for approval, 
        // and now requires the message to be resent, so the approval popup can process it
        const resendAs = Object.assign(msg,{dest:response.to})
        //console.log("content-script: re-send as ", resendAs)
        // resend, now to approval popup
        waitAndSendWithRetry(100,20,msg)
      }
      else {
        // immediate response:
        if (!response) {
          // failed to send, probably runtime.lastError: The message port closed before a response was received
          const response = chrome.runtime.lastError
        }
        // post response to wallet-selector 
        postBack(msg, response);
      }
    });
  }
});

function waitAndSendWithRetry(waitMs:number, retries:number, msg:Record<string,any>) {
  return setTimeout(()=>{
    chrome.runtime.sendMessage(msg, 
      function (response) {
        if (response) {
          // Send new response to wallet-selector on callback
          postBack(msg, response);
        }
        else {
          // failed to send, probably runtime.lastError: The message port closed before a response was received
          // meaning the popup is still opening, so we wait and retry
          const lastErr = chrome.runtime.lastError
          if (retries<=0) {
            throw lastErr
          }
          // retry
          waitAndSendWithRetry(waitMs, retries-1, msg)
        }
      }
    )}
  , waitMs)
}


function postBack(originalMsg: any, response: any) {
  // copy id & other data from original msg
  let postBack = Object.assign({}, originalMsg);
  // add type:nw, dest:page & result:response
  Object.assign(postBack, {
    type: "nw",
    dest: "page",
    result: response
  });
  //console.log("Posting message for page", postBack)
  window.postMessage(postBack);
}