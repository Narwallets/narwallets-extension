import * as c from "../util/conversions.js";
import * as d from "../util/document.js";

import * as searchAccounts from "../util/search-accounts.js";
import * as Pages from "../pages/main.js";

import * as StakingPool from "../contracts/staking-pool.js";
import {
  isValidAccountID,
  isValidAmount,
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
  ExtendedAccountData,
  History,
  Contact,
} from "../data/account.js";
import { localStorageSet } from "../data/util.js";
import {
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
} from "../background/askBackground.js";
import {
  BatchTransaction,
  DeleteAccountToBeneficiary,
} from "../lib/near-api-lite/batch-transaction.js";

import { show as AccountPages_show } from "./main.js";
import { show as AssetSelected_show } from "./asset-selected.js";
import {
  initAddressArr,
  saveContactOnBook,
  show as AddressBook_show,
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
import { nearDollarPrice } from "../data/global.js";
import { addressContacts } from "./address-book.js";
import { box_overheadLength } from "../lib/naclfast-secret-box/nacl-fast.js";
import { GContact } from "../data/Contact.js";

const THIS_PAGE = "account-selected";
export const STAKE_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 67.79 67.79"
<style
   type="text/css"
   id="style2">	.st0{fill:#545454;}</style>
<ellipse
   style="fill:#e5e5e5;fill-opacity:1"
   id="path849"
   cx="33.883709"
   cy="33.823631"
   rx="33.883709"
   ry="33.823631" /><g
   id="Capa_1-2"
   transform="matrix(0.84759101,0,0,0.84759101,5.1666647,5.1666647)"
   style="fill:#4d4d4d;fill-opacity:1">
	<path
   class="st0"
   d="M 33.9,0 C 15.2,0 0,15.2 0,33.9 c 0,18.7 15.2,33.9 33.9,33.9 18.7,0 33.9,-15.2 33.9,-33.9 0,0 0,0 0,0 C 67.8,15.2 52.6,0 33.9,0 Z m -4,29 0.9,0.5 c 4.5,2.4 9.2,4.1 14.1,5.3 -3.6,0.5 -7.3,0.7 -10.9,0.7 -9.6,0 -17.4,-1.5 -17.4,-3.2 -0.1,-1.7 5.6,-3 13.3,-3.3 z m 21.5,24.6 v 0 c 0,0.1 0,0.2 0,0.2 0,1.8 -7.8,3.2 -17.4,3.2 -9.6,0 -17.4,-1.5 -17.4,-3.2 0,-0.1 0,-0.2 0,-0.2 v 0 -5.2 0 c 0.6,1.7 8.1,3 17.4,3 9.3,0 16.8,-1.3 17.4,-3 v 0 z m 0,-7.2 v 0 c 0,0.1 0,0.2 0,0.2 0,1.8 -7.8,3.2 -17.4,3.2 -9.6,0 -17.4,-1.5 -17.4,-3.2 0,-0.1 0,-0.2 0,-0.2 v 0 -5.2 0 c 0.6,1.7 8.1,3 17.4,3 9.3,0 16.8,-1.3 17.4,-3 v 0 z m 0,-7.1 v 0 c 0,0.1 0,0.2 0,0.2 0,1.8 -7.8,3.3 -17.4,3.3 -9.6,0 -17.4,-1.5 -17.4,-3.3 0,-0.1 0,-0.2 0,-0.2 v 0 -5.2 0 c 0.6,1.7 8.1,3 17.4,3 9.3,0 16.8,-1.3 17.4,-3 v 0 z M 51,32 v 0 c 0,0.1 0,0.2 0,0.2 C 50.3,33.8 42.5,32 33.8,28.1 25.1,24.2 18.3,19.7 19,18 c 0,-0.1 0.1,-0.1 0.1,-0.2 v 0 l 2.1,-4.7 v 0 c -0.1,1.8 6.2,6.1 14.6,9.8 8.4,3.7 15.9,5.6 17.1,4.3 v 0 z m 3.2,-6.6 C 53.5,27 45.7,25.2 37,21.3 28.3,17.4 21.6,12.9 22.4,11.2 c 0.8,-1.7 8.5,0.2 17.2,4.1 8.7,3.9 15.2,8.5 14.6,10.1 z"
   id="path4"
   style="fill:#4d4d4d;fill-opacity:1" />
</g>
</svg>
`;
export const UNSTAKE_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 67.79 67.79"
<defs
   id="defs4">
  <style
     id="style2">.cls-1{fill:#fff;}</style>
</defs>
<ellipse
   cx="33.8"
   cy="34"
   rx="33.8"
   ry="34"
   fill="#ffceda"
   id="ellipse6"
   style="fill:#e5e5e5;fill-opacity:1" />
<path
   d="M33.8 5.2A28.9 28.9 0 1 0 62.7 34.2 28.9 28.9 0 0 0 33.8 5.2ZM33.4 14.7 43.7 25.1H39.3V37.4H27.6V25.1h-4.5zm7.8 13.9c4.4 0.5 7.4 1.3 7.4 2.4 0 1-3 1.9-7.4 2.4zm-15.2 0.1v4.8c-4.3-0.5-7.2-1.3-7.2-2.3 0-1 2.9-1.9 7.2-2.4zm22.6 3.8v4.4a0.6 0.6 0 0 1 0 0.2c0 1.5-6.7 2.8-14.9 2.8-8.2 0-14.9-1.2-14.9-2.8a0.6 0.6 0 0 1 0-0.2h0v-4.4h0c0.3 0.9 3.1 1.7 7.1 2.2v4.2h15.2v-4.1c4.2-0.5 7.1-1.3 7.4-2.2zm0 6.1v4.4a0.6 0.6 0 0 1 0 0.2c0 1.5-6.7 2.8-14.9 2.8-8.2 0-14.9-1.2-14.9-2.8a0.6 0.6 0 0 1 0-0.2h0v-4.4h0c0.5 1.4 7 2.6 14.8 2.6 7.9 0 14.3-1.1 14.9-2.6zm0 6.2v4.4a0.6 0.6 0 0 1 0 0.2c0 1.5-6.7 2.8-14.9 2.8-8.2 0-14.9-1.2-14.9-2.8a0.6 0.6 0 0 1 0-0.2h0v-4.4h0c0.5 1.4 7 2.6 14.8 2.6 7.9 0 14.3-1.1 14.9-2.6z"
   style="fill:#4d4d4d;stroke-width:0.9;fill-opacity:1"
   id="path8" />
</svg>`;
export const STNEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 67.79 67.79"
<defs
   id="defs389">
  <style
     id="style387">.cls-1{fill:#fff;}</style>
</defs>
<ellipse
   style="fill:#22c6ff;stroke:none;stroke-width:0.934129"
   id="path865"
   cx="34.4697"
   cy="33.468357"
   rx="32.35738"
   ry="32.536091" />
<path
   style="fill:#ffd200;fill-opacity:1;stroke:none;stroke-width:0.870796px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
   d="m 15.734943,26.525122 8.732556,-3.811759 2.964797,10.306785 13.960933,-0.01029 3.36067,-11.521722 6.717352,2.994954 0.134347,27.226858 -34.392838,0.136135 z"
   id="path1095" />
<path
   style="fill:#37ceff;fill-opacity:1;stroke:none;stroke-width:0.870796px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
   d="m 34.444018,14.136245 -9.976519,8.577118 1.902055,8.640959 6.42746,4.427932 5.239534,-0.408402 4.448142,-4.086296 2.269209,-9.799403 -10.309881,-7.351908"
   id="path2560" />
<path
   id="path505-7"
   d="M 34.479033,5.4440077 A 27.927265,28.024351 0 1 0 62.396965,33.468682 27.927265,28.024351 0 0 0 34.479033,5.4440077 Z m -0.03379,9.7925703 c 1.60771,4.814472 7.132741,8.06932 7.132741,12.004578 0,3.935259 -3.222481,7.125245 -7.1971,7.125246 -3.974622,-10e-7 -7.197102,-3.189987 -7.197102,-7.125246 0,-3.935259 5.58978,-7.318492 7.261461,-12.004578 z m 2.622687,8.345886 a 2.079043,2.0220777 0 0 0 -0.53902,0.06782 2.079043,2.0220777 0 0 0 -0.500402,0.203439 2.079043,2.0220777 0 0 0 -0.431213,0.321307 2.079043,2.0220777 0 0 0 -0.329848,0.418181 2.079043,2.0220777 0 0 0 -0.207562,0.487612 2.079043,2.0220777 0 0 0 -0.0708,0.523131 2.079043,2.0220777 0 0 0 0.0708,0.523131 2.079043,2.0220777 0 0 0 0.207562,0.487611 2.079043,2.0220777 0 0 0 0.329848,0.419797 2.079043,2.0220777 0 0 0 0.431213,0.321306 2.079043,2.0220777 0 0 0 0.500402,0.201825 2.079043,2.0220777 0 0 0 0.53902,0.06943 2.079043,2.0220777 0 0 0 0.53741,-0.06943 2.079043,2.0220777 0 0 0 0.50201,-0.201825 2.079043,2.0220777 0 0 0 0.429606,-0.321306 2.079043,2.0220777 0 0 0 0.331456,-0.419797 2.079043,2.0220777 0 0 0 0.207562,-0.487611 2.079043,2.0220777 0 0 0 0.07081,-0.523131 2.079043,2.0220777 0 0 0 -0.0097,-0.198596 2.079043,2.0220777 0 0 0 -0.03058,-0.195367 2.079043,2.0220777 0 0 0 -0.04987,-0.192139 2.079043,2.0220777 0 0 0 -0.06918,-0.187294 2.079043,2.0220777 0 0 0 -0.08689,-0.179221 2.079043,2.0220777 0 0 0 -0.104585,-0.171147 2.079043,2.0220777 0 0 0 -0.120677,-0.158231 2.079043,2.0220777 0 0 0 -0.138375,-0.146929 2.079043,2.0220777 0 0 0 -0.151247,-0.134012 2.079043,2.0220777 0 0 0 -0.162509,-0.117867 2.079043,2.0220777 0 0 0 -0.175383,-0.101719 2.079043,2.0220777 0 0 0 -0.185036,-0.08557 2.079043,2.0220777 0 0 0 -0.191472,-0.06621 2.079043,2.0220777 0 0 0 -0.197908,-0.04844 2.079043,2.0220777 0 0 0 -0.202735,-0.02907 2.079043,2.0220777 0 0 0 -0.202735,-0.0097 z M 25.822557,28.1195 a 8.6360249,8.7623357 0 0 0 0.933225,3.355148 13.657714,2.054174 0 0 1 -6.28962,-1.730856 13.657714,2.054174 0 0 1 5.356395,-1.624292 z m 17.174574,0.06459 a 13.657714,2.054174 0 0 1 4.785194,1.559707 13.657714,2.054174 0 0 1 -5.679805,1.667885 8.6360249,8.7623357 0 0 0 0.894611,-3.227592 z m 5.705548,2.654408 v 4.298074 a 0.56843106,0.57040714 0 0 1 0,0.198596 c 0,1.488019 -6.433722,2.6867 -14.358805,2.6867 -7.925082,0 -14.358806,-1.198681 -14.358806,-2.6867 a 0.56843106,0.57040714 0 0 1 0.04023,-0.198596 h -0.04023 v -4.273857 h 0.04023 c 0.34582,0.944357 3.396091,1.763938 7.742555,2.182944 a 8.6360249,8.7623357 0 0 0 6.645211,3.182385 8.6360249,8.7623357 0 0 0 6.650039,-3.192072 c 4.264551,-0.417458 7.264259,-1.224997 7.639579,-2.197475 z m 0.02574,6.053148 v 4.298076 a 0.56843106,0.57040714 0 0 1 0,0.198594 c 0,1.488019 -6.433723,2.686702 -14.358806,2.686702 -7.925083,0 -14.358805,-1.198683 -14.358805,-2.686702 a 0.56843106,0.57040714 0 0 1 0.04023,-0.198594 h -0.04023 v -4.273857 h 0.04023 c 0.502527,1.372284 6.714787,2.480031 14.31858,2.480031 7.58732,0 13.806852,-1.074099 14.358806,-2.50425 z m 0,5.959502 v 4.29969 a 0.56843106,0.57040714 0 0 1 0,0.198596 c 0,1.488018 -6.433723,2.686701 -14.358806,2.686701 -7.925083,0 -14.358805,-1.198683 -14.358805,-2.686701 a 0.56843106,0.57040714 0 0 1 0.04023,-0.198596 h -0.04023 v -4.273857 h 0.04023 c 0.502527,1.372285 6.714787,2.480032 14.31858,2.480032 7.58732,0 13.806852,-1.10878 14.358806,-2.505865 z"
   style="fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.825244" />
</svg>

`;

let selectedAccountData: ExtendedAccountData;

let accountInfoName: d.El;
let accountBalance: d.El;

let removeButton: d.El;
let refreshButton: d.El;

let seedTextElem: d.El;
let comboAdd: d.El;
let isMoreOptionsOpen = false;
let stakeTabSelected: number = 1;

export async function show(
  accName: string,
  reposition?: string,
  assetIndex?: number
) {
  d.byId("topbar").innerText = "Accounts";

  initPage();
  await selectAndShowAccount(accName);
  d.showPage(THIS_PAGE);
  if (reposition) {
    switch (reposition) {
      case "stake": {
        stakeClicked();
        break;
      }
      case "asset": {
        if (assetIndex !== undefined) {
          AssetSelected_show(selectedAccountData, assetIndex);
        }
        break;
      }
    }
  }
  localStorageSet({ reposition: "account", account: accName });
  checkConnectOrDisconnect();
}

// page init

function initPage() {
  const backLink = new d.El("#account-selected.appface .button.back");
  backLink.onClick(Pages.backToAccountsList);

  d.onClickId("assets-list", showAssetDetailsClicked);

  // icon bar
  d.onClickId("receive", receiveClicked);
  d.onClickId("send", sendClicked);
  d.onClickId("stake", stakeClicked);
  d.onClickId("acc-connect-to-page", connectToWebAppClicked);

  // more tab
  d.onClickId("access", changeAccessClicked);
  d.onClickId("list-pools", listPoolsClicked);
  d.onClickId("add", addClicked);
  d.onClickId("more", moreClicked);
  d.onClickId("show-public-key", showPublicKeyClicked);
  d.onClickId("show-private-key", showPrivateKeyClicked);
  d.onClickId("add-note", addNoteClicked);
  d.onClickId("detailed-rewards", detailedRewardsClicked);
  d.onClickId("explore", exploreButtonClicked);
  d.onClickId("search-pools", searchPoolsButtonClicked);
  d.onClickId("adress-book-button", showAdressBook);
  d.onClickId("contact-list", contactOptions);
  d.onClickId("refresh-button", refreshSelectedAcc);
  // d.onClickId("acc-disconnect-from-page", disconnectFromPageClicked);

  // liquid/delayed stake
  d.onClickId("one-tab-stake", selectFirstTab);
  d.onClickId("two-tab-stake", selectSecondTab);

  seedTextElem = new d.El("#seed-phrase");
  comboAdd = new d.El("#combo-add-token");
  removeButton = new d.El("button#remove");
  //lala_redesign

  OkCancelInit();
  removeButton.onClick(removeAccountClicked);

  var target = document.querySelector("#usd-price-link");
  target?.addEventListener("usdPriceReady", usdPriceReady);

  return;

  //accountAmount.onInput(amountInput);

  refreshButton = new d.El("button#refresh");

  d.onClickId("unstake", unstakeClicked);

  refreshButton.onClick(refreshClicked);
  d.onClickId("moreless", moreLessClicked);

  d.onClickId("lockup-add-public-key", LockupAddPublicKey);
  d.onClickId("delete-account", DeleteAccount);
  //d.onClickId("assign-staking-pool", assignStakingPool);
}

async function refreshSelectedAcc() {
  let accName = selectedAccountData.name;
  const netInfo = await askBackgroundGetNetworkInfo();

  const root = netInfo.rootAccount;
  if (
    accName &&
    accName.length < 60 &&
    !accName.endsWith(root) &&
    !(netInfo.name == "testnet" && /dev-[0-9]{13}-[0-9]{7}/.test(accName))
  ) {
    accName = accName + "." + root;
  }

  const mainAccInfo = await searchAccounts.searchAccount(accName);
  console.log(mainAccInfo);

  selectedAccountData.total = mainAccInfo.lastBalance;
  selectedAccountData.accountInfo.lastBalance = mainAccInfo.lastBalance;

  selectedAccountData.accountInfo.assets.forEach(async (asset) => {
    if (asset.contractId == "token.cheddar.testnet") {
      let result = await askBackgroundViewMethod(
        asset.contractId,
        "ft_metadata",
        {}
      );
      let resultBalance = await askBackgroundViewMethod(
        asset.contractId,
        "ft_balance_of",
        { account_id: selectedAccountData.name }
      );
      console.log("Tenemos este log loco que tiene", result, resultBalance);
    }

    let poolAccInfo = await StakingPool.getAccInfo(
      selectedAccountData.name,
      asset.contractId
    );
    if (asset.symbol != "USNTAKED")
      asset.balance = c.yton(poolAccInfo.staked_balance);
    if (asset.symbol == "UNSTAKED")
      asset.balance = c.yton(poolAccInfo.unstaked_balance);

    console.log("ESTO ES", poolAccInfo, asset.symbol, asset.balance);
  });
  await refreshSaveSelectedAccount();
  showInitial();
  d.showSuccess("Refreshed");
}

function usdPriceReady() {
  selectedAccountData.totalUSD = selectedAccountData.total * nearDollarPrice;
  let element = document.querySelector(
    "#selected-account .accountdetsfiat"
  ) as HTMLDivElement;
  element.innerText = c.toStringDecMin(selectedAccountData.totalUSD);
  element.classList.remove("hidden");
}

function selectFirstTab() {
  stakeTabSelected = 1;
}

function selectSecondTab() {
  stakeTabSelected = 2;
}

function moreClicked() {
  hideOkCancel();
  if (!isMoreOptionsOpen) {
    d.showSubPage("more-subpage");
    isMoreOptionsOpen = true;
    return;
  }
  isMoreOptionsOpen = false;
  d.showPage("account-selected");
  d.showSubPage("assets");
}

async function checkConnectOrDisconnect() {
  await askBackground({
    code: "connect",
    accountId: selectedAccountData.name,
  });

  const connectButton = d.byId("acc-connect-to-page");
  connectButton.classList.remove("connect");
  connectButton.classList.add("disconnect");
  connectButton.innerText = "Disconnect";
}

function showAssetDetailsClicked(ev: Event) {
  if (ev.target && ev.target instanceof HTMLElement) {
    const li = ev.target.closest("li");
    if (li) {
      const assetIndex = Number(li.id); // d.getClosestChildText(".account-item", ev.target, ".name");
      if (isNaN(assetIndex)) return;
      AssetSelected_show(selectedAccountData, assetIndex);
    }
  }
}

function addClicked() {
  d.showSubPage("add-subpage");
  showOKCancel(addOKClicked, showInitial);
}

async function addOKClicked() {
  disableOKCancel();
  d.showWait();
  try {
    let contractValue = d.inputById("combo-add-token").value;
    let lista =
      document.querySelector("#combo-add-token-datalis")?.children || [];

    for (let i = 0; i < lista?.length || 0; i++) {
      let element = lista[i] as HTMLOptionElement;

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

    let item = new Asset();
    item.type = "ft";

    item.contractId = contractValue;

    let result = await askBackgroundViewMethod(
      item.contractId,
      "ft_metadata",
      {}
    );

    item.symbol = result.symbol;
    item.icon = result.icon;
    item.url = result.reference;
    item.spec = result.spec;

    let resultBalance = await askBackgroundViewMethod(
      item.contractId,
      "ft_balance_of",
      { account_id: selectedAccountData.name }
    );
    item.balance = c.yton(resultBalance);

    selectedAccountData.accountInfo.assets.push(item);

    refreshSaveSelectedAccount();
    enableOKCancel();
    d.showSuccess("Success");
    hideOkCancel();
  } catch (ex) {
    d.showErr(ex);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

function showingMore() {
  const buttonsMore = new d.All(".buttons-more");
  if (buttonsMore.elems.length == 0) return false;
  return !buttonsMore.elems[0].classList.contains("hidden");
}
async function moreLessClicked() {
  const options = await askBackgroundGetOptions();
  const selector = options.advancedMode
    ? ".buttons-more"
    : ".buttons-more:not(.advanced)";
  const buttonsMore = new d.All(selector);
  buttonsMore.toggleClass("hidden");
  d.qs("#moreless").innerText = showingMore() ? "Less..." : "More...";
}

function getAccountRecord(accName: string): Promise<Account> {
  return askBackground({
    code: "get-account",
    accountId: accName,
  }); /*as Promise<Account>*/
}

export async function populateSendCombo(combo: string) {
  var opotions = "";
  if (addressContacts.length == 0) await initAddressArr();
  console.log(addressContacts);

  for (var i = 0; i < addressContacts.length; i++) {
    opotions += '<option value="' + addressContacts[i].accountId + '" />';
  }

  d.byId(combo).innerHTML = opotions;
}

async function selectAndShowAccount(accName: string) {
  const accInfo = await getAccountRecord(accName);
  if (!accInfo) throw new Error("Account is not in this wallet: " + accName);

  selectedAccountData = new ExtendedAccountData(accName, accInfo);
  populateSendCombo("send-contact-combo");

  console.log(selectedAccountData);

  if (accInfo.ownerId && accInfo.type == "lock.c" && !accInfo.privateKey) {
    //lock.c is read-only, but do we have full access on the owner?
    const ownerInfo = await getAccountRecord(accInfo.ownerId);
    if (ownerInfo && ownerInfo.privateKey)
      selectedAccountData.accessStatus = "Owner";
  }

  showSelectedAccount();
}

function populateAssets() {
  d.clearContainer("assets-list");
  d.populateUL(
    "assets-list",
    "asset-item-template",
    selectedAccountData.accountInfo.assets
  );
}

function showSelectedAccount() {
  //make sure available is up to date before displaying
  selectedAccountData.available =
    selectedAccountData.accountInfo.lastBalance -
    selectedAccountData.accountInfo.lockedOther;

  const SELECTED_ACCOUNT = "selected-account";
  d.clearContainer(SELECTED_ACCOUNT);
  d.appendTemplateLI(
    SELECTED_ACCOUNT,
    "selected-account-template",
    selectedAccountData
  );

  //lleno lista de assets

  populateAssets();
  d.showSubPage("assets");

  //lleno lista de activity de account
  d.clearContainer("account-history-details");
  d.populateUL(
    "account-history-details",
    "asset-history-template",
    selectedAccountData.accountInfo.history
  );

  if (nearDollarPrice != 0) {
    usdPriceReady();
  }

  // Muestro tab 1
  //d.qs("#liquid-stake-radio").el.checked = true;

  /* lala_design
    accountBalance = new d.El(".selected-account-info .total.balance");
    accountInfoName = new d.El(".selected-account-info .name");


    if (selectedAccountData.accountInfo.ownerId) {
        const oiLine = new d.El(".selected-account-info #owner-id-info-line");
        oiLine.show()
    }
    if (selectedAccountData.accountInfo.lockedOther) {
        const lockedOthLine = new d.El(".selected-account-info #locked-others-line");
        lockedOthLine.show()
    }
    if (selectedAccountData.accountInfo.stakingPool) {
        d.qs(".selected-account-info #staking-pool-info-line").show()
        d.qs(".selected-account-info #staking-pool-balance-line").show()
    }
    
    d.onClickSelector(".selected-account-info .access-status", accessLabelClicked)
    */
}

type StateResult = {
  amount: string; // "27101097909936818225912322116"
  block_hash: string; //"DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
  block_height: number; //20046823
  code_hash: string; //"11111111111111111111111111111111"
  locked: string; //"0"
  storage_paid_at: number; // 0
  storage_usage: number; //2080
};

function listPoolsClicked() {
  d.inputById("stake-with-staking-pool").value = "";
  localStorageSet({ reposition: "stake", account: selectedAccountData.name });
  chrome.windows.create({
    url: chrome.runtime.getURL("outside/list-pools.html"),
    state: "maximized",
  });
}

function checkNormalAccountIsFullAccess() {
  if (selectedAccountData.isFullAccess) return true;
  showOKToGrantAccess();
  throw Error("Account access is Read-Only");
}

async function checkAccountAccess() {
  if (selectedAccountData.accountInfo.type == "lock.c") {
    if (!selectedAccountData.accountInfo.ownerId)
      throw Error("Owner is unknown. Try importing owner account");
    const ownerInfo = await getAccountRecord(
      selectedAccountData.accountInfo.ownerId
    );
    if (!ownerInfo) throw Error("The owner account is not in this wallet");
    if (!ownerInfo.privateKey)
      throw Error(
        "You need full access on the owner account: " +
          selectedAccountData.accountInfo.ownerId +
          " to operate this lockup account"
      );
    //new d.El(".footer .title").hide() //no hay  espacio
  } else {
    //normal account
    checkNormalAccountIsFullAccess();
    //new d.El(".footer .title").show() //hay espacio
  }
}

async function fullAccessSubPage(subPageId: string, OKHandler: ClickHandler) {
  try {
    d.hideErr();
    await checkAccountAccess();
    d.showSubPage(subPageId);
    showOKCancel(OKHandler, showInitial);
  } catch (ex) {
    d.showErr(ex.message);
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
    showOKCancel(GotoOwnerOkHandler, showInitial);
  }
}
function showOKToGrantAccess() {
  d.showSubPage("account-selected-ok-to-grant-access");
  showOKCancel(changeAccessClicked, showInitial);
}

function receiveClicked() {
  d.showSubPage("account-selected-receive");
  d.byId("account-selected-receive-name").innerText = selectedAccountData.name;
  showOKCancel(showInitial, showInitial);
  showGotoOwner(); //if this is a lock.c shows the "goto owner" page
}

//--------------------------------
async function connectToWebAppClicked(): Promise<any> {
  //TODO.
  d.showWait();
  try {
    await askBackground({
      code: "connect",
      accountId: selectedAccountData.name,
    });
    d.showSuccess("connected");
    window.close();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}
//--------------------------------
async function disconnectFromPageClicked() {
  try {
    await askBackground({ code: "disconnect" });
    d.showSuccess("disconnected");
    const buttonClass = d.byId("acc-connect-to-page");
    buttonClass.classList.remove("disconnect");
    buttonClass.classList.add("connect");
  } catch (ex) {
    d.showErr(ex.message);
  }
}

//--------------------------------
async function checkOwnerAccessThrows(action: string) {
  //check if we have owner's key
  const info = selectedAccountData.accountInfo;
  if (info.ownerId) {
    const owner = await getAccountRecord(info.ownerId);
    if (!owner || !owner.privateKey) {
      showGotoOwner();
      throw Error(
        "You need full access on " +
          info.ownerId +
          " to " +
          action +
          " from this " +
          selectedAccountData.typeFull
      );
    }
  }
}

//----------------------
async function sendClicked() {
  try {
    hideOkCancel();
    let maxAmountToSend = selectedAccountData.available;

    //if it's a lock.c and we didn't add a priv key yet, use contract method "trasnfer" (performLockupContractSend)
    if (
      selectedAccountData.accountInfo.type == "lock.c" &&
      !selectedAccountData.accountInfo.privateKey
    ) {
      maxAmountToSend = selectedAccountData.unlockedOther;
    }

    //check amount
    if (maxAmountToSend <= 0) {
      d.showErr("Not enough balance to send");
    } else {
      d.byId("max-amount-send").innerText = c.toStringDec(maxAmountToSend);
      d.onClickId("send-max", function () {
        d.maxClicked(
          "send-to-account-amount",
          "#selected-account .accountdetsbalance",
          0.1
        );
      });
      fullAccessSubPage("account-selected-send", sendOKClicked);
    }
  } catch (ex) {
    d.showErr(ex.message);
  }
}

async function checkContactList() {
  const toAccName = new d.El("#send-to-account-name").value;
  let found = false;

  if (addressContacts.length < 1) {
    d.showSubPage("sure-add-contact");
    showOKCancel(addContactToList, showInitial);
  }

  addressContacts.forEach((contact) => {
    if (contact.accountId == toAccName) {
      found = true;
    }
  });

  if (found) {
    showInitial();
    hideOkCancel();
  } else {
    d.showSubPage("sure-add-contact");
    d.byId("add-confirmation-name").innerText = toAccName;
    showOKCancel(addContactToList, showInitial);
  }
}

async function addContactToList() {
  try {
    const contactToSave: GContact = {
      accountId: new d.El("#send-to-account-name").value,
      note: "",
    };

    addressContacts.push(contactToSave);

    d.showSuccess("Success");
    hideOkCancel();
    populateSendCombo("send-contact-combo");
    await saveContactOnBook(contactToSave.accountId, contactToSave);
    showInitial();
  } catch {
    d.showErr("Error in save contact");
  }
}

//----------------------
async function sendOKClicked() {
  try {
    //validate
    const toAccName = new d.El("#send-to-account-name").value;
    const amountToSend = d.getNumber("#send-to-account-amount");
    if (!isValidAccountID(toAccName))
      throw Error("Receiver Account Id is invalid");
    if (!isValidAmount(amountToSend))
      throw Error("Amount should be a positive integer");

    //select send procedure
    let performer;
    let maxAvailable;
    //if it's a lock.c and we didn't add a priv key yet, use contract method "trasnfer" (performLockupContractSend)
    if (
      selectedAccountData.accountInfo.type == "lock.c" &&
      !selectedAccountData.accountInfo.privateKey
    ) {
      await checkOwnerAccessThrows("send");
      performer = performLockupContractSend;
      maxAvailable = selectedAccountData.unlockedOther;
    } else {
      if (selectedAccountData.isReadOnly) throw Error("Account is read-only");
      performer = performSend; //default send directly from account
      maxAvailable = selectedAccountData.available;
    }

    if (amountToSend > maxAvailable)
      throw Error("Amount exceeds available balance");

    //show confirmation subpage
    d.showSubPage("account-selected-send-confirmation");
    d.byId("send-confirmation-amount").innerText = c.toStringDec(amountToSend);
    d.byId("send-confirmation-receiver").innerText = toAccName;

    showOKCancel(performer, showInitial); //on OK clicked, send
  } catch (ex) {
    d.showErr(ex.message);
  }
}

//----------------------
async function performLockupContractSend() {
  try {
    disableOKCancel();
    d.showWait();

    const info = selectedAccountData.accountInfo;
    if (!info.ownerId) throw Error("unknown ownerId");

    const owner = await getAccountRecord(info.ownerId);
    if (!owner.privateKey)
      throw Error("you need full access on " + info.ownerId);

    const toAccName = d.byId("send-confirmation-receiver").innerText;
    const amountToSend = c.toNum(d.byId("send-confirmation-amount").innerText);

    const lc = new LockupContract(info);
    await lc.computeContractAccount();
    await lc.transfer(amountToSend, toAccName);

    d.showSuccess(
      "Success: " +
        selectedAccountData.name +
        " transferred " +
        c.toStringDec(amountToSend) +
        "\u{24c3} to " +
        toAccName
    );

    displayReflectTransfer(amountToSend, toAccName);

    await checkContactList();

    await refreshSelectedAcc();

    showInitial();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

//----------------------
async function stakeClicked() {
  try {
    //Crear asset
    selectFirstTab();
    const info = selectedAccountData.accountInfo;
    const stakeAmountBox = d.inputById("stake-amount");
    let performer = performStake; //default
    let amountToStake = selectedAccountData.unlockedOther;
    // if (info.unstaked > 0) {
    //   amountToStake = info.unstaked;
    // } else {
    //   amountToStake = info.unstaked + info.lastBalance - 2;
    //   if (info.type == "lock.c") amountToStake -= 34;
    // }

    if (info.type == "lock.c") {
      await checkOwnerAccessThrows("stake");
      performer = performLockupContractStake;
      stakeAmountBox.disabled = true;
      stakeAmountBox.classList.add("bg-lightblue");
    } else {
      stakeAmountBox.disabled = false;
      stakeAmountBox.classList.remove("bg-lightblue");
    }

    if (amountToStake < 0) amountToStake = 0;

    await fullAccessSubPage("account-selected-stake", performer);
    d.qs("#liquid-stake-radio").el.checked = true;
    d.inputById("stake-with-staking-pool").value = "";
    d.qs("#max-stake-amount-1").innerText = c.toStringDec(
      Math.max(0, amountToStake - 0.1)
    );
    d.qs("#max-stake-amount-2-label").innerText = c.toStringDec(
      Math.max(0, amountToStake - 0.1)
    );
    d.onClickId("liquid-stake-max", function () {
      d.maxClicked(
        "stake-amount-liquid",
        "#selected-account .accountdetsbalance",
        0.1
      );
    });
    d.onClickId("max-stake-amount-2-button", function () {
      d.maxClicked(
        "stake-amount",
        "#selected-account .accountdetsbalance",
        0.1
      );
    });
    //commented. facilitate errors. let the user type-in to confirm.- stakeAmountBox.value = c.toStringDec(amountToStake)
    if (info.type == "lock.c")
      stakeAmountBox.value = c.toStringDec(amountToStake);
  } catch (ex) {
    d.showErr(ex.message);
  }
}

async function saveSelectedAccount(): Promise<any> {
  return askBackgroundSetAccount(
    selectedAccountData.name,
    selectedAccountData.accountInfo
  );
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

    if (stakeTabSelected == 1) {
      newStakingPool = "meta.pool.testnet";
      amountToStake = c.toNum(d.inputById("stake-amount-liquid").value);
    } else {
      newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
      amountToStake = c.toNum(d.inputById("stake-amount").value);
    }
    if (!isValidAccountID(newStakingPool))
      throw Error("Staking pool Account Id is invalid");

    if (!selectedAccountData.isFullAccess)
      throw Error("you need full access on " + selectedAccountData.name);

    //const amountToStake = info.lastBalance - info.staked - 36
    if (!isValidAmount(amountToStake))
      throw Error("Amount should be a positive integer");
    if (amountToStake < 5) throw Error("Stake at least 5 Near");

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

      poolAccInfo = await StakingPool.getAccInfo(
        selectedAccountData.name,
        newStakingPool
      );

      let hist: History;
      hist = {
        amount: amountToStake,
        date: new Date().toISOString(),
        type: "stake",
        destination: "",
      };
      let foundAsset: Asset = new Asset();

      selectedAccountData.accountInfo.assets.forEach((asset) => {
        if (asset.symbol != "UNSTAKED" && asset.contractId == newStakingPool) {
          existAssetWithThisPool = true;
          foundAsset = asset;
        }
      });

      if (existAssetWithThisPool) {
        foundAsset.history.unshift(hist);
        foundAsset.balance = c.yton(poolAccInfo.staked_balance);
      } else {
        let asset: Asset;
        asset = {
          spec: "idk",
          url: "",
          contractId: newStakingPool,
          balance: c.yton(poolAccInfo.staked_balance),
          type: "stake",
          symbol: stakeTabSelected == 1 ? "STNEAR" : "STAKE",
          icon: stakeTabSelected == 1 ? STNEAR_SVG : STAKE_DEFAULT_SVG,
          history: [],
        };
        asset.history.unshift(hist);
        selectedAccountData.accountInfo.assets.push(asset);
      }

      //Agrego history de account
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
    selectedAccountData.total -= amountToStake;
    await refreshSaveSelectedAccount();

    d.showSuccess("Success");
    hideOkCancel();
    showInitial();
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
    if (!isValidAccountID(newStakingPool))
      throw Error("Staking pool Account Id is invalid");

    const info = selectedAccountData.accountInfo;
    if (!info.ownerId) throw Error("unknown ownerId");

    const owner = await getAccountRecord(info.ownerId);
    if (!owner.privateKey)
      throw Error("you need full access on " + info.ownerId);

    //const amountToStake = info.lastBalance - info.staked - 36
    const amountToStake = c.toNum(d.inputById("stake-amount").value);
    if (!isValidAmount(amountToStake))
      throw Error("Amount should be a positive integer");
    if (amountToStake < 5) throw Error("Stake at least 5 NEAR");

    const lc = new LockupContract(info);
    await lc.computeContractAccount();
    await lc.stakeWith(newStakingPool, amountToStake);

    //store updated lc state
    await askBackgroundSetAccount(lc.contractAccount, lc.accountInfo);
    //refresh status
    await refreshSaveSelectedAccount();

    d.showSuccess("Success");
    showInitial();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

//-------------------------------------
async function unstakeClicked() {
  try {
    d.showWait();
    const info = selectedAccountData.accountInfo;
    let performer = performUnstake; //default
    const amountBox = d.inputById("unstake-amount");
    const optionWU = d.qs("#option-unstake-withdraw");
    d.byId("unstake-from-staking-pool").innerText = "";
    optionWU.hide();
    if (info.type == "lock.c") {
      //lockup - always full amount
      d.qs("#unstake-ALL-label").show();
      await checkOwnerAccessThrows("unstake");
      performer = performLockupContractUnstake;
      amountBox.disabled = true;
      amountBox.classList.add("bg-lightblue");
    } else {
      //normal account can choose amounts
      d.qs("#unstake-ALL-label").hide();
      amountBox.disabled = false;
      amountBox.classList.remove("bg-lightblue");
    }
    fullAccessSubPage("account-selected-unstake", performer);
    disableOKCancel();

    //---refresh first
    await refreshSaveSelectedAccount();

    // if (!selectedAccountData.accountInfo.stakingPool) {
    //   showButtons();
    //   throw Error("No staking pool associated whit this account. Stake first");
    // }

    let amountForTheField;
    let amountToWithdraw = selectedAccountData.unlockedOther;
    if (amountToWithdraw > 0) {
      d.inputById("radio-withdraw").checked = true;
      amountForTheField = amountToWithdraw;
    } else {
      d.inputById("radio-unstake").checked = true;
      //amountForTheField = selectedAccountData.accountInfo.staked;
      //if (amountForTheField == 0) throw Error("No funds on the pool");
    }
    if (info.type != "lock.c") optionWU.show();

    //d.byId("unstake-from-staking-pool").innerText = info.stakingPool || "";
    //d.inputById("unstake-amount").value = c.toStringDec(amountForTheField);
    enableOKCancel();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

//-----------------------
function fixUserAmountInY(amount: number, yoctosMax: string): string {
  let yoctosResult = yoctosMax; //default => all
  if (amount + 2 < c.yton(yoctosResult)) {
    yoctosResult = c.ntoy(amount); //only if it's less of what's available, we take the input amount
  } else if (amount > 2 + c.yton(yoctosMax)) {
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
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    if (!selectedAccountData.isFullAccess)
      throw Error("you need full access on " + selectedAccountData.name);

    //const actualSP = selectedAccountData.accountInfo.stakingPool;
    // if (!actualSP) throw Error("No staking pool selected in this account");

    //check if it's staked or just in the pool but unstaked
    // const poolAccInfo = await StakingPool.getAccInfo(
    //   selectedAccountData.name,
    //   actualSP
    // );

    if (modeWithdraw) {
      // if (poolAccInfo.unstaked_balance == "0")
      //   throw Error("No funds unstaked to withdraw");

      //if (!poolAccInfo.can_withdraw) throw Error("Funds are unstaked but you must wait (36-48hs) after unstaking to withdraw")

      //ok we've unstaked funds we can withdraw
      // let yoctosToWithdraw = fixUserAmountInY(
      //   amount,
      //   poolAccInfo.unstaked_balance
      // ); // round user amount
      // if (yoctosToWithdraw == poolAccInfo.unstaked_balance) {
      //   await askBackgroundCallMethod(
      //     actualSP,
      //     "withdraw_all",
      //     {},
      //     selectedAccountData.name
      //   );
      // } else {
      //   await askBackgroundCallMethod(
      //     actualSP,
      //     "withdraw",
      //     { amount: yoctosToWithdraw },
      //     selectedAccountData.name
      //   );
      // }
      // d.showSuccess(
      //   c.toStringDec(c.yton(yoctosToWithdraw)) + " withdrew from the pool"
      // );
      //----------------
      // } else {
      //   //mode unstake
      //   //here we've staked balance in the pool, call unstake

      //   if (poolAccInfo.staked_balance == "0")
      //     throw Error("No funds staked to unstake");

      //   let yoctosToUnstake = fixUserAmountInY(
      //     amount,
      //     poolAccInfo.staked_balance
      //   ); // round user amount
      //   if (yoctosToUnstake == poolAccInfo.staked_balance) {
      //     await askBackgroundCallMethod(
      //       actualSP,
      //       "unstake_all",
      //       {},
      //       selectedAccountData.name
      //     );
      //   } else {
      //     await askBackgroundCallMethod(
      //       actualSP,
      //       "unstake",
      //       { amount: yoctosToUnstake },
      //       selectedAccountData.name
      //     );
      //   }
      d.showSuccess("Unstake requested, you must wait (36-48hs) to withdraw");
    }

    //refresh status
    await refreshSaveSelectedAccount();

    showInitial();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

async function performLockupContractUnstake() {
  try {
    disableOKCancel();
    d.showWait();

    const info = selectedAccountData.accountInfo;
    if (!info.ownerId) throw Error("unknown ownerId");

    const owner = await getAccountRecord(info.ownerId);
    if (!owner.privateKey)
      throw Error("you need full access on " + info.ownerId);

    const lc = new LockupContract(info);
    await lc.computeContractAccount();

    const message = await lc.unstakeAndWithdrawAll(
      info.ownerId,
      owner.privateKey
    );
    d.showSuccess(message);

    //refresh status
    await refreshSaveSelectedAccount();

    showInitial();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

function displayReflectTransfer(amountNear: number, dest: string) {
  //sender and receiver .accountInfo.lastBalance are asnyc updated and saved by background.ts function reflectTransfer()
  //here we only refresh displayed account data
  if (amountNear == 0) return;
  selectedAccountData.accountInfo.lastBalance -= amountNear;
  selectedAccountData.available -= amountNear;
  selectedAccountData.total -= amountNear;

  showSelectedAccount();
}

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

    //TODO transaction history per network
    //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
    //global.state.transactions[Network.current].push(transactionInfo)

    d.showSuccess(
      "Success: " +
        selectedAccountData.name +
        " transferred " +
        c.toStringDec(amountToSend) +
        "\u{24c3} to " +
        toAccName
    );

    let hist: History;
    hist = {
      amount: amountToSend,
      date: new Date().toISOString(),
      type: "send",
      destination: toAccName,
    };
    selectedAccountData.accountInfo.history.unshift(hist);

    //    hideOkCancel();
    displayReflectTransfer(amountToSend, toAccName);
    await refreshSelectedAcc();
    await saveSelectedAccount();
    await checkContactList();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

async function exploreButtonClicked() {
  localStorageSet({ reposition: "account", account: selectedAccountData.name });
  const netInfo = await askBackgroundGetNetworkInfo();
  chrome.windows.create({
    url: netInfo.explorerUrl + "accounts/" + selectedAccountData.name,
    state: "maximized",
  });
}

async function detailedRewardsClicked() {
  localStorageSet({ reposition: "account", account: selectedAccountData.name });
  const netInfo = await askBackgroundGetNetworkInfo();
  if (netInfo.name != "mainnet") {
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
export async function searchThePools(
  exAccData: ExtendedAccountData
): Promise<boolean> {
  const doingDiv = d.showMsg("Searching Pools...", "info", -1);
  d.showWait();
  let found = false;
  try {
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
              `Found! ${c.toStringDec(amount)} on ${pool.account_id}`
            );
            found = false;

            const foundAssetStake = exAccData.accountInfo.assets.find(
              (asset) =>
                asset.contractId == pool.account_id && asset.symbol == "STAKE"
            );
            const foundAssetUnstake = exAccData.accountInfo.assets.find(
              (asset) =>
                asset.contractId == pool.account_id && asset.symbol == "UNSTAKED"
            );

            if (!foundAssetStake && c.yton(poolAccInfo.staked_balance) > 0) {
              let newAsset: Asset = {
                balance: c.yton(poolAccInfo.staked_balance),
                spec: "",
                url: "",
                contractId: pool.account_id,
                type: "stake",
                symbol: "STAKE",
                icon: STAKE_DEFAULT_SVG,
                history: [],
              };
              exAccData.accountInfo.assets.push(newAsset);
            }

            if (!foundAssetUnstake && c.yton(poolAccInfo.unstaked_balance) > 0) {
              let newAsset: Asset = {
                balance: c.yton(poolAccInfo.unstaked_balance),
                spec: "",
                url: "",
                contractId: pool.account_id,
                type: "unstake",
                symbol: "UNSTAKED",
                icon: UNSTAKE_DEFAULT_SVG,
                history: [],
              };
              exAccData.accountInfo.assets.push(newAsset);
            

            // exAccData.accountInfo.assets.forEach((asset) => {
            //   if (
            //     asset.contractId == pool.account_id &&
            //     asset.symbol == "STAKE"
            //   ) {
            //     asset.balance = amount;
            //     found = true;
            //   }
            // });

            // if (!found) {
            //   let newAsset: Asset = {
            //     balance: amount,
            //     spec: "",
            //     url: "",
            //     contractId: pool.account_id,
            //     type: "stake",
            //     symbol: "STAKE",
            //     icon: STAKE_DEFAULT_SVG,
            //     history: [],
            //   };

            //   exAccData.accountInfo.assets.push(newAsset);
            }
          }
        }
      }
    }
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    doingDiv.remove();
    d.hideWait();
  }

  return found;
}

//-------------------------------
async function searchPoolsButtonClicked() {
  const found: boolean = await searchThePools(selectedAccountData);
  await refreshSaveSelectedAccount();
}

// //-------------------------------
// async function assignStakingPool() {
//     const found:boolean = await searchThePools(selectedAccountData)
//     if (found) {
//         await refreshSaveSelectedAccount()
//     }
// }

//-------------------------------
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
    showOKCancel(makeFullAccessOKClicked, showInitial);
  } else {
    //normal acc priv key
    d.showSubPage("account-selected-show-public-key");
    d.byId("account-selected-public-key").innerText = getPublicKey(
      selectedAccountData.accountInfo.privateKey || ""
    );
    showOKCancel(showInitial, showInitial);
  }
}

//---------------------------------------
export function showPrivateKeyClicked() {
  d.hideErr();

  if (selectedAccountData.isReadOnly) {
    //we don't have any key for ReadOnly accounts
    d.showErr("Account is read only");
    d.showSubPage("account-selected-make-full-access");
    showOKCancel(makeFullAccessOKClicked, showInitial);
  } else {
    //normal acc priv key

    d.showSubPage("request-password");
    showOKCancel(showPrivateKeyValidationPasswordClicked, showInitial);
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
  showOKCancel(showInitial, showInitial);
}

//---------------------------------------
function accessLabelClicked() {
  if (selectedAccountData.accountInfo.type == "lock.c") {
    showGotoOwner();
  } else {
    changeAccessClicked();
  }
}

//---------------------------------------
function changeAccessClicked() {
  d.hideErr();
  seedTextElem.value = "";

  if (selectedAccountData.isFullAccess) {
    d.showSubPage("account-selected-make-read-only");
    d.inputById("account-name-confirm").value = "";
    showOKCancel(makeReadOnlyOKClicked, showInitial);
  } else {
    //is ReadOnly
    d.showSubPage("account-selected-make-full-access");
    showOKCancel(makeFullAccessOKClicked, showInitial);
  }
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
  showOKCancel(AddPublicKeyToLockupOKClicked, showInitial);
}

//---------------------------------------
function addNoteClicked() {
  d.hideErr();
  d.showSubPage("account-selected-add-note");
  d.inputById("add-note").value = selectedAccountData.accountInfo.note || "";
  showOKCancel(addNoteOKClicked, showInitial);
}

function contactOptions(ev: Event) {
  if (ev.target && ev.target instanceof HTMLElement) {
    const li = ev.target.closest("li");
    if (li) {
      const quesoy = Number(li.id); // d.getClosestChildText(".account-item", ev.target, ".name");
      console.log(quesoy);
    }
  }
}

function showAdressBook() {
  isMoreOptionsOpen = false;
  d.hideErr();
  AddressBook_show();
}

async function addNoteOKClicked() {
  d.hideErr();
  selectedAccountData.accountInfo.note = d.inputById("add-note").value.trim();
  await saveSelectedAccount();
  showSelectedAccount();
  hideOkCancel();
  showInitial();
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
      selectedAccountData.accountInfo.ownerId || "";

    showOKCancel(AccountDeleteOKClicked, showInitial);
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
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

    const result = await askBackgroundApplyTxAction(
      toDeleteAccName,
      new DeleteAccountToBeneficiary(beneficiary),
      selectedAccountData.name
    );

    //remove from wallet
    await askBackground({
      code: "remove-account",
      accountId: selectedAccountData.name,
    });
    //console.log("remove-account sent ",selectedAccountData.name)
    //return to accounts page
    await AccountPages_show();

    d.showSuccess("Account Deleted, remaining funds sent to " + beneficiary);
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
    const ownerAcc = await getAccountRecord(owner);
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
    showInitial();
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

//-----------------------------------
async function makeReadOnlyOKClicked() {
  try {
    const confirmAccName = d.inputById("account-name-confirm").value;
    if (confirmAccName != selectedAccountData.name) {
      d.showErr("Names don't match");
    } else {
      selectedAccountData.accountInfo.privateKey = undefined;
      await saveSelectedAccount();
      selectedAccountData.accessStatus = "Read Only";
      showSelectedAccount();
      d.showMsg("Account access removed", "success");
      showInitial();
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
      const seedPrhase = words.trim().split(" ");
      checkSeedPhrase(seedPrhase);
      const result = await parseSeedPhraseAsync(seedPrhase);
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
    selectAndShowAccount(selectedAccountData.name);
    d.showMsg("Seed Phrase is correct. Access granted", "success");
    showInitial();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

function showInitial() {
  d.removeGlobalKeyPress();
  showSelectedAccount();
  populateAssets();
  d.showSubPage("assets");
}

/*function maxClicked(id: string, selector: string) {
  const amountElem = new d.El(selector);
  d.inputById(id).value = amountElem.innerText;
}*/

async function removeAccountClicked(ev: Event) {
  try {
    if (selectedAccountData.isFullAccess) {
      //has full access - remove access first
      changeAccessClicked();
      return;
    }

    //remove
    await askBackground({
      code: "remove-account",
      accountId: selectedAccountData.name,
    });
    //return to main page
    Pages.show();
  } catch (ex) {
    d.showErr(ex.message);
  }
}

async function refreshSaveSelectedAccount() {
  await searchAccounts.asyncRefreshAccountInfo(
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
