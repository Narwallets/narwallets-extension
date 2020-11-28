import * as d from "../../util/document.js"
import * as c from "../../util/conversions.js"
import {BatchTransaction, BatchAction,FunctionCall, Transfer} from "../../api/batch-transaction.js"
import { functionCall } from "../../api/transaction.js"

//----------------------------------------
//-- LISTEN to "messages" from background.js
//----------------------------------------
console.log("approve.js chrome.runtime.onMessage.addListener")
chrome.runtime.onMessage.addListener(
    function(msg) {
        if (msg.dest!="approve") return;
        d.byId("web-page").innerText=JSON.stringify(msg)
        displayTx(msg)
    }
)

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
      tx:BatchTransaction;
}
+*/

// ---------------------
function displayTx(msg/*:TxMsg*/) {

  try {

    d.byId("net-name").innerText=msg.network||""
    d.byId("web-page").innerText=msg.url
    d.byId("receiver").innerText=msg.tx.receiver

    const list/*:TxInfo[]*/ = []
    for (let item of msg.tx.items) {
      let toAdd/*:TxInfo*/ = {
        action: item.action,
        attachedNear: (item.attachedNear? `with ${c.toStringDec(item.attachedNear)} attached NEAR`:"")
      }
      //explain action
      switch (item.action) {
        case "call":
            const f=item /*+as FunctionCall+*/;
            const argsString =JSON.stringify(f.args);
            toAdd.action = `call ${f.method}(${argsString=="{}"?"":argsString})`;
          break;

        case "transfer":
          toAdd.action=""
          toAdd.attachedNear = `transfer ${c.toStringDec(item.attachedNear)} NEAR`
          break;

        default:
          toAdd.action = JSON.stringify(item);
      }
      d.appendTemplateLI("list", "item-template", toAdd)
    }
  }
  catch (ex) {
    d.showErr(ex.message)
  }
  finally {
    d.hideWait()
  }
}
