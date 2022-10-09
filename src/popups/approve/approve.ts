// import * as c from "../../util/conversions.js"
import * as d from "../../util/document.js"
import { askBackground } from "../../askBackground.js"
import { removeDecZeroes, toStringDecMin, yton, ytonFull, ytonString } from "../../util/conversions.js";
//import { globalSendResponse } from "../../background/background.js"

type SendResponseFunction = (response: any) => void

let ThisApprovalSendResponse: SendResponseFunction
let ThisApprovalMsg: any

// Received message from background service
chrome.runtime.onMessage.addListener((msg: any, sender: chrome.runtime.MessageSender, sendResponse: SendResponseFunction) => {

  if (sender.id == chrome.runtime.id && msg.dest == "approve-popup") {
    try {
      ThisApprovalSendResponse = sendResponse
      ThisApprovalMsg = msg
      // show request origin
      if (sender.url) d.byId("web-page").innerText = sender.url.split(/[?#]/)[0]; // remove querystring and/or hash
      //d.byId("net-name").innerText = msg.network || ""
      // display instructions
      displayTx(msg)
      return true; // ack, it's for me, sendResponse will be called later
    }
    catch (err) {
      sendResponse({ err: err.message })
    }

  }
  // // We only accept messages from ourselves
  // if (event.source != window) {
  //   return;
  // }

  // if (event.data && event.data.dest == "approve-popup") {
  //   window.msg = event.data.msg
  //   window.sendResponse = event.data.sendResponse
  //   displayTx()
  // }
});

type TxInfo = {
  action: string;
  attached: string;
}
/*
{id: 7, src: 'ws', type: 'nw', code: 'sign-and-send-transaction', dest: 'page', …}
code: "sign-and-send-transaction"
dest: "page"
id: 7
src: "ws"
type: "nw"
params: 
   receiverId: "token.meta.pool.testnet"
   actions: Array(1) 0: 
    {methodName: 'ft_transfer_call', args: {…}, gas: '200000000000000', deposit: '1'}
*/
type Msg = {
  id: number;
  url: string;
  network: string | undefined;
  signerId: string;
  params: any,
  // tx?: BatchTransaction;
  // txs?: BatchTransaction[];
}
// type ResolvedMsg = {
//   dest: "page";
//   code: "request-resolved";
//   tabId: number;
//   requestId: number;
//   err?: any;
//   data?: any
// }

let responseSent = false;

//var initialMsg: TxMsg;
//var resolvedMsg: ResolvedMsg;

async function approveOkClicked() {
  d.showWait()
  // ask background to process the message, this time the origin is a popup from the extension, so it is trusted
  ThisApprovalMsg.dest = "ext"
  askBackground(ThisApprovalMsg)
    .then((data) => { ThisApprovalSendResponse({ data }) })
    .catch((err) => { ThisApprovalSendResponse({ err: err.message }) })
    .finally(() => { window.close() })
}

async function cancelOkClicked() {
  // respondRejected();
  ThisApprovalSendResponse({ err: "Rejected by user" })
  //const wasCalled = await askBackground({code:"callGlobalSendResponse", cancel: true})
  setTimeout(() => { window.close() }, 200);
}

window.addEventListener('beforeunload', function (event) {
  cancelOkClicked()
});


function humanReadableValue(value: Object): string {
  if (typeof value == "string") {
    if (/\d{20}/.test(value)) {
      //at least 20 digits. we assume YOCTOS
      return toStringDecMin(yton(value))
    }
    else {
      return `"${value}"`;
    }
  }
  else {
    return value.toString();
  }
}

function humanReadableCallArgs(args: Object): string {
  let result = "{ "
  let count = 0
  for (let key in args) {
    if (count > 0) result = result + ", ";
    result = result + key + ":"
    let value = (args as any)[key]
    if (typeof value == "object" && !(value instanceof Date)) {
      result = result + humanReadableCallArgs(value); //recurse
    }
    else {
      result = result + humanReadableValue(value)
    }
    count++;
  }
  result = result + " }"
  if (result == "{  }") return ""
  return result
}

// ---------------------
function displayTx(msg: Msg) {

  try {

    d.clearContainer("tx-list")

    if (msg.params.length) {
      // tx array
      displayMultipleTransactionParams(msg.params)
    } else {
      // single tx
      displaySingleTransactionParams(0, msg.params)
    }

    //only if it displayed ok, enable ok action
    d.onClickId("approve-ok", approveOkClicked)
    d.onClickId("approve-cancel", cancelOkClicked)
    // Add cancel on click
  }
  catch (ex) {
    d.showErr(ex.message)
    d.qs("#approve-ok").hide() //hide ok button
    console.error(ex)
  }

  //--- connect
  d.onClickId("approve-cancel", cancelOkClicked)
  // show face
  d.byId("approve-face").classList.remove("hidden")
}

function displaySingleTransactionParams(inx: number, params: any) {

  // signer and receiver
  const txContainerId = `tx_${inx}`
  const TEMPLATE1 = `
  <div class="tx" id="${txContainerId}">
    <div class="signer"><b>{signerId}</b> to execute</div>
    <div class="receiver">on <b>{receiverId}</b></div>
    <ul id="${txContainerId}_actions" class="list">
    </ul>
  </div>
  `;
  d.appendTemplate("DIV", "tx-list", TEMPLATE1, params)

  for (let action of params.actions) {

    let toAdd: TxInfo = {
      action: `${action.methodName}(${JSON.stringify(action.args)})`,
      attached: (action.params.deposit != "0" && action.params.deposit != "1") ?
        `with <span class="near">${removeDecZeroes(ytonFull(action.params.deposit))}</span> attached NEAR` : ""
    }

    switch (action.type) {
      case "FunctionCall":
        toAdd.action = `call ${action.params.methodName}(${humanReadableCallArgs(action.params.args)})`;
        break;

      case "Transfer":
        toAdd.action = ""
        toAdd.attached = `transfer <span class="near">${ytonString(action.params.deposit)}</span> NEAR`
        break;

      default:
        toAdd.action = JSON.stringify(action);
    }

    // //explain action
    const TEMPLATE = `
    <li id="{name}">
      <div class="action">{action}</div>
      <div class="attached-near">{attached}</div>
    </li>
    `;
    d.appendTemplateLI(txContainerId + "_actions", TEMPLATE, toAdd)
  }
}

function displayMultipleTransactionParams(txArray: any[]) {
  let inx = 0;
  for (let tx of txArray) {
    displaySingleTransactionParams(inx, tx)
    inx++
  }
  // let toAdd: TxInfo = {
  //   action: item.action,
  //   attached: (item.attached != "0" && item.attached != "1") ?
  //     `with <span class="near">${c.removeDecZeroes(c.ytonFull(item.attached))}</span> attached NEAR` : ""
  // }
  // //explain action
  // switch (item.action) {
  //   case "call":
  //     const f = item as FunctionCall;
  //     toAdd.action = `call ${f.method}(${humanReadableCallArgs(f.args)})`;
  //     break;

  //   case "transfer":
  //     toAdd.action = ""
  //     toAdd.attached = `transfer <span class="near">${c.ytonString(item.attached)}</span> NEAR`
  //     break;

  //   default:
  //     toAdd.action = JSON.stringify(item);
  // }
  // for (let item of tx.items) {
  //   const f = item as FunctionCall;
  //   let toAdd = { receiver: tx.receiver, action: `${f.method}(${JSON.stringify(f.args)})` }
  //   const TEMPLATE = `
  //   <li id="{name}">
  //     <div class="receiver">{receiver}</div>
  //     <div class="actions">{action}</div>
  //   </li>
  //   `;
  //   // 
  //   d.appendTemplateLI("list", TEMPLATE, toAdd)
  // }

  // console.log("tx", tx)
  // }
}

// // wait for window.msg to be set
// let interval: NodeJS.Timeout
// function waitForMsg(){
//   console.log("waiting for window.msg",window.msg)
//   if (window.msg) {
//     clearInterval(interval)
//     displayTx()
//   }
// }
// window.onload = function () {
//   console.log("setInterval(waitForMsg")
//   interval = setInterval(waitForMsg,1000);
// }


