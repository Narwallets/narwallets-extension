const THIS_PAGE = "AccountAssetDetail";
import { askBackgroundSetAccount } from "../background/askBackground.js";
import * as d from "../util/document.js";
import * as searchAccounts from "../util/search-accounts.js";
let asset_array;
let asset_selected;
let asset_index;
let accDate;
export async function show(acc, assetIndex, reposition) {
    d.onClickId("asset-receive", showAssetReceiveClicked);
    d.onClickId("asset-send", showAssetSendClicked);
    d.onClickId("asset-remove", removeSelectedFromAssets);
    accDate = acc;
    asset_array = acc.accountInfo.assets;
    asset_index = assetIndex;
    asset_selected = acc.accountInfo.assets[asset_index];
    d.showPage(THIS_PAGE);
    d.onClickId("back-to-selected", backToSelectClicked);
    d.showSubPage("asset-history");
}
async function selectAndShowAsset(asset) {
    //   selectedAsset = new Asset();
    //   if (accInfo.ownerId && accInfo.type == "lock.c" && !accInfo.privateKey) {
    //     //lock.c is read-only, but do we have full access on the owner?
    //     const ownerInfo = await getAccountRecord(accInfo.ownerId);
    //     if (ownerInfo && ownerInfo.privateKey)
    //       selectedAccountData.accessStatus = "Owner";
    //   }
    //   showSelectedAccount();
}
function backToSelectClicked() {
    d.showPage("account-selected");
    d.showSubPage("assets");
}
function showAssetReceiveClicked() {
    d.showSubPage("asset-receive-subpage");
}
function showAssetSendClicked() {
    d.showSubPage("asset-send-subpage");
}
export function removeSelectedFromAssets() {
    //elimino, limpio y relleno lista de assets
    asset_array.splice(asset_index, 1);
    d.clearContainer("assets");
    d.populateUL("assets", "asset-item-template", asset_array);
    //Guardo
    refreshSaveSelectedAccount();
    //Salgo del asset detail eliminado
    backToSelectClicked();
}
async function refreshSaveSelectedAccount() {
    await searchAccounts.asyncRefreshAccountInfo(accDate.name, accDate.accountInfo);
    await saveSelectedAccount();
}
async function saveSelectedAccount() {
    return askBackgroundSetAccount(accDate.name, accDate.accountInfo);
}
//# sourceMappingURL=asset-selected.js.map