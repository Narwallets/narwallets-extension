const THIS_PAGE = "AccountAssetDetail";
import { askBackgroundSetAccount } from "../background/askBackground.js";
import { Asset, ExtendedAccountData } from "../data/account.js";
import * as d from "../util/document.js";
import * as searchAccounts from "../util/search-accounts.js";

let asset_array: Asset[];
let asset_selected: Asset;
let asset_index: number;
let accData: ExtendedAccountData;
let isMoreOptionsOpen = false;

// page init
let okCancelRow: d.El;
let confirmBtn: d.El;
let cancelBtn: d.El;

export async function show(
  acc: ExtendedAccountData,
  assetIndex: number,
  reposition?: string
) {
  confirmBtn = new d.El("#asset-selected-action-confirm");
  cancelBtn = new d.El("#asset-selected-action-cancel");
  okCancelRow = new d.El("#ok-cancel-row-asset");
  d.onClickId("asset-receive", showAssetReceiveClicked);
  d.onClickId("asset-send", showAssetSendClicked);
  d.onClickId("asset-remove", removeSelectedFromAssets);

  accData = acc;
  asset_array = acc.accountInfo.assets;
  asset_index = assetIndex;
  asset_selected = acc.accountInfo.assets[asset_index];
  d.showPage(THIS_PAGE);
  d.onClickId("back-to-selected", backToSelectClicked);
  d.showSubPage("asset-history");
  d.clearContainer("selected-asset");
  var templateData = {
    acc: accData,
    asset: asset_selected,
  };
  d.appendTemplateLI("selected-asset", "selected-asset-template", templateData);
}

function backToSelectClicked() {
  d.showPage("account-selected");
  d.showSubPage("assets");
}

function showAssetReceiveClicked() {
  d.showSubPage("asset-receive-subpage");
  showOKCancel(showButtons);
}

function showAssetSendClicked() {
  d.showSubPage("asset-send-subpage");
  showOKCancel(showButtons);
}

export function removeSelectedFromAssets() {
  d.showSubPage("asset-selected-remove");
  enableOKCancel();
  // //elimino, limpio y relleno lista de assets
  // asset_array.splice(asset_index, 1);
  // d.clearContainer("assets");
  // d.populateUL("assets", "asset-item-template", asset_array);

  // //Guardo
  // refreshSaveSelectedAccount();

  // //Salgo del asset detail eliminado
  // backToSelectClicked();
}

function showButtons() {
  okCancelRow.hide();
  //if (showingMore()) moreLessClicked()
}

async function refreshSaveSelectedAccount() {
  await searchAccounts.asyncRefreshAccountInfo(
    accData.name,
    accData.accountInfo
  );
  await saveSelectedAccount();
}

async function saveSelectedAccount(): Promise<any> {
  return askBackgroundSetAccount(accData.name, accData.accountInfo);
}

let confirmFunction: (ev: Event) => void = function (ev) {};

function showOKCancel(OKHandler: d.ClickHandler) {
  isMoreOptionsOpen = false;
  confirmFunction = OKHandler;
  okCancelRow.show();
  enableOKCancel();
}

function disableOKCancel() {
  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
}
function enableOKCancel() {
  confirmBtn.disabled = false;
  cancelBtn.disabled = false;
  cancelBtn.hidden = false;
}
