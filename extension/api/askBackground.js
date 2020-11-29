import { BatchTransaction, FunctionCall, Transfer } from "./batch-transaction.js";
//ask background, wait for response, return a Promise
export function askBackground(requestPayload) {
    requestPayload.dest = "ext";
    return new Promise((resolve, reject) => {
        console.log("sendMessage", requestPayload);
        const timeout = setTimeout(() => { return reject(Error("timeout")); }, 10000);
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
export function askBackgroundGetState() {
    return askBackground({ code: "get-state" });
}
export function askBackgroundGetNetworkInfo() {
    return askBackground({ code: "get-network-info" });
}
export function askBackgroundGetOptions() {
    return askBackground({ code: "get-options" });
}
export function askBackgroundSetNetwork(networkName) {
    return askBackground({ code: "set-network", network: networkName });
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