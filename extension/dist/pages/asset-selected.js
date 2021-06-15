const THIS_PAGE = "AccountAssetDetail";
import * as c from "../util/conversions.js";
import { askBackgroundCallMethod, askBackgroundSetAccount, } from "../background/askBackground.js";
import { isValidAccountID, isValidAmount, } from "../lib/near-api-lite/utils/valid.js";
import * as d from "../util/document.js";
import { disableOKCancel, enableOKCancel, hideOkCancel, showOKCancel, } from "../util/okCancel.js";
import * as searchAccounts from "../util/search-accounts.js";
let asset_array;
let asset_selected;
let asset_index;
let accData;
let isMoreOptionsOpen = false;
// page init
export async function show(acc, assetIndex, reposition) {
    // confirmBtn = new d.El("#account-selected-action-confirm");
    // cancelBtn = new d.El("#account-selected-action-cancel");
    d.onClickId("asset-receive", showAssetReceiveClicked);
    d.onClickId("asset-send", showAssetSendClicked);
    d.onClickId("asset-remove", removeSelectedFromAssets);
    // confirmBtn.onClick(confirmClicked);
    // cancelBtn.onClick(cancelClicked);
    accData = acc;
    asset_array = acc.accountInfo.assets;
    asset_index = assetIndex;
    asset_selected = acc.accountInfo.assets[asset_index];
    d.showPage(THIS_PAGE);
    d.onClickId("back-to-selected", backToSelectClicked);
    d.showSubPage("asset-history");
    d.byId("topbar").innerText = "Assets";
    d.clearContainer("selected-asset");
    var templateData = {
        acc: accData,
        asset: asset_selected,
    };
    d.appendTemplateLI("selected-asset", "selected-asset-template", templateData);
    d.clearContainer("asset-history-details");
    d.populateUL("asset-history-details", "asset-history-template", asset_selected.history);
}
function backToSelectClicked() {
    d.showPage("account-selected");
    d.showSubPage("assets");
    d.byId("ok-cancel-row").classList.add("hidden");
    d.byId("topbar").innerText = "Accounts";
}
function showAssetReceiveClicked() {
    d.showSubPage("asset-receive-subpage");
    d.byId("asset-receive-symbol").innerText = asset_selected.symbol;
    d.byId("asset-receive-account").innerText = accData.name;
    showOKCancel(showInitial, showInitial);
}
function showAssetSendClicked() {
    d.showSubPage("asset-send-subpage");
    d.byId("asset-symbol").innerText = asset_selected.symbol;
    showOKCancel(sendOKClicked, showInitial);
}
async function sendOKClicked() {
    try {
        //validate
        const toAccName = new d.El("#send-to-asset-account").value;
        const amountToSend = d.getNumber("#send-to-asset-amount");
        if (!isValidAccountID(toAccName))
            throw Error("Receiver Account Id is invalid");
        if (!isValidAmount(amountToSend))
            throw Error("Amount should be a positive integer");
        if (accData.isReadOnly)
            throw Error("Account is read-only");
        if (amountToSend > asset_selected.balance)
            throw Error("Amount exceeds available balance");
        //show confirmation subpage
        d.showSubPage("asset-selected-send-confirmation");
        d.byId("asset-send-confirmation-amount").innerText =
            c.toStringDec(amountToSend);
        d.byId("asset-send-confirmation-receiver").innerText = toAccName;
        showOKCancel(performSend, showInitial); //on OK clicked, send
    }
    catch (ex) {
        d.showErr(ex.message);
    }
}
async function performSend() {
    try {
        const toAccName = d.byId("asset-send-confirmation-receiver").innerText;
        const amountToSend = c.toNum(d.byId("asset-send-confirmation-amount").innerText);
        d.byId("asset-symbol-confirmation").innerText = asset_selected.symbol;
        disableOKCancel();
        d.showWait();
        await askBackgroundCallMethod(asset_selected.contractId, "ft_transfer", {
            receiver_id: toAccName,
            amount: c.ntoy(amountToSend),
            memo: null,
        }, accData.name, undefined, "1");
        hideOkCancel();
        showInitial();
        //TODO transaction history per network
        //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
        //global.state.transactions[Network.current].push(transactionInfo)
        d.showSuccess("Success: " +
            accData.name +
            " transferred " +
            c.toStringDec(amountToSend) +
            " " +
            asset_selected.symbol +
            " to " +
            toAccName);
        //Checkear
        // displayReflectTransfer(amountToSend);
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
        d.hideWait();
        enableOKCancel();
    }
}
function deleteAsset() {
    asset_array.splice(asset_index, 1);
    d.clearContainer("assets-list");
    d.populateUL("assets-list", "asset-item-template", asset_array);
    //Guardo
    refreshSaveSelectedAccount();
    //Salgo del asset detail eliminado
    backToSelectClicked();
}
export function removeSelectedFromAssets() {
    d.showSubPage("asset-remove-selected");
    showOKCancel(deleteAsset, showInitial);
    // //elimino, limpio y relleno lista de assets
}
function showInitial() {
    d.showSubPage("asset-history");
}
async function refreshSaveSelectedAccount() {
    await searchAccounts.asyncRefreshAccountInfo(accData.name, accData.accountInfo);
    await saveSelectedAccount();
}
async function saveSelectedAccount() {
    return askBackgroundSetAccount(accData.name, accData.accountInfo);
}
function cancelHide() {
    throw new Error("Function not implemented.");
}
function displayReflectTransfer(amountToSend) {
    throw new Error("Function not implemented.");
}
//# sourceMappingURL=asset-selected.js.map