import * as d from "../util/document.js";
import * as c from "../util/conversions.js";

import * as searchAccounts from "../util/search-accounts.js";
import { isValidAccountID } from "../lib/near-api-lite/utils/valid.js";
import * as Pages from "../pages/main.js";

import { Account, ExtendedAccountData } from "../data/account.js";
import { LockupContract } from "../contracts/LockupContract.js";
import {
  askPrivateKey,
  searchThePools,
  show as AccountSelectedPage_show,
} from "./account-selected.js";
import {
  askBackground,
  askBackgroundAllNetworkAccounts,
  askBackgroundGetNetworkInfo,
  askBackgroundGetValidators,
  askBackgroundSetAccount,
} from "../background/askBackground.js";

import type { NetworkInfo } from "../lib/near-api-lite/network.js";
import { activeNetworkInfo } from "../index.js";

const NET_NAME = "net-name";
const NET_ROOT = "net-root";

const IMPORT_OR_CREATE = "import-or-create";
const IMPORT_ACCOUNT = "import-account";

//const accountName = new d.El("input#account-name");
let messageLine: d.El;
let searchButton: d.El;
let importButton: d.El;
//let accountInfoName = new d.El("#account-info-name");

let accountSearchResults: d.El;
let searchedAccountInfo: d.El;
let searchedLockupInfo: d.El;
let accountGetMessage: d.El;
/*
const accountBalance = new d.El("#account-balance");
const accountBalanceLine = new d.El("#account-balance-line");
const accountStaked = new d.El("#account-staked");
const accountAvailable = new d.El("#account-available");
const accountStakedLine = new d.El("#account-staked-line");
const LockupContractLine = new d.El("#account-lockup-line");
*/

type StateResult = {
  amount: string; // "27101097909936818225912322116"
  block_hash: string; //"DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
  block_height: number; //20046823
  code_hash: string; //"11111111111111111111111111111111"
  locked: string; //"0"
  storage_paid_at: number; // 0
  storage_usage: number; //2080
};

class SearchResult {
  mainAccountName: string = "";
  mainAccount: Account | undefined;
  lockupContract: LockupContract | undefined;
}

let lastSearchResult = new SearchResult();

function hideSearchResultExtraData() {
  accountSearchResults.hide();
  searchedAccountInfo.hide();
  searchedLockupInfo.hide();
  messageLine.hide();
  importButton.hide();

  // accountBalance.innerText = ""
  // accountBalanceLine.hide()
  // LockupContractLine.hide()
  // accountStakedLine.hide()
}

function importExistingAccount() {
  //accountInfoName.innerText=""
  hideSearchResultExtraData();
  d.showPage(IMPORT_ACCOUNT);
}

function displayAccountInfoAt(
  containerId: string,
  templateId: string,
  extendedAccountData: ExtendedAccountData
) {
  d.clearContainer(containerId);
  d.appendTemplate("DIV", containerId, templateId, extendedAccountData);

  const container = new d.El("#" + containerId);
  // if (extendedAccountData.accountInfo.stakingPool) {
  //     container.sub("#staking-pool-info-line").show()
  // }
}

async function searchTheAccountName(accName: string) {
  lastSearchResult = new SearchResult();

  d.showWait();
  try {
    importButton.hide();
    // accountBalance.innerText = ""
    // accountBalanceLine.hide()

    const mainAccInfo = await searchAccounts.searchAccount(accName);

    //accountBalance.innerText = c.toStringDec(acInfo.lastBalance);
    //accountBalanceLine.show()

    importButton.show();
    lastSearchResult.mainAccountName = accName;
    lastSearchResult.mainAccount = mainAccInfo;

    const mainExtData = new ExtendedAccountData(accName, mainAccInfo);
    displayAccountInfoAt(
      "searched-account-info",
      "search-info-account-template",
      mainExtData
    );
    accountSearchResults.show();
    searchedAccountInfo.show();

    //lockup contract?
    let lockupExtData;
    const accInfo = new Account(activeNetworkInfo.name);
    accInfo.ownerId = accName;
    const lockupContract = await searchAccounts.getLockupContract(accInfo);
    if (lockupContract) {
      lastSearchResult.lockupContract = lockupContract;
      lockupExtData = new ExtendedAccountData(
        lockupContract.contractAccount,
        lockupContract.accountInfo
      );
      displayAccountInfoAt(
        "searched-lockup-account-info",
        "search-info-account-template",
        lockupExtData
      );
      searchedLockupInfo.show();
    }

    if (d.qs("#yes-search-the-pools").el.checked) {
      await searchThePools(mainExtData);
      displayAccountInfoAt(
        "searched-account-info",
        "search-info-account-template",
        mainExtData
      );
      //Note: the lockupContract knows how much it has staked, no need to search the pools to get total balance
    }
  } catch (ex) {
    d.showErr(ex.message);
    accountGetMessage.innerText = ex.message;
    accountGetMessage.show();
    accountGetMessage.classList.add("red-bg");
    messageLine.show();
  } finally {
    d.hideWait();
  }
}

async function importIfNew(
  accType: string,
  accName: string,
  accountInfo: Account,
  order: number
): Promise<boolean> {
  const networkAccounts = await askBackgroundAllNetworkAccounts();

  if (networkAccounts && networkAccounts[accName]) {
    d.showErr(`${accType} ${accName} is already in the wallet`);
    //repair: if we found staking pool info and the account in the wallet has no pool associated, we update that info
    const walletInfo = networkAccounts[accName];
    // if (!walletInfo.stakingPool && accountInfo.stakingPool){
    //   walletInfo.stakingPool = accountInfo.stakingPool
    //   walletInfo.staked = accountInfo.staked
    //   walletInfo.unstaked = accountInfo.unstaked
    //   walletInfo.stakingPoolPct = accountInfo.stakingPoolPct
    //   await askBackgroundSetAccount(accName, walletInfo)
    // }
    return false;
  } else {
    //d.showSuccess("Account added: " + accName); //new account
    accountInfo.order = order;
    //console.log("added ",order,accName)
    await askBackgroundSetAccount(accName, accountInfo);
    return true;
  }
}

async function importClicked(ev: Event) {
  ev.preventDefault();
  if (!lastSearchResult.mainAccount || !lastSearchResult.mainAccountName)
    return;

  const networkAccounts = await askBackgroundAllNetworkAccounts();
  let accountOrder = networkAccounts
    ? Object.keys(networkAccounts).length + 1
    : 0;

  let couldNotImport = false;

  const importedMain = await importIfNew(
    "Account",
    lastSearchResult.mainAccountName,
    lastSearchResult.mainAccount,
    accountOrder
  );

  if (!importedMain) couldNotImport = true;

  if (lastSearchResult.lockupContract) {
    const importedLc = await importIfNew(
      "Lockup Contract",
      lastSearchResult.lockupContract.contractAccount,
      lastSearchResult.lockupContract.accountInfo,
      accountOrder + 1
    );
    if (!importedLc) {
      // commented, importIfNew already shows err msg
      //d.showWarn("Lockup account already in wallet")
    }
  }

  if (couldNotImport) {
    //some time to see the error
    setTimeout(Pages.show, 5000);
  } else {
    AccountSelectedPage_show(
      lastSearchResult.mainAccountName,
      "ask_private_key"
    );
  }
}

function nullFunc() {
  //Do nothing
  return;
}

async function searchClicked(ev: Event) {
  try {
    (<HTMLInputElement>d.byId("search-account-name")).disabled = true;
    ev.preventDefault();
    hideSearchResultExtraData();
    // accountBalance.innerText = ""
    // LockupContractLine.hide()
    // accountStakedLine.hide()

    // let accName = accountInfoName.innerText; //d.byId(ACCOUNT_INFO_NAME).innerText;
    const input = d.inputById("search-account-name");
    let accName = input.value.trim().toLowerCase();
    const root = activeNetworkInfo.rootAccount;
    if (
      accName &&
      accName.length < 60 &&
      !accName.endsWith(root) &&
      !(activeNetworkInfo.name == "testnet" && /dev-[0-9]{13}-[0-9]{7}/.test(accName))
    ) {
      accName = accName + "." + root;
    }

    if (!accName) {
      d.showErr("Enter the account to search for");
    } else if (!isValidAccountID(accName)) {
      d.showErr("The account name is invalid");
    } else {
      searchTheAccountName(accName);
    }
  } finally {
    (<HTMLInputElement>d.byId("search-account-name")).disabled = false;
  }
}

// function accountNameInput(ev :Event) {
//   //enable create button when terms accepted
//   const input = ev.target as HTMLInputElement
//   hideSearchResultExtraData()
//   searchButton.disabled = (input.value == "")
//   if (input.value && input.value.length > 32) { //implicit account or large name account
//     accountInfoName.innerText = input.value;
//   }
//   else {
//     let accName = input.value
//     const root = Network.currentInfo().rootAccount
//     if (!accName.endsWith(root)) accName=accName+ "." +root
//     accountInfoName.innerText = accName
//   }
//   messageLine.hide()
// }

export async function onNetworkChanged(info: NetworkInfo) {
  if (!info) {
    //console.log("!info")
    return;
  }
  //update .root-account
  d.byId(NET_NAME).innerText = info.name; //search button
  d.byId(NET_ROOT).innerText = "." + info.rootAccount; //account name label
}

function createAccountClicked(ev: Event) {
  //d.showPage(CREATE_ACCOUNT)
}

// on document load
export async function addListeners() {
  //const accountName = new d.El("input#account-name");
  messageLine = new d.El("#account-get-message-line");
  searchButton = new d.El("button#search");
  importButton = new d.El("button#import");
  //accountInfoName = new d.El("#account-info-name");

  accountSearchResults = new d.El("#account-search-results");
  searchedAccountInfo = new d.El("#searched-account-info");
  searchedLockupInfo = new d.El("#searched-lockup-account-info");
  accountGetMessage = new d.El("#account-get-message");

  d.onClickId("option-import", importExistingAccount);
  d.onClickId("option-create", createAccountClicked);
  d.onEnterKey("search-account-name", searchClicked);

  //accountName.onInput(accountNameInput);

  searchButton.onClick(searchClicked);
  importButton.onClick(importClicked);

  onNetworkChanged(await askBackgroundGetNetworkInfo());
}

//listen to extension messages
chrome.runtime.onMessage.addListener(function (msg) {
  if (msg.code == "network-changed") {
    onNetworkChanged(msg.networkInfo);
  }
});
