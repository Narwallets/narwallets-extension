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
      if (!response) {
        // failed to send, probably runtime.lastError: The message port closed before a response was received
        const lastErr = chrome.runtime.lastError || { message: "response is empty" }
        const response = { err: lastErr.message }
      }
      // post response to wallet-selector 
      // note: event.data/msg is not modifiable
      let postBackMsg = Object.assign({}, msg)
      postBackMsg.dest = "page";
      postBackMsg.result = response
      console.log("content-script: response is ", postBackMsg)
      window.postMessage(postBackMsg);
    });
  }
});
