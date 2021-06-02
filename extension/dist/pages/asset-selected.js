import * as d from "../util/document.js";
const THIS_PAGE = "AccountAssetDetail";
export async function show(asset, reposition) {
    //initPage();
    //await selectAndShowAsset(asset);
    d.showPage(THIS_PAGE);
    d.onClickId("back-to-selected", backToSelectClicked);
    console.log(asset);
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
//# sourceMappingURL=asset-selected.js.map