//
// THIS FILE MUST BE INDEPENDENT
// CAN NOT IMPORT OTHER FILES or declare functions to be used by other filed
//

const MAX_COMMUNICATIONS = 2

// Receive messages from wallet selector
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source != window) {
    return;
  }
  const msg = event.data
  // console.log("content-script, window.addEventListener(message), received: ", msg)
  if (msg && msg.type && (msg.type == "nw") && msg.dest == "ext") {
    /** pass the message to narwallets extension background service worker
     * using chrome.runtime.sendMessage.
    * When a message is sent with chrome.runtime.sendMessage it is received by the extension
    * chrome.runtime.onMessage.addListener( (msg: any, sender: chrome.runtime.MessageSender, sendResponse: SendResponseFunction) => {}
    *
    * chrome.runtime.sendMessage expects a boolean | undefined response from addListener.
    * The following is assumed, because the documentation is not all that clear:
    * If the response is undefined, it will consider no function received the called and will send the message again until some function returns true.
    * If the response is false, it will consider the message was received and doesn't need a response
    * If the response is true, it will consider the message was received and will wait a response called by sendResponse
    *   and received by the second parameter of sendMessage which is a function with one parameter that will be called response
     */
    // console.log("content-script, sending via chrome.runtime.sendMessage")
    chrome.runtime.sendMessage(msg, function (response) {

      /**
       * After receiving a message from an external end (normally, wallet-selector), and having sent that message once to the extension
       * we handle the extension response from here. This call will be triggered after calling a function created
       * on a chrome.runtime.onMessage.addListener, normally called sendResponse. This function is passed through
       * other functions, so in some files may have a different name, like approvalSendResponse
       * @param response The response sent by sendResponse. It requires to have a parameter `response.code` containing a code
       * from the constant WALLET_SELECTOR_CODES defined on background.ts. If response.code!==msg.code, it will consider it was not properly fulfilled yet
       * and will send the same msg to the extension for it to handle. If response.code===msg.code, the code will consider the
       * message was properly fulfilled and will reply to the external end. In this case, it is required to match what is expected
       * on the external end.
       * @param msg The message that was sent from the external end
       */
      let postBackMsg = Object.assign({}, msg)
      try {
        // console.log("content-script, response received via send-response-fn:", response)
        if (!response) {
          if (chrome.runtime.lastError) {
            console.error("content-script, chrome.runtime.lastError:", chrome.runtime.lastError.message);
            throw chrome.runtime.lastError
          }
          // failed to send, probably runtime.lastError: The message port closed before a response was received
          throw new Error("Response is empty")
        }
        if (response.err) {
          console.error("content-script, response.err!-null:", response.err)
          throw new Error(response.err)
        }

        // if (response.code != msg.code) {
        //   throw new Error("content-script, response.code != msg.code, " + response.code + "!=" + msg.code)
        // }

        postBackMsg.result = response

      }
      catch (err) {
        const lastErrMessage = chrome.runtime.lastError?.message || err.message
        postBackMsg.result = { err: lastErrMessage }
      }
      finally {
        postBackMsg.dest = "page"
        //console.log("Sending message", postBackMsg)
        /** window.postMessage:
        * When a message is sent with window.postMessage,
        * it is received by a window.addEventListener("message", (event) => {}) call
        * This call does not expect any response
         */
        // console.log("content-script, sending back via window.postMessage:", postBackMsg)
        window.postMessage(postBackMsg);
      }
    });
  }
});


; (function () {

  function inject() {
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL("dist/injected-script.js")
    script.type = "module"
    const g = (document.head || document.documentElement)
    g.appendChild(script);
  }

  inject()
})()
