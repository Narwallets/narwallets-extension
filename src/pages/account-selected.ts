import * as c from "../util/conversions.js";
import * as d from "../util/document.js";

import * as searchAccounts from "../util/search-accounts.js";
import * as Main from "../pages/main.js";

import * as StakingPool from "../contracts/staking-pool.js";
import {
  isValidAccountID,
  CheckValidAmount,
} from "../lib/near-api-lite/utils/valid.js";
import {
  checkSeedPhrase,
  parseSeedPhraseAsync,
} from "../lib/near-api-lite/utils/seed-phrase.js";
import {
  CurveAndArrayKey,
  KeyPairEd25519,
} from "../lib/near-api-lite/utils/key-pair.js";
import { show as UnlockPage_show } from "./unlock.js";

import { LockupContract } from "../contracts/LockupContract.js";
import {
  Account,
  Asset,
  History,
  Contact,
  newTokenFromMetadata,
  setAssetBalanceYoctos,
  assetUpdateBalance,
  findAsset,
  assetDivId,
} from "../data/account.js";
import { localStorageGetAndRemove, localStorageSet, showPassword } from "../data/util.js";
import {
  accountMatchesNetwork, activeNetworkInfo, 
  askBackground,
  askBackgroundApplyTxAction,
  askBackgroundApplyBatchTx,
  askBackgroundCallMethod,
  askBackgroundGetNetworkInfo,
  askBackgroundGetOptions,
  askBackgroundGetValidators,
  askBackgroundTransferNear,
  askBackgroundGetAccessKey,
  askBackgroundAllNetworkAccounts,
  askBackgroundSetAccount,
  askBackgroundViewMethod,
  askBackgroundGetState,
  askBackgroundGetAccountRecordCopy,
} from "../background/askBackground.js";
import {
  BatchTransaction,
  DeleteAccountToBeneficiary,
} from "../lib/near-api-lite/batch-transaction.js";

import { show as AccountPages_show } from "./main.js";
import { show as AssetSelected_show } from "./asset-selected.js";
import {
  contactExists,
  initAddressArr,
  saveContactOnBook,
  show as AddressBook_show,
  getAddressesForPopupList,
  getAccountsForPopupList
} from "./address-book.js";

import type { AnyElement, ClickHandler } from "../util/document.js";
import { D } from "../lib/tweetnacl/core/core.js";
import {
  confirmClicked,
  cancelClicked,
  OkCancelInit,
  disableOKCancel,
  enableOKCancel,
  showOKCancel,
  hideOkCancel,
} from "../util/okCancel.js";
import { ASSET_HISTORY_TEMPLATE, getNarwalletsMetrics, narwalletsMetrics, nearDollarPrice } from "../data/global.js";
import { addressContacts } from "./address-book.js";
import { box_overheadLength } from "../lib/naclfast-secret-box/nacl-fast.js";
import { GContact } from "../data/contact.js";
import {
  LIQUID_STAKE_DEFAULT_SVG,
  RECEIVE_SVG,
  SEND_SVG,
  STAKE_DEFAULT_SVG,
  STNEAR_SVG,
  TOKEN_DEFAULT_SVG,
  UNSTAKE_DEFAULT_SVG,
  WITHDRAW_SVG,
} from "../util/svg_const.js";
import { NetworkInfo } from "../lib/near-api-lite/network.js";
import { autoRefresh } from "../index.js";
import { closePopupList, popupComboConfigure, PopupItem, popupListOpen } from "../util/popup-list.js";
import { asyncRefreshAccountInfoLastBalance, ExtendedAccountData } from "../extendedAccountData.js";

const ACCOUNT_SELECTED = "account-selected";

export let selectedAccountData: ExtendedAccountData;


let removeButton: d.El;

let seedTextElem: d.El;
let isMoreOptionsOpen = false;
let stakeTabSelected: number = 1;

let intervalIdShow: any;

// Added for add token datalist patch
const TOKEN_LIST = "token-list";


export async function show(
  accName: string,
  reposition?: string,
  assetIndex?: number
) {

  // ask to select another if account does not matches network
  if (!accountMatchesNetwork(accName)) {
    selectAccountPopupList()
    return;
  }

  initPage();
  await selectAndShowAccount(accName);
  d.showPage(ACCOUNT_SELECTED);
  if (reposition) {
    switch (reposition) {
      case "stake": {
        stakeClicked();
        break;
      }
      case "asset": {
        if (assetIndex !== undefined) {
          AssetSelected_show(assetIndex);
        }
        break;
      }
      case "ask_private_key": {
        askPrivateKey();
        // a subpage is already showing
        return;
      }
    }
  }
  let payload:Record<string, any>={
    reposition: "account", 
    account: accName 
  };
  payload["lastSelectedAccountByNetwork_"+activeNetworkInfo.name] = accName 
  localStorageSet(payload)
  //checkConnectOrDisconnect();
  autoRefresh()
}


// page init

function initPage() {
  d.onClickId("assets-list", showAssetDetailsClicked);
  d.onClickId("account-history-details", historyLineClicked);

  // icon bar
  d.onClickId("receive", receiveClicked);
  d.onClickId("send", sendClicked);
  d.onClickId("stake", stakeClicked);
  //d.onClickId("acc-connect-to-page", connectToWebAppClicked);
  //d.onClickId("acc-disconnect-to-page", disconnectFromPageClicked);

  // more tab
  d.onClickId("list-pools", listPoolsClicked);
  d.onClickId("add", addClicked);
  d.onClickId("show-public-key", showPublicKeyClicked);
  d.onClickId("show-private-key", showPrivateKeyClicked);
  d.onClickId("remove-private-key", removePrivateKeyClicked);
  d.onClickId("remove-account", removeAccountClicked);
  d.onClickId("add-note", addNoteClicked);
  d.onClickId("detailed-rewards", detailedRewardsClicked);
  d.onClickId("explore", exploreButtonClicked);
  d.onClickId("search-pools", searchMoreAssetsButtonClicked);
  //d.onClickId("address-book-button", showAddressBook);

  //d.onClickId("refresh-button", refreshSelectedAcc);
  d.onClickId("topbar-left-button", selectAccountPopupList);
  d.onClickId("delete-account", DeleteAccount);

  // liquid/delayed stake
  d.onClickId("one-tab-stake", selectFirstTab);
  d.onClickId("two-tab-stake", selectSecondTab);
  d.onClickId("show-password-request", showPassword);

  seedTextElem = new d.El("#seed-phrase");

  // select account button
  document.querySelector("#topbar-left-button")?.classList.remove("hidden");

  OkCancelInit();

  var target = document.querySelector("#usd-price-link");
  target?.addEventListener("usdPriceReady", usdPriceReady);
}

// shows drop-down with wallet accounts
export async function selectAccountPopupList() {
  const items = await getAccountsForPopupList()
  //show and what to do when clicked
  popupListOpen(items, popupListAddressClicked, popupListAddressEscaped)
}
async function popupListAddressClicked(text: string, value: string) {
  if (!value) return;
  await show(value, undefined);
}
async function popupListAddressEscaped() {
  Main.show();
}

function backLinkClicked() {
  Main.backToMainPage();
  hideOkCancel();
}

export function historyLineClicked(ev: Event) {
  if (ev.target && ev.target instanceof HTMLElement) {
    const li = ev.target.closest("li");
    if (li) {
      navigator.clipboard.writeText(li.innerText);
      d.showMsg("copied", "info", 1000);
    }
  }
}

export async function refreshSelectedAccountAndAssets() {

  // save because user can set selectedAccountData.name="" (by going to the account list) in the middle of the refresh
  const accName = selectedAccountData.name
  const accInfo = selectedAccountData.accountInfo

  if (accName == "" || accInfo.network !== activeNetworkInfo.name) {
    // exit if no acc selected or network changed
    return;
  }

  await selectedAccountData.refreshLastBalance()
  updateAccountHeaderDOM();

  await getNarwalletsMetrics()

  for (let asset of accInfo.assets) {
    if (d.activePage !== "account-selected" && d.activePage !== "AccountAssetDetail") {
      // user left account-selected+assets page
      break;
    }
    await assetUpdateBalance(asset, accName)
    // update balance on-screen
    const assetId = assetDivId(asset)
    Main.updateScreenNum(`#assets-list [id='${assetId}'] .accountassetbalance`, asset.balance)
    Main.updateScreen(`#assets-list [id='${assetId}'] .accountassetfiat`, getUsdValue(asset))
    if (Main.lastSelectedAsset && asset.contractId == Main.lastSelectedAsset.contractId && asset.symbol == Main.lastSelectedAsset.symbol) {
      // only update amount
      const el = document.querySelector("#selected-asset #balance") as HTMLElement;
      if (el) {
        el.innerText = c.toStringDec(asset.balance);
        if (nearDollarPrice) {
          usdPriceReady();
        }
      }
    }
  }
  // save updated info (even if partial)
  await askBackgroundSetAccount(accName, accInfo);

}

// async function refreshSelectedAcc() {
//   await refreshSelectedAccountAndAssets();
//   showInitial();
//   d.showSuccess("Refreshed");
// }

export async function usdPriceReady() {
  if (selectedAccountData == undefined) return;
  if (selectedAccountData.total) selectedAccountData.totalUSD = selectedAccountData.total * nearDollarPrice;
  const elems = d.all(".accountdetsfiat")
  elems.innerText = c.toStringDec(selectedAccountData.totalUSD, 2);
  elems.show()
  if (Main.lastSelectedAsset) {
    let assetUsdValue = getUsdValue(Main.lastSelectedAsset)
    // if (Pages.lastSelectedAsset.balance != undefined) {
    //   if (Pages.lastSelectedAsset.symbol == "STNEAR") {
    //     await getNarwalletsMetrics()
    //     if (narwalletsMetrics) assetUsdValue = Pages.lastSelectedAsset.balance * narwalletsMetrics.st_near_price * nearDollarPrice;
    //   }
    //   else if (Pages.lastSelectedAsset.symbol == "STAKED"
    //     || Pages.lastSelectedAsset.symbol == "UNSTAKED"
    //     || Pages.lastSelectedAsset.symbol == "wNEAR"
    //   ) {
    //     assetUsdValue = Pages.lastSelectedAsset.balance * nearDollarPrice;
    //   }
    // }
    const elems = d.all(".asset_in_usd")
    elems.innerText = assetUsdValue;
    elems.show()
  }
}


function selectFirstTab() {
  stakeTabSelected = 1;
}

function selectSecondTab() {
  stakeTabSelected = 2;
}

// async function checkConnectOrDisconnect() {
//   var a = await askBackground({
//     code: "isConnected",
//   });
//   const connectButton = d.byId("acc-connect-to-page");
//   const disconnectButton = d.byId("acc-disconnect-to-page");

//   if (a) {
//     disconnectButton.classList.remove("hidden");
//     connectButton.classList.add("hidden");
//   } else {
//     disconnectButton.classList.add("hidden");
//     connectButton.classList.remove("hidden");
//   }
// }

// AssetClicked
function showAssetDetailsClicked(ev: Event) {
  if (ev.target && ev.target instanceof HTMLElement) {
    const li = ev.target.closest("li");
    if (li) {
      let assetIndex = -1;
      let inx = 0;
      for (let item of selectedAccountData.accountInfo.assets) {
        if (li.id == assetDivId(item)) {
          assetIndex = inx;
          break;
        }
        inx++;
      }
      if (assetIndex == -1) return;
      AssetSelected_show(assetIndex);
    }
  }
}

function addClicked() {
  d.showSubPage("add-subpage");
  d.onClickId("token-combo-select", selectTokenClicked);
  showOKCancel(addOKClicked, switchToAssetsSupbage);
}

export function getKnownNEP141Contracts(): PopupItem[] {
  if (activeNetworkInfo.name == "testnet") {
    return [
      { text: "stNEAR - meta-v2.pool.testnet", value: "meta-v2.pool.testnet" },
      { text: "$META - token.meta.pool.testnet", value: "token.meta.pool.testnet" },
      { text: "CHDR - token.cheddar.testnet", value: "token.cheddar.testnet" },
    ]
  } else {
    return [
      { text: "stNEAR - meta-pool.near", value: "meta-pool.near" },
      { text: "$META - meta-token.near", value: "meta-token.near" },
      { text: "REF - ref.finance", value: "token.v2.ref-finance.near" },
      { text: "xREF - ref.finance", value: "xtoken.ref-finance.near" },
      { text: "Paras - token.paras.near", value: "token.paras.near" },
      { text: "wNEAR - wrap.near", value: "wrap.near" },
      { text: "nWBTC- (bridged)", value: "2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near" },
      { text: "nUSDT- (bridged)", value: "dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near" },
      { text: "nUSDC- (bridged)", value: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near" },
      { text: "nDAI - (bridged)", value: "6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near" },
      { text: "nUNI - (bridged)", value: "1f9840a85d5af5bf1d1762f925bdaddc4201f984.factory.bridge.near" },
      { text: "nLINK- (bridged)", value: "514910771af9ca656af840dff83e8264ecf986ca.factory.bridge.near" },
      { text: "BANANA - berryclub.ek.near", value: "berryclub.ek.near" },
      { text: "DBIO - dbio.near", value: "dbio.near" },
      { text: "OCT - Octopus Network (bridged)", value: "f5cfbc74057c610c8ef151a439252680ac68c6dc.factory.bridge.near" },
      { text: "USN", value: "usn" },

    ]
  }
}

// shows drop-down with tokens
async function selectTokenClicked() {
  const items = getKnownNEP141Contracts()
  // open popup, with what to show and what to do when clicked
  popupListOpen(items, tokenPopupListItemClicked)
}
export function tokenPopupListItemClicked(text: string, value: string) {
  d.inputById("token-to-add-name").value = value
}


async function addOKClicked() {
  disableOKCancel();
  d.showWait();
  try {
    let contractValue = d.inputById("token-to-add-name").value;
    if (!contractValue) {
      throw new Error("Contract ID empty");
    }
    let list =
      document.querySelector("#token-items")?.children || [];

    for (let i = 0; i < list?.length || 0; i++) {
      let element = list[i] as HTMLOptionElement;

      if (contractValue == (element as HTMLOptionElement).value) {
        contractValue =
          element.attributes.getNamedItem("data-contract")?.value ||
          contractValue;
        break;
      }
    }

    selectedAccountData.accountInfo.assets.forEach((element) => {
      if (element.contractId == contractValue) {
        throw new Error("Asset already exist");
      }
    });

    const asset = await addAssetToken(contractValue);
    await refreshSaveSelectedAccount();
    enableOKCancel();
    d.showSuccess("Added Token: " + asset.symbol);
    hideOkCancel();
  } catch (ex) {
    d.showErr(ex);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

export async function addAssetToken(contractId: string): Promise<Asset> {
  let item = await newTokenFromMetadata(contractId)
  await assetUpdateBalance(item, selectedAccountData.name)
  selectedAccountData.accountInfo.assets.push(item);
  return item;
}

async function selectAndShowAccount(accName: string) {
  
  // set as MRU
  askBackground({
    code: "set-account-order",
    accountId: accName,
    order: Date.now(),
  }).catch(); //ignore if error
  
  const accInfo = await askBackgroundGetAccountRecordCopy(accName);
  if (!accInfo) throw new Error("Account is not in this wallet: " + accName);

  // get balance from chain (launch async)
  selectedAccountData = new ExtendedAccountData(accName, accInfo);
  Main.setLastSelectedAccount(selectedAccountData);

  showSelectedAccount();
}

function assetSorter(asset1: Asset, asset2: Asset): number {
  return (asset2.balance || 0) - (asset1.balance || 0)
  // const contractIdCompare = asset1.contractId.localeCompare(asset2.contractId);
  // if (contractIdCompare != 0) {
  //   return contractIdCompare;
  // } else {
  //   return asset1.symbol.localeCompare(asset2.symbol);
  // }
}

type DivIdField = { divId: string };

export function getUsdValue(asset: Asset): string {
  if (!nearDollarPrice || !asset.balance) return "";
  let assetUsdValue;
  if (asset.symbol == "STNEAR" && narwalletsMetrics) {
    assetUsdValue = asset.balance * narwalletsMetrics.st_near_price * nearDollarPrice;
  }
  else if (asset.symbol == "$META" && narwalletsMetrics) {
    assetUsdValue = asset.balance * narwalletsMetrics.ref_meta_price * narwalletsMetrics.st_near_price * nearDollarPrice;
  }

  else if (asset.symbol == "STAKED"
    || asset.symbol == "UNSTAKED"
    || asset.symbol == "wNEAR"
  ) {
    assetUsdValue = asset.balance * nearDollarPrice;
  }
  else {
    return "";
  }

  return c.toStringDec(assetUsdValue, 2) + " usd";
}

export function populateAssets() {
  // sort assets
  selectedAccountData.accountInfo.assets.sort(assetSorter);
  //hide assets with 0 balance
  let assetList: (Asset & DivIdField)[] = [];
  // add divId field on the fly
  for (let item of selectedAccountData.accountInfo.assets) {
    // note do not filter for asset.balance==0, it's confusing because the user do not sees the asset
    let object = {};
    Object.assign(object, item);
    const extended = object as (Asset & DivIdField & { usdvalue: string });
    extended.divId = assetDivId(item)
    extended.usdvalue = getUsdValue(item)
    const staleSeconds =
      (extended.symbol == "STAKED" || extended.symbol == "UNSTAKED") ? 30 * 60 : // 30 minutes staked/unstaked balance considered valid
        60;
    if (extended.balanceTimestamp == undefined || extended.balanceTimestamp < Date.now() - staleSeconds * 1000) {
      extended.balance = undefined;
    }
    assetList.push(extended);
  }
  const TEMPLATE = `
    <div class="asset-item" id="{divId}">
    <div class="accountdetsassets">
      <div class="accountasseticon">{icon}</div>
      <span class="accountassetcoin">{symbol}</span>
      <div class="accountassettoken">{contractId}</div>
      <div class="accountassetbalance">{balance}</div>
      <div class="accountassetfiat">{usdvalue}</div>
    </div>
  </div>
  `;
  d.clearContainer("assets-list");
  d.populateUL(
    "assets-list",
    TEMPLATE,
    assetList
  );
}


/**
 * only update data in-place(do not rebuild the DOM components)
 */
function updateAccountHeaderDOM() {

  // only update amount
  const el = document.querySelector("#selected-account .accountdetsbalance") as HTMLElement;
  if (el) {
    el.innerText = c.toStringDec(selectedAccountData.total);
    if (selectedAccountData.isLockup && selectedAccountData.accountInfo.lockedOther > 0) {
      el.innerText = el.innerText + ` (${c.toStringDec(selectedAccountData.accountInfo.lockedOther)} locked)`
      el.classList.add("small")
    }
    else {
      el.classList.remove("small")
    }
  }

  if (nearDollarPrice) {
    usdPriceReady();
  }

}

// re-renders SelectedAccountHeader
function renderSelectedAccountHeader() {

  const SELECTED_ACCOUNT = "selected-account";
  const TEMPLATE = `
    <div>
      <div class="accountdetscuenta">
        {name}
      </div>
      <div class="accountdetscomment">
        {accountInfo.note}
      </div>
      <div class="assetdetcontract">NEAR
      </div>
      <div class="accountdetsbalance balance">{total}</div>
      <div class="accountdetsfiat hidden">
        {totalUSD}
      </div>
    </div>
    `

  d.clearContainer(SELECTED_ACCOUNT);
  d.appendTemplateLI(
    SELECTED_ACCOUNT,
    TEMPLATE,
    selectedAccountData
  );
  updateAccountHeaderDOM();

}


//
// shows a specific account and its assets
//
function showSelectedAccount() {

  if (selectedAccountData.name == "") return;

  //make sure available is up to date before displaying
  selectedAccountData.recomputeTotals()

  // fast update to erase previous data
  updateAccountHeaderDOM();
  renderSelectedAccountHeader();

  // fill assets list
  populateAssets();
  switchToAssetsSupbage()

  // fill account activity list
  d.clearContainer("account-history-details");
  d.populateUL(
    "account-history-details",
    ASSET_HISTORY_TEMPLATE,
    historyWithIcons(selectedAccountData.accountInfo.history)
  );

  // start a refresh of assets balances from chain
  refreshSelectedAccountAndAssets()
}

type StateResult = {
  amount: string;
  block_hash: string;
  block_height: number;
  code_hash: string;
  locked: string;
  storage_paid_at: number;
  storage_usage: number;
};

function listPoolsClicked() {
  d.inputById("stake-with-staking-pool").value = "";
  localStorageSet({ reposition: "stake", account: selectedAccountData.name });
  chrome.windows.create({
    url: chrome.runtime.getURL("outside/list-pools.html"),
    state: "maximized",
  });
}

export async function accountHasPrivateKey(): Promise<boolean> {
  if (selectedAccountData.isLockup) {
    if (!selectedAccountData.accountInfo.ownerId) {
      throw Error("Owner is unknown. Try importing the owner account");
    }
    const ownerInfo = await askBackgroundGetAccountRecordCopy(
      selectedAccountData.accountInfo.ownerId
    );
    if (!ownerInfo) throw Error("The owner account is not in this wallet");
    if (!ownerInfo.privateKey) {
      throw Error(
        "You need full access on the owner account: " +
        selectedAccountData.accountInfo.ownerId +
        " to operate this lockup account"
      );
    }
    return true;
  } else {
    //normal account
    return selectedAccountData.isFullAccess;
  }
}

function GotoOwnerOkHandler() {
  const owner = selectedAccountData.accountInfo.ownerId;
  if (owner) {
    show(owner, undefined);
    d.showWarn("Attention: You're now at " + owner);
  }
}

function showGotoOwner() {
  if (selectedAccountData.accountInfo.ownerId) {
    d.byId("account-selected-open-owner-name").innerText =
      selectedAccountData.accountInfo.ownerId;
    d.showSubPage("account-selected-open-owner");
    showOKCancel(GotoOwnerOkHandler, switchToAssetsSupbage);
  }
}

export function ifNormalAccShowGrantAccessSubPage() {
  if (!selectedAccountData.isLockup) {
    d.showSubPage("account-selected-ok-to-grant-access");
    showOKCancel(askPrivateKey, switchToAssetsSupbage);
  }
}

function receiveClicked() {
  d.showSubPage("account-selected-receive");
  d.byId("account-selected-receive-name").innerText = selectedAccountData.name;
  showOKCancel(switchToAssetsSupbage, switchToAssetsSupbage);
  showGotoOwner(); //if this is a lock.c shows the "goto owner" page
}

// //--------------------------------
// export async function connectToWebAppClicked(): Promise<any> {
//   d.showWait();
//   try {
//     await askBackground({
//       code: "connect",
//       accountId: selectedAccountData.name,
//     });
//     d.showSuccess("connected");
//     window.close();
//   } catch (ex) {
//     d.showErr(ex.message);
//   } finally {
//     await checkConnectOrDisconnect();
//     d.hideWait();
//   }
// }
//--------------------------------
// async function disconnectFromPageClicked() {
//   try {
//     await askBackground({ code: "disconnect" });
//     d.showSuccess("disconnected");
//     const buttonClass = d.byId("acc-connect-to-page");
//     buttonClass.classList.remove("disconnect");
//     buttonClass.classList.add("connect");
//   } catch (ex) {
//     d.showErr(ex.message);
//   } finally {
//     await checkConnectOrDisconnect();
//   }
// }

//--------------------------------
// deprecated, use AccountHasPrivateKey
// async function checkOwnerAccessThrows(action: string) {
//   //check if we have owner's key
//   const info = selectedAccountData.accountInfo;
//   if (info.ownerId) {
//     const owner = await getAccountRecord(info.ownerId);
//     if (!owner || !owner.privateKey) {
//       showGotoOwner();
//       throw Error(
//         "You need full access on " +
//         info.ownerId +
//         " to " +
//         action +
//         " from this " +
//         selectedAccountData.typeFull
//       );
//     }
//   }
// }

//----------------------
async function sendClicked() {
  try {

    if (!(await accountHasPrivateKey())) {
      ifNormalAccShowGrantAccessSubPage();
      return;
    }

    hideOkCancel();

    let maxAmountToSend = selectedAccountData.available;

    //if it's a lock.c and we didn't add a priv key yet, consider lockup contract limits
    if (
      selectedAccountData.isLockup &&
      !selectedAccountData.accountInfo.privateKey
    ) {
      maxAmountToSend = selectedAccountData.unlockedOther;
    }
    const amountLockedMsg = selectedAccountData.accountInfo.lockedOther ? " (" + selectedAccountData.accountInfo.lockedOther + " is locked)" : "";
    //if (amountLockedMsg!=="") console.log(amountLockedMsg)
    //check amount
    if (maxAmountToSend <= 0) {
      d.showErr("Not enough balance to send" + amountLockedMsg);
    } else {
      //d.byId("max-amount-send").innerText = c.toStringDec(maxAmountToSend);
      d.onClickId("send-max", function () {
        d.maxClicked(
          "send-to-account-amount",
          "#account-selected .accountdetsbalance",
          selectedAccountData.accountInfo.lockedOther
        );
      });
      d.showSubPage("account-selected-send");
      popupComboConfigure("send-to-account-name", "send-to-account-name-dropdown", selectAddressClicked)
      d.onEnterAndAmount("send-to-account-amount", sendOKClicked)
      showOKCancel(sendOKClicked, switchToAssetsSupbage, false);
    }
  } catch (ex) {
    d.showErr(ex.message);
  }
}

// shows drop-down with addresses
async function selectAddressClicked() {
  const items = await getAddressesForPopupList()
  //show and what to do when clicked
  popupListOpen(items, popupListItemClicked)
}
function popupListItemClicked(text: string, value: string) {
  d.inputById("send-to-account-name").value = value
}

//----------------------
/**
 * Send NEAR native coin, pre-confirmation
 */
async function sendOKClicked() {
  try {
    //validate
    const toAccName = new d.El("#send-to-account-name").value;
    if (!isValidAccountID(toAccName)) {
      throw Error("Receiver Account Id is invalid");
    }
    const amountToSend = d.getNumber("#send-to-account-amount");
    CheckValidAmount(amountToSend)

    //select send procedure
    let performer;
    let maxAvailable;
    // if it's a lock.c and we didn't add a priv key yet, use contract method "transfer" (performLockupContractSend)
    if (
      selectedAccountData.isLockup &&
      !selectedAccountData.accountInfo.privateKey
    ) {
      performer = performLockupContractSend;
      maxAvailable = selectedAccountData.unlockedOther;
    } else {
      if (selectedAccountData.isReadOnly) throw Error("Account is read-only");
      performer = performSend; //default send directly from account
      maxAvailable = selectedAccountData.available;
    }

    if (amountToSend > maxAvailable) {
      throw Error("Amount exceeds available balance");
    }

    //show confirmation subpage
    d.showSubPage("account-selected-send-confirmation");
    d.byId("send-confirmation-amount").innerText = c.toStringDec(amountToSend);
    d.byId("send-confirmation-receiver").innerText = toAccName;

    showOKCancel(performer, switchToAssetsSupbage); //on OK clicked, send
  } catch (ex) {
    d.showErr(ex.message);
  }
}

//----------------------
/**
 * Send NEAR native execute
 */
async function performSend() {
  try {
    const toAccName = d.byId("send-confirmation-receiver").innerText;
    const amountToSend = c.toNum(d.byId("send-confirmation-amount").innerText);

    disableOKCancel();
    d.showWait();

    await askBackgroundTransferNear(
      selectedAccountData.name,
      toAccName,
      c.ntoy(amountToSend)
    );
    // Note: The popup window & process can be terminated by chrome while waiting,
    // if the user clicks elsewhere in the page.
    // You can not rely on the code below being executed

    // re-select, get new history from background, refresh balances, render data
    await selectAndShowAccount(selectedAccountData.name);

    // if dest account is in the wallet, refresh balance too
    const destAccInfo = await askBackgroundGetAccountRecordCopy(toAccName);
    if (destAccInfo) {
      // refresh dest account balance from chain - do not await for it
      asyncRefreshAccountInfoLastBalance(toAccName, destAccInfo);
    }

    d.showSuccess("Success: " + selectedAccountData.name + " transferred " + c.toStringDec(amountToSend) + "\u{24c3} to " + toAccName);
    await accountCheckContactList(toAccName);
  }
  catch (ex) {
    d.showErr(ex.message);
  }
  finally {
    d.hideWait();
    enableOKCancel();
  }
}
//----------------------
async function performLockupContractSend() {
  try {
    disableOKCancel();
    d.showWait();

    const info = selectedAccountData.accountInfo;
    if (!info.ownerId) throw Error("unknown ownerId");

    const owner = await askBackgroundGetAccountRecordCopy(info.ownerId);
    if (!owner.privateKey) {
      throw Error("you need full access on " + info.ownerId);
    }

    const toAccName = d.byId("send-confirmation-receiver").innerText;
    const amountToSend = c.toNum(d.byId("send-confirmation-amount").innerText);

    const lc = new LockupContract(info);
    await lc.computeContractAccount();
    await lc.transfer(amountToSend, toAccName);

    d.showSuccess("Success: " + selectedAccountData.name + " transferred " + c.toStringDec(amountToSend) + "\u{24c3} to " + toAccName);

    //displayReflectTransfer(amountToSend, toAccName);

    await refreshSelectedAccountAndAssets();

    await accountCheckContactList(toAccName);
  }
  catch (ex) {
    d.showErr(ex.message);
  }
  finally {
    d.hideWait();
    enableOKCancel();
  }
}

//----------------------
async function accountCheckContactList(address: string) {
  if (await contactExists(address)) {
    switchToAssetsSupbage();
    hideOkCancel();
  } else {
    d.showSubPage("sure-add-contact");
    d.byId("add-confirmation-name").innerText = address.trim();
    showOKCancel(addContactToList, switchToAssetsSupbage);
  }
}

async function addContactToList() {
  try {
    const contactToSave: GContact = {
      accountId: new d.El("#send-to-account-name").value,
      note: new d.El("#add-contact-note").value,
    };
    await saveContactOnBook(contactToSave.accountId, contactToSave);
    switchToAssetsSupbage();
  } catch {
    d.showErr("Error in save contact");
  } finally {
    hideOkCancel();
  }
}

//----------------------
async function stakeClicked() {
  try {
    if (!(await accountHasPrivateKey())) {
      ifNormalAccShowGrantAccessSubPage();
      return;
    }

    // create asset
    selectFirstTab();
    const info = selectedAccountData.accountInfo;
    const stakeAmountBox = d.inputById("stake-amount");
    let performer = performStake; //default
    let amountToStake = selectedAccountData.unlockedOther;
    let removeFromMax = 0.1

    let lc: LockupContract | undefined = undefined;
    if (selectedAccountData.isLockup) {
      lc = new LockupContract(selectedAccountData.accountInfo);
      await lc.computeContractAccount();
      if (! await lc.tryRetrieveInfo()) {
        throw Error("error getting lockup account info")
      }
      amountToStake = c.yton(lc.accountBalanceYoctos);
      removeFromMax = 0
      performer = performLockupContractStake;
    }

    if (amountToStake < 0) amountToStake = 0;

    d.showSubPage("account-selected-stake");
    showOKCancel(performer, switchToAssetsSupbage);

    if (selectedAccountData.isLockup && lc) {
      stakeAmountBox.value = c.ytonFull(lc.accountBalanceYoctos)
      //d.qs("#max-stake-amount-2-label").innerText = stakeAmountBox.value;
      stakeAmountBox.disabled = true;
      stakeAmountBox.classList.add("semi-transparent");
    }
    else {
      stakeAmountBox.disabled = false;
      stakeAmountBox.classList.remove("semi-transparent");

      d.qs("#liquid-stake-radio").el.checked = true;
      d.inputById("stake-with-staking-pool").value = "";
      // d.qs("#max-stake-amount-1").innerText = c.toStringDec(
      //   Math.max(0, amountToStake - removeFromMax)
      // );
      // d.qs("#max-stake-amount-2-label").innerText = c.toStringDec(
      //   Math.max(0, amountToStake - removeFromMax)
      // );
      d.onClickId("liquid-stake-max", function () {
        d.maxClicked(
          "stake-amount-liquid",
          "#account-selected .accountdetsbalance",
          removeFromMax
        );
      });
      d.onClickId("max-stake-amount-2-button", function () {
        d.maxClicked(
          "stake-amount",
          "#account-selected .accountdetsbalance",
          removeFromMax
        );
      });

    }

  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

export async function saveSelectedAccount(): Promise<any> {
  if (selectedAccountData.name !== "") {
    return askBackgroundSetAccount(
      selectedAccountData.name,
      selectedAccountData.accountInfo
    );
  }
}

//----------------------
async function performStake() {
  //normal accounts

  disableOKCancel();
  d.showWait();
  let newStakingPool: string;
  try {
    let amountToStake: number;
    let existAssetWithThisPool = false;

    const liquidStake = stakeTabSelected == 1;
    if (liquidStake) {
      newStakingPool = activeNetworkInfo.liquidStakingContract;
      amountToStake = c.toNum(d.inputById("stake-amount-liquid").value);
    } else {
      newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
      amountToStake = c.toNum(d.inputById("stake-amount").value);
    }
    if (!isValidAccountID(newStakingPool)) {
      throw Error("Staking pool Account Id is invalid");
    }
    if (!selectedAccountData.isFullAccess) {
      throw Error("you need full access on " + selectedAccountData.name);
    }

    //const amountToStake = info.lastBalance - info.staked - 36
    CheckValidAmount(amountToStake)
    if (liquidStake && amountToStake < 1) {
      throw Error("Stake at least 1 NEAR");
    }

    let poolAccInfo = {
      //empty info
      account_id: "",
      unstaked_balance: "0",
      staked_balance: "0",
      can_withdraw: false,
    };

    if (c.yton(poolAccInfo.unstaked_balance) >= 10) {
      //at least 10 deposited but unstaked, stake that
      //just re-stake (maybe the user asked unstaking but now regrets it)
      const amountToStakeY = fixUserAmountInY(
        amountToStake,
        poolAccInfo.unstaked_balance
      );
      if (amountToStakeY == poolAccInfo.unstaked_balance) {
        await askBackgroundCallMethod(
          newStakingPool,
          "stake_all",
          {},
          selectedAccountData.name
        );
      } else {
        await askBackgroundCallMethod(
          newStakingPool,
          "stake",
          { amount: amountToStakeY },
          selectedAccountData.name
        );
        //await near.call_method(newStakingPool, "stake", {amount:amountToStakeY}, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
      }
    } else {
      //no unstaked funds
      //deposit and stake
      await askBackgroundCallMethod(
        newStakingPool,
        "deposit_and_stake",
        {},
        selectedAccountData.name,
        c.TGas(75),
        c.ntoy(amountToStake)
      );

      let newBalance;
      if (stakeTabSelected == 1) {
        let metaPoolResult = await askBackgroundViewMethod(
          newStakingPool,
          "get_account_info",
          { account_id: selectedAccountData.name }
        );
        newBalance = metaPoolResult.st_near;
      } else {
        poolAccInfo = await StakingPool.getAccInfo(
          selectedAccountData.name,
          newStakingPool
        );
        newBalance = poolAccInfo.staked_balance;
      }

      let hist = new History(
        liquidStake ? "liquid-stake" : "stake",
        amountToStake,
        newStakingPool
      );

      let foundAsset: Asset = new Asset();
      selectedAccountData.accountInfo.assets.forEach((asset) => {
        if (asset.symbol != "UNSTAKED" && asset.contractId == newStakingPool) {
          existAssetWithThisPool = true;
          foundAsset = asset;
        }
      });

      if (existAssetWithThisPool) {
        foundAsset.history.unshift(hist);
        setAssetBalanceYoctos(foundAsset, newBalance);
      } else {
        let asset = new Asset(
          newStakingPool,
          "stake",
          stakeTabSelected == 1 ? "STNEAR" : "STAKED",
          stakeTabSelected == 1 ? STNEAR_SVG : STAKE_DEFAULT_SVG
        );
        setAssetBalanceYoctos(asset, newBalance)
        asset.history.unshift(hist);
        selectedAccountData.accountInfo.assets.push(asset);
      }

      // add account history
      if (!selectedAccountData.accountInfo.history) {
        selectedAccountData.accountInfo.history = [];
      }
      selectedAccountData.accountInfo.history.unshift(hist);

      // await near.call_method(newStakingPool, "deposit_and_stake", {},
      //     selectedAccountData.name,
      //     selectedAccountData.accountInfo.privateKey,
      //     near.ONE_TGAS.muln(125),
      //     amountToStake
      // )
    }

    //update staked to avoid incorrect "rewards" calculations on refresh
    // selectedAccountData.accountInfo.staked += amountToStake;
    // selectedAccountData.total -= selectedAccountData.total;
    // selectedAccountData.totalUSD = selectedAccountData.total * 4.7;
    //refresh status & save
    if (selectedAccountData.total) selectedAccountData.total -= amountToStake;
    await refreshSaveSelectedAccount();

    d.showSuccess(`Staked ${amountToStake} NEAR`);
    hideOkCancel();
    switchToAssetsSupbage();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

//----------------------
async function performLockupContractStake() {
  try {
    disableOKCancel();
    d.showWait();

    const newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
    if (!isValidAccountID(newStakingPool)) {
      throw Error("Staking pool Account Id is invalid");
    }

    const info = selectedAccountData.accountInfo;
    if (!info.ownerId) throw Error("unknown ownerId");

    const owner = await askBackgroundGetAccountRecordCopy(info.ownerId);
    if (!owner.privateKey) {
      throw Error("you need full access on " + info.ownerId);
    }

    const amountText = d.inputById("stake-amount").value
    const amountToStake = c.toNum(amountText);
    CheckValidAmount(amountToStake)
    const liquidStake = stakeTabSelected == 1;
    if (liquidStake && amountToStake < 1) {
      throw Error("Stake at least 1 NEAR");
    }

    const lc = new LockupContract(info);
    await lc.computeContractAccount();
    await lc.stakeWith(selectedAccountData, newStakingPool, amountText.replace(".", "")); //amount in yoctos

    selectedAccountData.accountInfo.history.push(
      new History("STAKE", amountToStake, newStakingPool)
    )

    let asset = findAsset(selectedAccountData.accountInfo, newStakingPool, "STAKED")
    if (!asset) {
      asset = new Asset(
        newStakingPool,
        "stake",
        "STAKED",
        STAKE_DEFAULT_SVG
      );
      selectedAccountData.accountInfo.assets.push(asset);
    }
    if (asset.balance != undefined) asset.balance += amountToStake;


    //refresh status
    await refreshSaveSelectedAccount();

    d.showSuccess(`Staked ${amountToStake} NEAR`);
    switchToAssetsSupbage();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

// OBSOLETE now, not being called - Unstake is made from the Asset
// //-------------------------------------
// async function unstakeClicked() {
//   try {
//     if (!(await accountHasPrivateKey())) {
//       showGrantAccessSubPage();
//       return;
//     }

//     d.showWait();
//     const info = selectedAccountData.accountInfo;
//     let performer = performUnstake; //default
//     const amountBox = d.inputById("unstake-amount");
//     const optionWU = d.qs("#option-unstake-withdraw");
//     d.byId("unstake-from-staking-pool").innerText = "";
//     optionWU.hide();
//     if (info.type == "lock.c") {
//       //lockup - always full amount
//       d.qs("#unstake-ALL-label").show();
//       await checkOwnerAccessThrows("unstake");
//       performer = performLockupContractUnstake;
//       amountBox.disabled = true;
//       amountBox.classList.add("semi-transparent");
//     } else {
//       //normal account can choose amounts
//       d.qs("#unstake-ALL-label").hide();
//       amountBox.disabled = false;
//       amountBox.classList.remove("semi-transparent");
//     }

//     //---refresh first
//     await refreshSaveSelectedAccount();

//     // if (!selectedAccountData.accountInfo.stakingPool) {
//     //   showButtons();
//     //   throw Error("No staking pool associated whit this account. Stake first");
//     // }

//     let amountForTheField;
//     let amountToWithdraw = selectedAccountData.unlockedOther;
//     if (amountToWithdraw > 0) {
//       d.inputById("radio-withdraw").checked = true;
//       amountForTheField = amountToWithdraw;
//     } else {
//       d.inputById("radio-unstake").checked = true;
//       //amountForTheField = selectedAccountData.accountInfo.staked;
//       //if (amountForTheField == 0) throw Error("No funds on the pool");
//     }
//     if (info.type != "lock.c") optionWU.show();

//     //d.byId("unstake-from-staking-pool").innerText = info.stakingPool || "";
//     //d.inputById("unstake-amount").value = c.toStringDec(amountForTheField);
//     d.showSubPage("account-selected-unstake");
//     showOKCancel(performer, showInitial);
//   } catch (ex) {
//     d.showErr(ex.message);
//   } finally {
//     d.hideWait();
//     enableOKCancel();
//   }
// }

//-----------------------
export function fixUserAmountInY(amount: number, yoctosMax: string): string {
  let yoctosResult = yoctosMax; //default => all
  if (amount + 0.001 <= c.yton(yoctosResult)) {
    yoctosResult = c.ntoy(amount); //only if it's less of what's available, we take the input amount
  } else if (amount > 0.001 + c.yton(yoctosMax)) {
    //only if it's +1 above max
    throw Error("Max amount is " + c.toStringDec(c.yton(yoctosMax)));
    //----------------
  }
  return yoctosResult;
}

async function performUnstake() {
  //normal accounts
  try {
    disableOKCancel();
    d.showWait();

    const modeWithdraw = d.inputById("radio-withdraw").checked;
    const modeUnstake = !modeWithdraw;

    const amount = c.toNum(d.inputById("unstake-amount").value);
    CheckValidAmount(amount)

    if (!selectedAccountData.isFullAccess)
      throw Error("you need full access on " + selectedAccountData.name);

    if (modeWithdraw) {
      d.showSuccess("Unstake requested, you must wait (36-48hs) to withdraw");
    }

    //refresh status
    await refreshSaveSelectedAccount();

    switchToAssetsSupbage();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}


// function displayReflectTransfer(amountNear: number, dest: string) {
//   //sender and receiver .accountInfo.lastBalance are async updated and saved by background.ts function reflectTransfer()
//   //here we only refresh displayed account data
//   if (amountNear == 0) return;
//   selectedAccountData.accountInfo.lastBalance -= amountNear;
//   selectedAccountData.available -= amountNear;
//   selectedAccountData.total -= amountNear;

//   showSelectedAccount();
// }


async function exploreButtonClicked() {
  localStorageSet({ reposition: "account", account: selectedAccountData.name });
  chrome.windows.create({
    url: activeNetworkInfo.explorerUrl + "accounts/" + selectedAccountData.name,
    state: "maximized",
  });
}

async function detailedRewardsClicked() {
  localStorageSet({ reposition: "account", account: selectedAccountData.name });
  if (activeNetworkInfo.name != "mainnet") {
    d.showErr("This function is only available in mainnet");
  } else {
    chrome.windows.create({
      url: "https://near-staking.com/user/" + selectedAccountData.name,
      state: "maximized",
    });
  }
}

//---------------------------------------------
type PoolInfo = {
  name: string;
  slashed: string;
  stake: string;
  stakeY: string;
  uptime: number;
  fee?: number;
};
//---------------------------------------------
export async function searchMoreAssets(exAccData: ExtendedAccountData, includePools: boolean = true) {
  let doingDiv;
  try {
    doingDiv = d.showMsg("Searching Assets...", "info", -1);

    // search tokens
    for (let tokenOption of getKnownNEP141Contracts()) {
      let resultBalanceYoctos;
      try {
        resultBalanceYoctos = await askBackgroundViewMethod(
          tokenOption.value, "ft_balance_of", { account_id: exAccData.name }
        );
      } catch (ex) {
        continue;
      }

      if (resultBalanceYoctos && resultBalanceYoctos != "0") {
        let asset = findAsset(exAccData.accountInfo, tokenOption.value);
        if (asset) {
          setAssetBalanceYoctos(asset, resultBalanceYoctos)
        } else {
          // must create
          let item = await newTokenFromMetadata(tokenOption.value)
          let amount = setAssetBalanceYoctos(item, resultBalanceYoctos);
          exAccData.accountInfo.assets.push(item);
          d.showSuccess(
            `Found! ${c.toStringDec(amount)} ${item.symbol}`
          );
        }
      }
    }

    if (!includePools) return;

    let checked: Record<string, boolean> = {};

    const validators = await askBackgroundGetValidators();
    const allOfThem = validators.current_validators.concat(
      validators.next_validators,
      validators.prev_epoch_kickout,
      validators.current_proposals
    );

    for (let pool of allOfThem) {
      if (!checked[pool.account_id]) {
        doingDiv.innerText = "Pool " + pool.account_id;
        let isStakingPool = true;
        let poolAccInfo;
        try {
          poolAccInfo = await StakingPool.getAccInfo(
            exAccData.name,
            pool.account_id
          );
        } catch (ex) {
          if (
            ex.message.indexOf("cannot find contract code for account") != -1 ||
            ex.message.indexOf(
              "FunctionCallError(MethodResolveError(MethodNotFound))"
            ) != -1
          ) {
            //validator is not a staking pool - ignore
            isStakingPool = false;
          } else {
            //just ignore
            continue;
            //throw (ex)
          }
        }
        checked[pool.account_id] = true;
        if (isStakingPool && poolAccInfo) {
          const amount =
            c.yton(poolAccInfo.unstaked_balance) +
            c.yton(poolAccInfo.staked_balance);
          if (amount > 0) {
            d.showSuccess(
              `Found! ${c.toStringDec(amount)} in ${pool.account_id}`
            );

            // has staked?
            if (c.yton(poolAccInfo.staked_balance) > 0) {
              let asset = findAsset(exAccData.accountInfo, pool.account_id, "STAKED");
              if (asset) {
                setAssetBalanceYoctos(asset, poolAccInfo.staked_balance);
              } else {
                // need to create
                let newAsset = new Asset(
                  pool.account_id,
                  "stake",
                  "STAKED",
                  STAKE_DEFAULT_SVG
                );
                setAssetBalanceYoctos(newAsset, poolAccInfo.staked_balance)
                exAccData.accountInfo.assets.push(newAsset);
              }
            }
            // has unstaked balance?
            if (c.yton(poolAccInfo.unstaked_balance) > 0) {
              let asset = findAsset(exAccData.accountInfo, pool.account_id, "UNSTAKED");
              if (asset) {
                setAssetBalanceYoctos(asset, poolAccInfo.unstaked_balance);
              } else {
                // need to create
                let newAsset = new Asset(
                  pool.account_id,
                  "unstake",
                  "UNSTAKED",
                  UNSTAKE_DEFAULT_SVG
                );
                setAssetBalanceYoctos(newAsset, poolAccInfo.unstaked_balance)
                exAccData.accountInfo.assets.push(newAsset);
              }
            }
          }
        }
      }
    }

  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    doingDiv?.remove();
  }
}

//-------------------------------
async function searchMoreAssetsButtonClicked() {
  d.showWait();
  try {
    await searchMoreAssets(selectedAccountData)
    await saveSelectedAccount()
    await refreshSelectedAccountAndAssets()
  } finally {
    d.hideWait();
  }
}

function getPublicKey(privateKey: string): string {
  const keyPair = KeyPairEd25519.fromString(privateKey);
  return keyPair.getPublicKey().toString();
}

//---------------------------------------
function showPublicKeyClicked() {
  d.hideErr();

  if (selectedAccountData.isReadOnly) {
    //we don't have any key for ReadOnly accounts
    d.showErr("Account is read only");
    d.showSubPage("account-selected-make-full-access");
    showOKCancel(makeFullAccessOKClicked, switchToAssetsSupbage);
  } else {
    //normal acc priv key
    d.showSubPage("account-selected-show-public-key");
    d.byId("account-selected-public-key").innerText = getPublicKey(
      selectedAccountData.accountInfo.privateKey || ""
    );
    showOKCancel(switchToAssetsSupbage, switchToAssetsSupbage);
  }
}

//---------------------------------------
export function showPrivateKeyClicked() {
  d.hideErr();

  if (selectedAccountData.isReadOnly) {
    //we don't have any key for ReadOnly accounts
    d.showErr("Account is read only");
    d.showSubPage("account-selected-make-full-access");
    showOKCancel(makeFullAccessOKClicked, switchToAssetsSupbage);
  } else {
    //normal acc priv key

    d.showSubPage("request-password");
    showOKCancel(showPrivateKeyValidationPasswordClicked, switchToAssetsSupbage);
  }
}

//---------------------------------------
async function showPrivateKeyValidationPasswordClicked() {
  const state = await askBackgroundGetState();
  const inputEmail = state.currentUser;

  //const inputEmail = d.inputById("password-request-email");
  const inputPassword = d.inputById("password-request-password").value;
  try {
    await askBackground({
      code: "unlockSecureState",
      email: inputEmail,
      password: inputPassword,
    });
  } catch (error) {
    d.showErr(error);
    return;
  }
  d.showSubPage("account-selected-show-private-key");
  d.byId("account-selected-private-key").innerText =
    selectedAccountData.accountInfo.privateKey || "";
  showOKCancel(switchToAssetsSupbage, switchToAssetsSupbage);
}


//---------------------------------------
export function startProcessRemovePrivKey() {
  if (selectedAccountData.isFullAccess) {
    d.showSubPage("account-selected-make-read-only");
    d.inputById("account-name-confirm").value = "";
    showOKCancel(makeReadOnlyOKClicked, switchToAssetsSupbage);
  } else {
    d.showErr("Account has no priv key");
  }
}

export function askPrivateKey() {
  d.hideErr();
  seedTextElem.value = "";
  d.showSubPage("account-selected-make-full-access");
  showOKCancel(makeFullAccessOKClicked, switchToAssetsSupbage);
}

//---------------------------------------
function LockupAddPublicKey() {
  if (selectedAccountData.accountInfo.type != "lock.c") {
    d.showErr("Not a lockup contract account");
    return;
  }

  d.hideErr();
  //d.inputById("add-public-key").value = ""
  d.showSubPage("account-selected-add-public-key");
  showOKCancel(AddPublicKeyToLockupOKClicked, switchToAssetsSupbage);
}

//---------------------------------------
function addNoteClicked() {
  d.hideErr();
  d.showSubPage("account-selected-add-note");
  d.inputById("add-note").value = selectedAccountData.accountInfo.note || "";
  showOKCancel(addNoteOKClicked, switchToAssetsSupbage);
}

// function showAddressBook() {
//   isMoreOptionsOpen = false;
//   d.hideErr();
//   AddressBook_show();
// }

async function addNoteOKClicked() {
  d.hideErr();
  selectedAccountData.accountInfo.note = d.inputById("add-note").value.trim();
  await saveSelectedAccount();
  renderSelectedAccountHeader();
  hideOkCancel();
  switchToAssetsSupbage()
}

//---------------------------------------
async function DeleteAccount() {
  d.showWait();
  d.hideErr();
  try {
    if (selectedAccountData.isReadOnly) throw Error("Account is Read-Only");

    await refreshSaveSelectedAccount(); //refresh account to have updated balance

    d.showSubPage("account-selected-delete");
    d.inputById("send-balance-to-account-name").value =
      selectedAccountData.accountInfo.ownerId || ""; // if a lockup account

    d.onClickId("beneficiary-address-combo-select", selectBeneficiaryAddressClicked);

    showOKCancel(AccountDeleteOKClicked, switchToAssetsSupbage);
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

// shows drop-down with addresses
async function selectBeneficiaryAddressClicked() {
  const items = await getAddressesForPopupList()
  //show and what to do when clicked
  popupListOpen(items, (text: string, value: string) => {
    d.inputById("send-balance-to-account-name").value = value
  });
}

//-----------------------------------
async function AccountDeleteOKClicked() {
  if (!selectedAccountData || !selectedAccountData.accountInfo) return;
  try {
    d.showWait();

    if (selectedAccountData.isReadOnly) throw Error("Account is Read-Only");

    const toDeleteAccName = d.inputById("delete-account-name-confirm").value;
    if (toDeleteAccName != selectedAccountData.name)
      throw Error("The account name to delete does not match");

    const beneficiary = d.inputById("send-balance-to-account-name").value;
    if (!beneficiary) throw Error("Enter the beneficiary account");

    let accountExists = await searchAccounts.checkIfAccountExists(beneficiary);
    if (!accountExists) {
      throw Error("Beneficiary Account does not exists");
    }

    const result = await askBackgroundApplyTxAction(
      toDeleteAccName,
      new DeleteAccountToBeneficiary(beneficiary),
      selectedAccountData.name
    );
    d.showSuccess("Account Deleted, remaining funds sent to " + beneficiary);

    hideOkCancel();

    //remove record from wallet
    await removeAccountRecord_and_go_to_account_pages();

  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

//-----------------------------------
async function AddPublicKeyToLockupOKClicked() {
  if (!selectedAccountData || !selectedAccountData.accountInfo) return;
  try {
    d.showWait();
    //const newPubKey = d.inputById("add-public-key").value
    //if (!newPubKey) throw Error("Enter the public key to add")
    const owner = selectedAccountData.accountInfo.ownerId;
    if (!owner) throw Error("Lockup account owner unknown");
    const ownerAcc = await askBackgroundGetAccountRecordCopy(owner);
    const privateKey = ownerAcc.privateKey;
    if (!privateKey) throw Error("Owner Account is Read-Only");

    try {
      const pingTransfer = await askBackgroundCallMethod(
        selectedAccountData.name,
        "check_transfers_vote",
        {},
        owner
      );
    } catch (ex) {
      if (ex.message.indexOf("Transfers are already enabled") != -1) {
        //ok, Transfers are enabled
      } else throw ex;
    }

    const newPubKey = getPublicKey(privateKey);
    const result = await askBackgroundCallMethod(
      selectedAccountData.name,
      "add_full_access_key",
      { new_public_key: newPubKey },
      owner
    );

    d.showSuccess("Public Key added");

    //check if that's a known-key
    const allNetworkAccounts = await askBackgroundAllNetworkAccounts();
    for (let accName in allNetworkAccounts) {
      if (accName != selectedAccountData.name) {
        const accInfo = allNetworkAccounts[accName];
        if (accInfo.privateKey) {
          const thePubKey = getPublicKey(accInfo.privateKey);
          if (thePubKey == newPubKey) {
            selectedAccountData.accountInfo.privateKey = accInfo.privateKey;
            saveSelectedAccount();
            d.showSuccess("Full access added from " + accName);
          }
        }
      }
    }
    switchToAssetsSupbage();
  } catch (ex) {
    if (
      ex.message.indexOf("assertion failed") != -1 &&
      ex.message.indexOf("(left == right)") != -1
    ) {
      ex.message =
        "Err: Locked amount is not 0. Lockup period has not ended yet";
    }
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

let localGlobalAlsoRemoveAccount = false;
//-----------------------------------
async function makeReadOnlyOKClicked() {
  try {
    const confirmAccName = d.inputById("account-name-confirm").value;
    if (confirmAccName != selectedAccountData.name) {
      d.showErr("Names don't match");
    } else {
      selectedAccountData.accountInfo.privateKey = undefined;
      await saveSelectedAccount();
      //selectedAccountData.accessStatus = "Read Only";
      showSelectedAccount();
      d.showMsg(`Account ${localGlobalAlsoRemoveAccount ? "" : "access "} removed`, "success");
      if (localGlobalAlsoRemoveAccount) {
        hideOkCancel();
        removeAccountRecord_and_go_to_account_pages();
      }
      else {
        switchToAssetsSupbage();
        hideOkCancel();
      }
    }
  } catch (ex) {
    d.showErr(ex.message);
  }
}

//----------------------------------
async function makeFullAccessOKClicked() {
  const words = seedTextElem.value;

  disableOKCancel();
  d.showWait();
  try {
    let secretKey, publicKey;
    if (words.startsWith("ed25519:")) {
      //let's assume is a private key
      secretKey = words;
      publicKey = getPublicKey(secretKey);
    } else {
      //a seed phrase
      const seedPhrase = words.trim().split(" ");
      checkSeedPhrase(seedPhrase);
      const result = await parseSeedPhraseAsync(seedPhrase);
      secretKey = result.secretKey;
      publicKey = result.publicKey;
    }

    try {
      let keyFound = await askBackgroundGetAccessKey(
        selectedAccountData.name,
        publicKey
      );
    } catch (ex) {
      let err = ex.message;
      //better explanation
      if (err.indexOf("does not exists") != 0)
        err =
          "Seed phrase was incorrect or is not the seed phrase for this account key";
      throw new Error(err);
    }
    //if key found correctly
    selectedAccountData.accountInfo.privateKey = secretKey;
    seedTextElem.value = "";
    await saveSelectedAccount();
    await selectAndShowAccount(selectedAccountData.name);
    d.showMsg("Seed Phrase is correct. Access granted", "success");
    renderSelectedAccountHeader();
    hideOkCancel();
  } catch (ex) {
    d.showErr(ex.message);
    enableOKCancel();
  } finally {
    d.hideWait();
  }
}

function switchToAssetsSupbage() {
  d.showSubPage("assets");
}

// function showInitial() {
//   d.removeGlobalKeyPress();
//   showSelectedAccount();
//   populateAssets();
//   switchToAssetsSupbage();
// }

async function removeAccountRecord_and_go_to_account_pages() {
  //remove record
  await askBackground({
    code: "remove-account",
    accountId: selectedAccountData.name,
  });
  // avoid reposition on removed account
  await localStorageGetAndRemove("account");
  //return to main page
  await AccountPages_show();
}

//---------------------------------------
export function removePrivateKeyClicked(ev: Event) {
  try {
    if (selectedAccountData.isFullAccess) {
      localGlobalAlsoRemoveAccount = false;
      startProcessRemovePrivKey();
    }
    else {
      throw new Error("No private key for the account");
    }
  } catch (ex) {
    d.showErr(ex.message);
  }
}

//---------------------------------------
// remove account from wallet
async function removeAccountClicked(ev: Event) {
  try {
    if (selectedAccountData.isFullAccess) {
      // has full access - remove access and then the account 
      localGlobalAlsoRemoveAccount = true;
      startProcessRemovePrivKey();
    }
    else {
      removeAccountRecord_and_go_to_account_pages();
    }

  } catch (ex) {
    d.showErr(ex.message);
  }
}

export async function refreshSaveSelectedAccount(fromTimer?: boolean) {
  if (selectedAccountData.accountInfo.network !== activeNetworkInfo.name) {
    //network changed
    return;
  }

  await asyncRefreshAccountInfoLastBalance(
    selectedAccountData.name,
    selectedAccountData.accountInfo
  );
  await saveSelectedAccount(); //save

  showSelectedAccount();
}

async function refreshClicked(ev: Event) {
  d.showWait();
  try {
    await refreshSaveSelectedAccount();
    d.showSuccess("Account data refreshed");
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

export function historyWithIcons(base: History[]) {
  let newHistory: History[] = [];
  // set icons
  for (let item of base) {
    let data = Object.assign({}, item);
    if (!data.icon || !data.icon.startsWith("<svg")) {
      switch (data.type.toLowerCase()) {
        case "unstake":
        case "unstaked":
          data.icon = UNSTAKE_DEFAULT_SVG;
          break;
        case "stake":
        case "staked":
        case "restake":
          data.icon = STAKE_DEFAULT_SVG;
          break;
        case "send":
        case "sent":
          data.icon = SEND_SVG;
          break;
        case "receive":
        case "received":
          data.icon = RECEIVE_SVG;
          break;
        case "liquid-stake":
        case "liquid-unstake":
          data.icon = LIQUID_STAKE_DEFAULT_SVG;
          break;
        default:
          data.icon = "";
          break;
      }
      newHistory.push(data);
    }
  }
  return newHistory;
}
