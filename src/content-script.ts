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
      console.log("content-script: response is ", response)
      if (response && response.action === "resend") {
        // the background service worker opened a popup for approval, 
        // and now requires the message to be resent, so the approval popup can process it
        setTimeout( () => {
          const resendAs = Object.assign(msg,{dest:response.to})
          console.log("content-script: re-send as ", resendAs)
          // resend, now to approval popup
          chrome.runtime.sendMessage(resendAs, function (response) {
            // Send new response to wallet-selector on callback
            postBack(msg, response);
          })
        },400)
      }
      else {
        // immediate response:
        // Send response to wallet-selector on callback
        postBack(msg, response);
      }
    });
  }
});

function postBack(originalMsg: any, response: any) {
  // copy id & other data from original msg
  let postBack = Object.assign({}, originalMsg);
  // add type:nw, dest:page & result:response
  Object.assign(postBack, {
    type: "nw",
    dest: "page",
    result: response
  });
  console.log("Posting message for page", postBack)
  window.postMessage(postBack);
}