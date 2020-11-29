import * as d from "../../util/document.js"
import * as c from "../../util/conversions.js"
import { BatchTransaction, BatchAction, FunctionCall, Transfer } from "../../api/batch-transaction.js"
import { askBackground } from "../../api/askBackground.js"

//----------------------------------------
//-- LISTEN to "messages" from background.js
//----------------------------------------
console.log("approve.js chrome.runtime.onMessage.addListener")
chrome.runtime.onMessage.addListener(
  function (msg) {
    if (msg.dest != "approve") return;
    displayTx(msg)
  }
)

function approveOkClicked() {
  d.showWait()
  try {
    //ask backgroun to apply transaction
    initialMsg.dest = "ext";
    chrome.runtime.sendMessage(initialMsg, function (response) {
      if (!response) {
        resolvedMsg.err = "background page unresponsive";
      }
      else if (response.err) {
        resolvedMsg.err = response.err;
      }
      else {
        resolvedMsg.data = response.data;
      }
      //response goes to initiating tab/page, another 5-min wating spinner is there
      chrome.tabs.sendMessage(initialMsg.tabId, resolvedMsg) //send resolution to original asking tab/page
      setTimeout(() => { window.close() }, 200);
    })
  }
  catch (ex) {
    d.showErr(ex.message)
  }
  finally{
    d.hideWait()
  }
}

function cancelOkClicked() {

  resolvedMsg.err = "User rejected the transaction";
  chrome.tabs.sendMessage(initialMsg.tabId, resolvedMsg) //resolve-reject request

  setTimeout(() => { window.close() }, 200);
}

/*+
type TxInfo = {
      action:string;
      attachedNear: string;
}
+*/
/*+
type TxMsg = {
      url: string;
      network: string|undefined;
      signerId:string;
      tx:BatchTransaction;
}
type ResolvedMsg={
    dest:"page";
    code:"request-resolved";
    tabId:number;
    requestId:number;
    err?:any;
    data?:any
}
+*/

var initialMsg/*:any*/;
var resolvedMsg/*:any*/;

// ---------------------
function displayTx(msg/*:TxMsg*/) {

  initialMsg = msg;
  resolvedMsg = { dest: "page", code: "request-resolved", tabId:initialMsg.tabId, requestId:initialMsg.requestId }

  try {

    d.byId("net-name").innerText = msg.network || ""
    d.byId("signer-id").innerText = msg.signerId || ""
    d.byId("web-page").innerText = msg.url
    d.byId("receiver").innerText = msg.tx.receiver

    d.clearContainer("list")

    for (let item of msg.tx.items) {
      let toAdd/*:TxInfo*/ = {
        action: item.action,
        attachedNear: (item.attachedNear ? `with <span class="near">${c.toStringDec(item.attachedNear)}</span> attached NEAR` : "")
      }
      //explain action
      switch (item.action) {
        case "call":
          const f = item /*+as FunctionCall+*/;
          const argsString = JSON.stringify(f.args);
          toAdd.action = `call ${f.method}(${argsString == "{}" ? "" : argsString})`;
          break;

        case "transfer":
          toAdd.action = ""
          toAdd.attachedNear = `transfer <span class="near">${c.toStringDec(item.attachedNear)}</span> NEAR`
          break;

        default:
          toAdd.action = JSON.stringify(item);
      }
      d.appendTemplateLI("list", "item-template", toAdd)
    }

    d.onClickId("approve-ok", approveOkClicked)
    d.onClickId("approve-cancel", cancelOkClicked)


  }
  catch (ex) {
    d.showErr(ex.message)
  }
  finally {
    d.hideWait()
  }
}
