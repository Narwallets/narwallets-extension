import * as d from "../../util/document.js"
import * as c from "../../util/conversions.js"

/*+
type TxInfo = {
      action:string;
      args: string;
      attachedNear: string;
}
+*/

//----------------------------------------
//-- LISTEN to "messages" from background.js
//----------------------------------------
console.log("approve.js window.addEventListener")
window.addEventListener("message", 
    function(event) {
        if (event.source != window) return; //only internal messages 
        if (event.data.dest!="approve") return;
        displayTx(event.data.tx)
    }
    , false)
;

// ---------------------
function displayTx(tx/*:any*/) {

  //@ts-ignore
  globalThis.tx = tx;

  try {

    const list/*:TxInfo[]*/ = []
    for (let item of tx) {
      let toAdd/*:TxInfo*/ = {
        action: item.action,
        args:"",
        attachedNear: c.toStringDec(item.attahedNear)
      }
      switch (item.action) {
        case "call":
            toAdd.args = `${item.contract}.${item.method}(${JSON.stringify(item.args)})`;
          break;

        case "transfer":
          toAdd.args = `to ${item.receiver}`;
          break;

        default:
          args: JSON.stringify(item);
      }
      list.push(toAdd);
    }

    d.populateUL("list", "item-template", list)

  }
  catch (ex) {
    d.showErr(ex.message)
  }
  finally {
    d.hideWait()
  }
}

// ---------------------
// DOM Loaded - START
// ---------------------
async function init() {
  try {

    //rpc.addHeader("mode","no-cors")

  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

document.addEventListener('DOMContentLoaded', init);

