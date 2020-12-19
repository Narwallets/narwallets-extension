import * as d from "../../util/document.js"
import * as c from "../../util/conversions.js"
import { BatchTransaction, BatchAction, FunctionCall, Transfer } from "../../api/batch-transaction.js"
import { askBackground } from "../../api/askBackground.js"

let responseSent=false;

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

async function approveOkClicked() {
  d.showWait()
  try {
    //ask backgroun to apply transaction
    initialMsg.dest = "ext";
    resolvedMsg.data = await askBackground(initialMsg)
    //response goes to initiating tab/page, another 5-min wating spinner is there
    chrome.tabs.sendMessage(initialMsg.tabId, resolvedMsg) //send resolution to original asking tab/page
    responseSent=true
    setTimeout(() => { window.close() }, 100);
  }
  catch (ex) {
    d.showErr(ex.message) //some error
    //the user can retry or cancel the approval
  }
  finally{
    d.hideWait()
  }
}

function respondRejected(){
  resolvedMsg.err = "User rejected the transaction";
  chrome.tabs.sendMessage(initialMsg.tabId, resolvedMsg) //resolve-reject request
  responseSent=true
}

function cancelOkClicked() {
  respondRejected();
  setTimeout(() => { window.close() }, 200);
}

window.addEventListener('beforeunload', function(event) {
  if (!responseSent) respondRejected();
});
      

type TxInfo = {
      action:string;
      attachedNear: string;
}


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


var initialMsg:any;
var resolvedMsg:any;

function humanReadableValue(value:any){
  if (typeof value=="string"){
    if (/\d{20}/.test(value)){
      //at least 20 digits. we assume YOCTOS
      return c.toStringDec(c.yton(value))+"N"
    }
    else {
      return value;
    }
  }
  else {
    return value.ToString();
  }
}

function humanReadableCallArgs(args:any):string{
  let result="{ "
  let count=0
  for(let key in args){
    if (count>0) result = result+", ";
    result = result+key+":"
    let value = args[key]
    if (typeof value=="object" && !(value instanceof Date)){
      result = result+humanReadableCallArgs(value); //recurse
    }
    else {
      result = result+humanReadableValue(value)
    }
    count++;
  }
  result=result+" }"
  if (result=="{  }") return ""
  return result
}

// ---------------------
function displayTx(msg:TxMsg) {

  initialMsg = msg;
  resolvedMsg = { dest: "page", code: "request-resolved", tabId:initialMsg.tabId, requestId:initialMsg.requestId }

  try {
    d.byId("net-name").innerText = msg.network || ""
    d.byId("signer-id").innerText = msg.signerId || ""
    d.byId("web-page").innerText = msg.url
    d.byId("receiver").innerText = msg.tx.receiver

    d.clearContainer("list")

    for (let item of msg.tx.items) {
      let toAdd:TxInfo = {
        action: item.action,
        attachedNear: (item.attachedNear ? `with <span class="near">${c.toStringDec(item.attachedNear)}</span> attached NEAR` : "")
      }
      //explain action
      switch (item.action) {
        case "call":
          const f = item as FunctionCall;
          toAdd.action = `call ${f.method}(${humanReadableCallArgs(f.args)})`;
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

