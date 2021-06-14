const THIS_PAGE = "AccountAssetDetail";
import { askBackgroundSetAccount } from "../background/askBackground.js";
import * as d from "../util/document.js";
import { showOKCancel } from "../util/okCancel.js";
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
    showOKCancel(showInitial, showInitial);
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
//# sourceMappingURL=asset-selected.js.map