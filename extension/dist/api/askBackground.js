import { BatchTransaction, FunctionCall, Transfer } from "./batch-transaction.js";
import { log } from "./log.js";
//ask background, wait for response, return a Promise
export function askBackground(requestPayload) {
    requestPayload.dest = "ext";
    return new Promise((resolve, reject) => {
        log("sendMessage", JSON.stringify(requestPayload));
        const timeout = setTimeout(() => { return reject(Error("timeout")); }, 30000);
        chrome.runtime.sendMessage(requestPayload, function (response) {
            clearTimeout(timeout);
            if (!response) {
                return reject(Error("response is empty"));
            }
            else if (response.err) {
                return reject(Error(response.err));
            }
            return resolve(response.data);
        });
    });
}
export function askBackgroundSetAccount(accountId, accInfo) {
    return askBackground({ code: "set-account", accountId: accountId, accInfo: accInfo });
}
export function askBackgroundIsLocked() {
    return askBackground({ code: "is-locked" });
}
export function askBackgroundGetState() {
    return askBackground({ code: "get-state" });
}
export function askBackgroundSetNetwork(networkName) {
    return askBackground({ code: "set-network", network: networkName });
}
export function askBackgroundGetNetworkInfo() {
    return askBackground({ code: "get-network-info" });
}
export function askBackgroundGetOptions() {
    return askBackground({ code: "get-options" });
}
export function askBackgroundAllNetworkAccounts() {
    return askBackground({ code: "all-network-accounts" });
}
export function askBackgroundGetValidators() {
    return askBackground({ code: "get-validators" });
}
export function askBackgroundGetAccessKey(accountId, publicKey) {
    return askBackground({ code: "access-key", accountId: accountId, publicKey: publicKey });
}
export function askBackgroundViewMethod(contract, method, args) {
    return askBackground({ code: "view", contract: contract, method: method, args: args });
}
export function askBackgroundCallMethod(contractId, method, params, signerId, Tgas = 25, attachedNear = 0) {
    const batchTx = new BatchTransaction(contractId);
    batchTx.addItem(new FunctionCall(method, params, Tgas, attachedNear));
    return askBackground({ code: "apply", signerId: signerId, tx: batchTx });
}
export function askBackgroundTransferNear(fromAccountId, receiverId, attachedNear) {
    const batchTx = new BatchTransaction(receiverId);
    batchTx.addItem(new Transfer(attachedNear));
    return askBackground({ code: "apply", signerId: fromAccountId, tx: batchTx });
}
export function askBackgroundApplyTxAction(receiverId, action, signerId) {
    const batchTx = new BatchTransaction(receiverId);
    batchTx.addItem(action);
    return askBackground({ code: "apply", signerId: signerId, tx: batchTx });
}
export function askBackgroundApplyBatchTx(signerId, batchTx) {
    return askBackground({ code: "apply", signerId: signerId, tx: batchTx });
}
//# sourceMappingURL=askBackground.js.map