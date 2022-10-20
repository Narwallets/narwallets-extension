const ResponseType = {
  // Resend is used for communications inside the app.
  RESEND: "resend",
  // Reply is used for the moment the request has already been finished and to reply the calling app.
  REPLY: "reply"
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MAX_COMMUNICATIONS = 2

// Received message from wallet selector
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source != window) {
    return;
  }
  const msg = event.data
  console.log("Message received: ", msg)
  if (msg && msg.type && (msg.type == "nw") && msg.dest == "ext") {
    // Sending message to narwallets extension background service worker 
    chrome.runtime.sendMessage(msg, function (response) {
      handleResponse(response, msg);
      return true
    });
  }
});

async function handleResponse(response: any, msg: any): Promise<void> {
  let postBackMsg = Object.assign({}, msg)
  try {
    console.log("Response received", response)
    if (!response) {
      // failed to send, probably runtime.lastError: The message port closed before a response was received
      throw new Error("Response is empty")
    }
    let communicationsLeft = MAX_COMMUNICATIONS
    let waitingForResponse2 = false
    while(response && response.code != msg.code && communicationsLeft > 0) {
      if(waitingForResponse2) {
        await sleep(200)
      } else {
        if(response.err) break
        waitingForResponse2 = true
        communicationsLeft--;
        console.log("Response received from second message", response , communicationsLeft)
        console.log("Resending message", msg)
        // Without the following setTimeout it opens two popups. DON'T YOU DARE REMOVE IT.
        setTimeout(() => {
          chrome.runtime.sendMessage(msg, function (response2) {
            response = response2
            waitingForResponse2 = false
          })
        }, 500)
        
      } 
    }
    if(!response) {
      throw new Error("Empty response")
    }
    if(response.err) {
      throw new Error(response.err)
    }
    if(response.code != msg.code) {
      throw new Error(`Unable to complete process in ${MAX_COMMUNICATIONS} calls. Consider setting 'code' property on response using WALLET_SELECTOR_CODES`)
    }
    postBackMsg.result = response
    // post response to wallet-selector 
    // note: event.data/msg is not modifiable
    
  } catch (err) {
    const lastErrMessage = chrome.runtime.lastError?.message || err.message
    postBackMsg.result = { err: lastErrMessage } 
  } finally {
    postBackMsg.dest = "page"
    console.log("content-script: response is ", postBackMsg)
    window.postMessage(postBackMsg);
  }
}
