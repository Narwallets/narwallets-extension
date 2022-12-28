// import * as c from "../../util/conversions.js"
import * as d from "../../util/document.js"
import { askBackground } from "../../askBackground.js"
import { removeDecZeroes, toStringDecMin, yton, ytonFull, ytonString } from "../../util/conversions.js";

type SendResponseFunction = (response: any) => void

type TxInfo = {
  action: string;
  attached: string;
}

type Msg = {
  id: number;
  senderUrl: string;
  network: string | undefined;
  signerId: string; // account
  receiverId: string; // contract
  params: any,
}

async function approveOkClicked() {
  d.showWait()
  // ask background to process the message, this time the origin is a popup from the extension, so it is trusted
  ThisApprovalMsg.dest = "ext"
  ThisApprovalMsg.src = "approve-popup"
  askBackground(ThisApprovalMsg)
    .then((data) => { approvalSendResponse({ data, code: ThisApprovalMsg.code }) })
    .catch((err) => { approvalSendResponse({ err: err.message, code: ThisApprovalMsg.code }) })
    .finally(() => { window.close() })
}

async function cancelOkClicked() {
  // respondRejected();
  approvalSendResponse({ err: "Rejected by user" })
  //const wasCalled = await askBackground({code:"callGlobalSendResponse", cancel: true})
  setTimeout(() => { window.close() }, 200);
}




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

    d.byId("web-page").innerText = msg.senderUrl

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
}

let approvalSendResponse: SendResponseFunction
let ThisApprovalMsg: any

window.addEventListener('beforeunload', function (event) {
  cancelOkClicked()
});

// Received message from bg
chrome.runtime.onMessage.addListener((msg: any, sender: chrome.runtime.MessageSender, sendResponse: SendResponseFunction) => {

  const senderIsExt = sender.url && sender.url.startsWith("chrome-extension://" + chrome.runtime.id + "/");
  if (senderIsExt && msg.dest == "approve-popup") {
    try {
      approvalSendResponse = sendResponse
      ThisApprovalMsg = msg
      // show request origin
      //d.byId("net-name").innerText = msg.network || ""
      // display instructions
      displayTx(msg)
      return true; // ack, it's for me, sendResponse will be called later
    }
    catch (err) {
      sendResponse({ err: err.message })
    }
  }
});
// let everyone interested know that this popup is opened and ready to process messages
setTimeout(() => { chrome.runtime.sendMessage({ code: "popup-is-ready", src: "approve" }) }, 1000)