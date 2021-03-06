import * as d from "../../util/document.js";
import * as c from "../../util/conversions.js";
import { askBackground } from "../../background/askBackground.js";
let responseSent = false;
var initialMsg;
var resolvedMsg;
async function approveOkClicked() {
    d.showWait();
    try {
        //ask backgroun to apply transaction
        resolvedMsg.data = await askBackground(initialMsg);
        //response goes to initiating tab/page, another 5-min wating spinner is there
        chrome.tabs.sendMessage(initialMsg.tabId, resolvedMsg); //send resolution to original asking tab/page
        responseSent = true;
        setTimeout(() => { window.close(); }, 100);
    }
    catch (ex) {
        d.showErr(ex.message); //some error
        //the user can retry or cancel the approval
    }
    finally {
        d.hideWait();
    }
}
function respondRejected() {
    resolvedMsg.err = "User rejected the transaction";
    chrome.tabs.sendMessage(initialMsg.tabId, resolvedMsg); //resolve-reject request
    responseSent = true;
}
function cancelOkClicked() {
    respondRejected();
    setTimeout(() => { window.close(); }, 200);
}
window.addEventListener('beforeunload', function (event) {
    if (!responseSent)
        respondRejected();
});
function humanReadableValue(value) {
    if (typeof value == "string") {
        if (/\d{20}/.test(value)) {
            //at least 20 digits. we assume YOCTOS
            return c.toStringDecMin(c.yton(value)) + "N";
        }
        else {
            return `"${value}"`;
        }
    }
    else {
        return value.toString();
    }
}
function humanReadableCallArgs(args) {
    let result = "{ ";
    let count = 0;
    for (let key in args) {
        if (count > 0)
            result = result + ", ";
        result = result + key + ":";
        let value = args[key];
        if (typeof value == "object" && !(value instanceof Date)) {
            result = result + humanReadableCallArgs(value); //recurse
        }
        else {
            result = result + humanReadableValue(value);
        }
        count++;
    }
    result = result + " }";
    if (result == "{  }")
        return "";
    return result;
}
// ---------------------
function displayTx(msg) {
    initialMsg = msg;
    resolvedMsg = { dest: "page", code: "request-resolved", tabId: initialMsg.tabId, requestId: initialMsg.requestId };
    try {
        d.byId("net-name").innerText = msg.network || "";
        d.byId("signer-id").innerText = msg.signerId || "";
        d.byId("web-page").innerText = msg.url;
        d.byId("receiver").innerText = msg.tx.receiver;
        d.clearContainer("list");
        for (let item of msg.tx.items) {
            let toAdd = {
                action: item.action,
                attached: (item.attached != "0" && item.attached != "1") ?
                    `with <span class="near">${c.removeDecZeroes(c.ytonFull(item.attached))}</span> attached NEAR` : ""
            };
            //explain action
            switch (item.action) {
                case "call":
                    const f = item;
                    toAdd.action = `call ${f.method}(${humanReadableCallArgs(f.args)})`;
                    break;
                case "transfer":
                    toAdd.action = "";
                    toAdd.attached = `transfer <span class="near">${c.ytonString(item.attached)}</span> NEAR`;
                    break;
                default:
                    toAdd.action = JSON.stringify(item);
            }
            d.appendTemplateLI("list", "item-template", toAdd);
        }
        //only if it displayed ok, enable ok action
        d.onClickId("approve-ok", approveOkClicked);
    }
    catch (ex) {
        d.showErr(ex.message);
        d.qs("#approve-ok").hide(); //hide ok button
    }
}
let retries = 0;
async function initFromBgPage() {
    //Get transaction to approve from background page window
    const bgpage = chrome.extension.getBackgroundPage();
    if (!bgpage && retries < 4) {
        retries++; //retry if we can't get bg page
        setTimeout(initFromBgPage, 200);
        return;
    }
    const msg = bgpage.pendingApprovalMsg;
    //Display transaction for user approval
    displayTx(msg);
}
//--- INIT
d.onClickId("approve-cancel", cancelOkClicked);
initFromBgPage();
//# sourceMappingURL=approve.js.map