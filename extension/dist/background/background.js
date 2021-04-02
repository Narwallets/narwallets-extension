import * as c from "../util/conversions.js";
import * as global from "../data/global.js";
import { log } from "../lib/log.js";
import * as Network from "../lib/near-api-lite/network.js";
import * as near from "../lib/near-api-lite/near-rpc.js";
import { jsonRpc } from "../lib/near-api-lite/utils/json-rpc.js";
import { localStorageSet, localStorageGet } from "../data/util.js";
import * as TX from "../lib/near-api-lite/transaction.js";
//version: major+minor+version, 3 digits each
function semver(major, minor, version) { return major * 1e6 + minor * 1e3 + version; }
const WALLET_VERSION = semver(2, 0, 0);
//---------- working data
let _connectedTabs = {};
let _bgDataRecovered;
// if the transaction include attached near, store here to update acc balance async
let global_NearsSent = { from: "", to: "", amount: "0" };
//----------------------------------------
//-- LISTEN to "chrome.runtime.message" from own POPUPs or from content-scripts
//-- msg path is popup->here->action->sendResponse(err,data)
//-- msg path is tab->cs->here->action
//----------------------------------------
//https://developer.chrome.com/extensions/background_pages
chrome.runtime.onMessage.addListener(runtimeMessageHandler);
function runtimeMessageHandler(msg, sender, sendResponse) {
    //check if it comes from the web-page or from this extension 
    const url = sender.url ? sender.url : "";
    const fromPage = !url.startsWith("chrome-extension://" + chrome.runtime.id + "/");
    //console.log("runtimeMessage received ",sender, url)
    log("runtimeMessage received " + (fromPage ? "FROM PAGE " : "from popup ") + JSON.stringify(msg));
    if (msg.dest != "ext") {
        sendResponse({ err: "msg.dest must be 'ext'" });
    }
    else if (fromPage) {
        // from web-app/tab -> content-script
        // process separated from internal requests for security
        msg.url = url; //add source
        msg.tabId = (sender.tab ? sender.tab.id : -1); //add tab.id
        setTimeout(() => { processMessageFromWebPage(msg); }, 100); //execute async
    }
    else {
        //from internal pages like popup
        //other codes resolved by promises
        global_NearsSent = { from: "", to: "", amount: "0" };
        getActionPromise(msg)
            .then((data) => {
            setTimeout(reflectTransfer, 200); //move amounts if accounts are in the wallet
            sendResponse({ data: data });
        })
            .catch((ex) => {
            sendResponse({ err: ex.message });
        });
        //sendResponse will be called async .- always return true
        //returning void cancels all pending callbacks
    }
    return true; //a prev callback could be pending.- always return true
}
//-- reflec transfer in wallet accounts
function reflectTransfer() {
    try {
        if (global_NearsSent.amount == "0" || !global.SecureState)
            return;
        let modified = false;
        //check if sender is in this wallet
        if (global_NearsSent.from && global.SecureState.accounts[Network.current]) {
            const senderAccInfo = global.SecureState.accounts[Network.current][global_NearsSent.from];
            if (senderAccInfo) {
                senderAccInfo.lastBalance -= c.yton(global_NearsSent.amount);
                modified = true;
            }
        }
        //check if receiver is also in this wallet
        if (global_NearsSent.to && global.SecureState.accounts[Network.current]) {
            const receiverAccInfo = global.SecureState.accounts[Network.current][global_NearsSent.to];
            if (receiverAccInfo) {
                receiverAccInfo.lastBalance += c.yton(global_NearsSent.amount);
                modified = true;
            }
        }
        if (modified) {
            global.saveSecureState();
        }
    }
    catch (ex) {
        log(ex.message);
    }
}
//create a promise to resolve the action requested by the popup
function getActionPromise(msg) {
    try {
        if (msg.code == "set-network") {
            Network.setCurrent(msg.network);
            localStorageSet({ selectedNetwork: Network.current });
            return Promise.resolve(Network.currentInfo());
        }
        else if (msg.code == "get-network-info") {
            return Promise.resolve(Network.currentInfo());
        }
        else if (msg.code == "get-state") {
            return Promise.resolve(global.State);
        }
        else if (msg.code == "lock") {
            global.lock(JSON.stringify(msg));
            return Promise.resolve();
        }
        else if (msg.code == "is-locked") {
            return Promise.resolve(global.isLocked());
        }
        else if (msg.code == "unlockSecureState") {
            return global.unlockSecureStateAsync(msg.email, msg.password);
        }
        else if (msg.code == "create-user") {
            return global.createUserAsync(msg.email, msg.password);
        }
        else if (msg.code == "set-options") {
            global.SecureState.advancedMode = msg.advancedMode;
            global.SecureState.autoUnlockSeconds = msg.autoUnlockSeconds;
            global.saveSecureState();
            return Promise.resolve();
        }
        else if (msg.code == "get-options") {
            return Promise.resolve({
                advancedMode: global.SecureState.advancedMode,
                autoUnlockSeconds: global.SecureState.autoUnlockSeconds,
            });
        }
        else if (msg.code == "get-account") {
            if (!global.SecureState.accounts[Network.current])
                return Promise.resolve(undefined);
            return Promise.resolve(global.SecureState.accounts[Network.current][msg.accountId]);
        }
        else if (msg.code == "set-account") {
            if (!msg.accountId)
                return Promise.reject(Error("!msg.accountId"));
            if (!msg.accInfo)
                return Promise.reject(Error("!msg.accInfo"));
            if (!global.SecureState.accounts[Network.current])
                global.SecureState.accounts[Network.current] = {};
            global.SecureState.accounts[Network.current][msg.accountId] = msg.accInfo;
            global.saveSecureState();
            return Promise.resolve();
        }
        else if (msg.code == "set-account-order") { //whe the user reorders the account list
            try {
                let accInfo = global.getAccount(msg.accountId);
                accInfo.order = msg.order;
                global.saveSecureState();
                return Promise.resolve();
            }
            catch (ex) {
                return Promise.reject(ex);
            }
        }
        else if (msg.code == "remove-account") {
            delete global.SecureState.accounts[Network.current][msg.accountId];
            //persist
            global.saveSecureState();
            return Promise.resolve();
        }
        else if (msg.code == "getNetworkAccountsCount") {
            return Promise.resolve(global.getNetworkAccountsCount());
        }
        else if (msg.code == "all-network-accounts") {
            const result = global.SecureState.accounts[Network.current];
            return Promise.resolve(result || {});
        }
        else if (msg.code == "connect") {
            if (!msg.network)
                msg.network = Network.current;
            return connectToWebPage(msg.accountId, msg.network);
        }
        else if (msg.code == "disconnect") {
            return disconnectFromWebPage();
        }
        else if (msg.code == "isConnected") {
            return isConnected();
        }
        else if (msg.code == "get-validators") {
            //view-call request
            return near.getValidators();
        }
        else if (msg.code == "access-key") {
            //check acess-key exists and get nonce
            return near.access_key(msg.accountId, msg.publicKey);
        }
        else if (msg.code == "query-near-account") {
            //check acess-key exists and get nonce
            return near.queryAccount(msg.accountId);
        }
        else if (msg.code == "view") {
            //view-call request
            return near.view(msg.contract, msg.method, msg.args);
        }
        else if (msg.code == "apply") {
            //apply transaction request from popup
            //{code:"apply", signerId:<account>, tx:BatchTransction} 
            //when resolved, send msg to content-script->page
            const signerId = msg.signerId || "...";
            const accInfo = global.getAccount(signerId);
            if (!accInfo.privateKey)
                throw Error(`Narwallets: account ${signerId} is read-only`);
            //convert wallet-api actions to near.TX.Action
            const actions = [];
            for (let item of msg.tx.items) {
                //convert action
                switch (item.action) {
                    case "call":
                        const f = item;
                        actions.push(TX.functionCall(f.method, f.args, BigInt(f.gas), BigInt(f.attached)));
                        global_NearsSent = { from: signerId, to: msg.tx.receiver, amount: f.attached };
                        break;
                    case "transfer":
                        actions.push(TX.transfer(BigInt(item.attached)));
                        global_NearsSent = { from: signerId, to: msg.tx.receiver, amount: item.attached };
                        break;
                    case "delete":
                        const d = item;
                        actions.push(TX.deleteAccount(d.beneficiaryAccountId));
                        break;
                    default:
                        throw Error("batchTx UNKNOWN item.action=" + item.action);
                }
            }
            //returns the Promise required to complete this action
            return near.broadcast_tx_commit_actions(actions, signerId, msg.tx.receiver, accInfo.privateKey);
        }
        //default
        throw Error(`invalid msg.code ${JSON.stringify(msg)}`);
    }
    catch (ex) {
        return Promise.reject(ex);
    }
}
//---------------------------------------------------
//process msgs from web-page->content-script->here
//---------------------------------------------------
async function processMessageFromWebPage(msg) {
    log(`enter processMessageFromWebPage _bgDataRecovered ${_bgDataRecovered}`);
    if (!msg.tabId) {
        log("msg.tabId is ", msg.tabId);
        return;
    }
    if (!_bgDataRecovered)
        await retrieveBgInfoFromStorage();
    //when resolved, send msg to content-script->page
    let resolvedMsg = { dest: "page", code: "request-resolved", tabId: msg.tabId, requestId: msg.requestId };
    log(JSON.stringify(resolvedMsg));
    log("_connectedTabs[msg.tabId]", JSON.stringify(_connectedTabs[msg.tabId]));
    if (!_connectedTabs[msg.tabId]) {
        resolvedMsg.err = `chrome-tab ${msg.tabId} is not connected to Narwallets`; //if error also send msg to content-script->tab
        chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        return;
    }
    const ctinfo = _connectedTabs[msg.tabId];
    log(`processMessageFromWebPage _bgDataRecovered ${_bgDataRecovered}`, JSON.stringify(msg));
    switch (msg.code) {
        case "connected":
            ctinfo.aceptedConnection = (!msg.err);
            ctinfo.connectedResponse = msg;
            break;
        case "disconnect":
            ctinfo.aceptedConnection = false;
            break;
        case "get-account-balance":
            near.queryAccount(msg.accountId)
                .then(data => {
                resolvedMsg.data = data.amount; //if resolved ok, send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            })
                .catch(ex => {
                resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            });
            break;
        case "get-account-state":
            near.queryAccount(msg.accountId)
                .then(data => {
                resolvedMsg.data = data; //if resolved ok, send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            })
                .catch(ex => {
                resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            });
            break;
        case "view":
            //view-call request
            near.view(msg.contract, msg.method, msg.args)
                .then(data => {
                resolvedMsg.data = data; //if resolved ok, send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            })
                .catch(ex => {
                resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            });
            break;
        case "apply":
            //tx apply, change call request, requires user approval
            try {
                if (!ctinfo.connectedAccountId) {
                    throw Error("connectedAccountId is null"); //if error also send msg to content-script->tab
                }
                //verify account exists and is full-access
                const signerId = ctinfo.connectedAccountId;
                const accInfo = global.getAccount(signerId);
                if (!accInfo.privateKey)
                    throw Error(`Narwallets: account ${signerId} is read-only`);
                msg.dest = "approve"; //send msg to the approval popup
                msg.signerId = ctinfo.connectedAccountId;
                msg.network = Network.current;
                //pass message via chrome.extension.getBackgroundPage() common window
                //@ts-ignore
                window.pendingApprovalMsg = msg;
                //load popup window for the user to approve
                const width = 500;
                const height = 540;
                chrome.windows.create({
                    url: 'popups/approve/approve.html',
                    type: 'popup',
                    left: screen.width / 2 - width / 2,
                    top: screen.height / 2 - height / 2,
                    width: width,
                    height: height,
                    focused: true
                });
            }
            catch (ex) {
                //@ts-ignore
                window.pendingApprovalMsg = undefined;
                resolvedMsg.err = ex.message; //if error, also send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            }
            break;
        case "json-rpc":
            //low-level query
            jsonRpc(msg.method, msg.args)
                .then(data => {
                resolvedMsg.data = data; //if resolved ok, send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            })
                .catch(ex => {
                resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
                chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
            });
            break;
        default:
            log("unk msg.code", JSON.stringify(msg));
            resolvedMsg.err = "invalid code: " + msg.code; //if error ok, also send msg to content-script->tab
            chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
    }
}
//------------------------
//on extension installed
//------------------------
chrome.runtime.onInstalled.addListener(function (details) {
    log("onInstalled");
    if (details.reason == "install") {
        //call a function to handle a first install
    }
    else if (details.reason == "update") {
        //call a function to handle an update
    }
});
function connectToWebPage(accountId, network) {
    log("connectToWebPage start");
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError)
                return reject(Error(chrome.runtime.lastError.message));
            const activeTabId = (tabs[0] ? tabs[0].id : -1) || -1;
            if (activeTabId == -1)
                return reject(Error("no activeTabId"));
            if (!_connectedTabs)
                _connectedTabs = {};
            if (!_connectedTabs[activeTabId])
                _connectedTabs[activeTabId] = {};
            const cpsData = {
                accountId: accountId,
                network: network,
                activeTabId: activeTabId,
                url: tabs[0].url,
                ctinfo: _connectedTabs[activeTabId],
                resolve: resolve,
                reject: reject
            };
            log("activeTabId", cpsData);
            cpsData.ctinfo = _connectedTabs[cpsData.activeTabId];
            cpsData.ctinfo.aceptedConnection = false; //we're connecting another
            cpsData.ctinfo.connectedResponse = {};
            //check if it responds (if it is already injected)
            try {
                if (chrome.runtime.lastError)
                    throw Error(chrome.runtime.lastError);
                if (!tabs || !tabs[0])
                    throw Error("can access chrome tabs");
                chrome.tabs.sendMessage(cpsData.activeTabId, { code: "ping" }, function (response) {
                    if (chrome.runtime.lastError) {
                        response = undefined;
                    }
                    if (!response) {
                        //not responding, set injected status to false
                        cpsData.ctinfo.injected = false;
                        //console.error(JSON.stringify(chrome.runtime.lastError));
                    }
                    else {
                        //responded set injected status
                        cpsData.ctinfo.injected = true;
                    }
                    //CPS
                    return continueCWP_2(cpsData);
                });
            }
            catch (ex) {
                //err trying to talk to the page, set injected status
                cpsData.ctinfo.injected = false;
                log(ex);
                //CPS
                return continueCWP_2(cpsData);
            }
        });
    });
}
///inject if necessary
function continueCWP_2(cpsData) {
    if (cpsData.ctinfo.injected) {
        //if responded, it was injected, continue
        return continueCWP_3(cpsData);
    }
    //not injected yet. Inject/execute contentScript on activeTab
    //contentScript replies with a chrome.runtime.sendmessage 
    //it also listens to page messages and relays via chrome.runtime.sendmessage 
    //basically contentScript.js acts as a proxy to pass messages from ext<->tab
    log("injecting");
    try {
        chrome.tabs.executeScript({ file: 'dist/background/contentScript.js' }, function () {
            if (chrome.runtime.lastError) {
                log(JSON.stringify(chrome.runtime.lastError));
                return cpsData.reject(chrome.runtime.lastError);
            }
            else {
                //injected ok
                cpsData.ctinfo.injected = true;
                //CPS
                return continueCWP_3(cpsData);
            }
        });
    }
    catch (ex) {
        return cpsData.reject(ex);
    }
}
///send connect order
function continueCWP_3(cpsData) {
    cpsData.ctinfo.connectedResponse = { err: undefined };
    log("chrome.tabs.sendMessage to", cpsData.activeTabId, cpsData.url);
    //send connect order via content script. a response will be received later
    chrome.tabs.sendMessage(cpsData.activeTabId, { dest: "page", code: "connect", data: { accountId: cpsData.accountId, network: cpsData.network, version: WALLET_VERSION } });
    //wait 250 for response
    setTimeout(() => {
        if (cpsData.ctinfo.aceptedConnection) { //page responded with connection info
            cpsData.ctinfo.connectedAccountId = cpsData.accountId; //register connected acount
            return cpsData.resolve();
        }
        else {
            let errMsg = cpsData.ctinfo.connectedResponse.err || "not responding / Not a Narwallets-compatible Web App";
            return cpsData.reject(Error(cpsData.url + ": " + errMsg));
        }
    }, 250);
}
function disconnectFromWebPage() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError)
                throw Error(chrome.runtime.lastError.message);
            if (!tabs || !tabs[0])
                reject(Error("can access chrome tabs"));
            const activeTabId = tabs[0].id || -1;
            if (_connectedTabs[activeTabId] && _connectedTabs[activeTabId].aceptedConnection) {
                _connectedTabs[activeTabId].aceptedConnection = false;
                chrome.tabs.sendMessage(activeTabId, { dest: "page", code: "disconnect" });
                return resolve();
            }
            else {
                return reject(Error("active web page is not connected"));
            }
        });
    });
}
function isConnected() {
    return new Promise((resolve, reject) => {
        if (!_connectedTabs)
            return resolve(false);
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError)
                return reject(chrome.runtime.lastError.message);
            if (!tabs || tabs.length == 0 || !tabs[0])
                return resolve(false);
            const activeTabId = tabs[0].id;
            if (!activeTabId)
                return resolve(false);
            return resolve(!!(_connectedTabs[activeTabId] && _connectedTabs[activeTabId].aceptedConnection));
        });
    });
}
function saveWorkingData() {
    localStorageSet({ _ct: _connectedTabs, _us: global.workingData.unlockSHA });
    // if (!global.isLocked()) {
    //   localStorageSet({ _unlock:  })
    // }
}
//recover working data if it was suspended
async function recoverWorkingData() {
    _connectedTabs = await localStorageGet("_ct");
    log("RECOVERED _connectedTabs", _connectedTabs);
    global.workingData.unlockSHA = await localStorageGet("_us");
    log("RECOVERED SHA", global.workingData.unlockSHA);
    //@ts-ignore 
    //_connectedTabs = await localStorageGet("_ct");
}
//------------------------
//on bg page suspended
//------------------------
chrome.runtime.onSuspend.addListener(function () {
    //save working data
    saveWorkingData();
    log("onSuspend.");
    chrome.browserAction.setBadgeText({ text: "" });
});
//------------------------
//----- expire auto-unlock
//------------------------
const UNLOCK_EXPIRED = "unlock-expired";
//------------------------
//expire alarm
//------------------------
chrome.alarms.onAlarm.addListener(function (alarm) {
    //log("chrome.alarms.onAlarm fired ", alarm);
    if (alarm.name == UNLOCK_EXPIRED) {
        chrome.alarms.clearAll();
        global.lock("chrome.alarms.onAlarm " + JSON.stringify(alarm));
        //window.close()//unload this background page 
        //chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
    }
});
var lockTimeout;
var unlockExpire;
//only to receive "popupLoading"|"popupUnloading" events
window.addEventListener("message", async function (event) {
    if (event.data.code == "popupUnloading") {
        if (!global.isLocked()) {
            const autoUnlockSeconds = global.getAutoUnlockSeconds();
            unlockExpire = Date.now() + autoUnlockSeconds * 1000;
            chrome.alarms.create(UNLOCK_EXPIRED, { when: unlockExpire });
            log(UNLOCK_EXPIRED, autoUnlockSeconds);
            if (autoUnlockSeconds < 60 * 5) {
                //also setTimeout to Lock, because alarms fire only once per minute
                if (lockTimeout)
                    clearTimeout(lockTimeout);
                lockTimeout = setTimeout(global.lock, autoUnlockSeconds * 1000);
            }
        }
        return;
    }
    else if (event.data.code == "popupLoading") {
        log("popupLoading");
        await retrieveBgInfoFromStorage();
        chrome.runtime.sendMessage({ dest: "popup", code: "can-init-popup" });
    }
}, false);
// called on popupLoading to consider the possibility the user added accounts to the wallet on another tab
async function retrieveBgInfoFromStorage() {
    if (unlockExpire && Date.now() > unlockExpire)
        global.lock("retrieveBgInfoFromStorage");
    if (lockTimeout)
        clearTimeout(lockTimeout);
    //To manage the possibilit that the user has added/removed accounts ON ANOTHER TAB
    //we reload state & secureState from storage when the popup opens
    await global.recoverState();
    if (!global.State.dataVersion) {
        global.clearState();
    }
    if (global.State.currentUser && global.workingData.unlockSHA) {
        //try to recover secure state
        try {
            await global.unlockSecureStateSHA(global.State.currentUser, global.workingData.unlockSHA);
        }
        catch (ex) {
            log("recovering secure state on retrieveBgInfoFromStorage", ex.message);
        }
    }
    _bgDataRecovered = true;
    const nw = await localStorageGet("selectedNetwork");
    if (nw)
        Network.setCurrent(nw);
    log("NETWORK=", nw);
}
//returns true if loaded-upacked, developer mode
//false if installed from the chrome store
function isDeveloperMode() {
    return !('update_url' in chrome.runtime.getManifest());
}
document.addEventListener('DOMContentLoaded', onLoad);
async function onLoad() {
    //WARNING:: if the background page wakes-up because a tx-apply
    //chrome will process "MessageFromPage" ASAP, meaning BEFORE the 2nd await.
    //solution: MessageFromPage is on a setTimeout to execute async
    //logEnabled(isDeveloperMode());
    //logEnabled(true);
    await recoverWorkingData();
    if (!_bgDataRecovered)
        await retrieveBgInfoFromStorage();
}
//# sourceMappingURL=background.js.map