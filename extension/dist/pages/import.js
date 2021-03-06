import * as d from "../util/document.js";
import * as searchAccounts from "../util/search-accounts.js";
import { isValidAccountID } from "../api/utils/valid.js";
import * as Pages from "../pages/main.js";
import { Account, ExtendedAccountData } from "../api/account.js";
import { searchThePools } from "./account-selected.js";
import { askBackgroundAllNetworkAccounts, askBackgroundGetNetworkInfo, askBackgroundSetAccount } from "../api/askBackground.js";
const NET_NAME = "net-name";
const NET_ROOT = "net-root";
const IMPORT_OR_CREATE = "import-or-create";
const IMPORT_ACCOUNT = "import-account";
//const accountName = new d.El("input#account-name");
const messageLine = new d.El("#account-get-message-line");
const searchButton = new d.El("button#search");
const importButton = new d.El("button#import");
//const accountInfoName = new d.El("#account-info-name");
const accountSearchResults = new d.El("#account-search-results");
const searchedAccountInfo = new d.El("#searched-account-info");
const searchedLockupInfo = new d.El("#searched-lockup-account-info");
const accountGetMessage = new d.El("#account-get-message");
class SearchResult {
    constructor() {
        this.mainAccountName = "";
    }
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
function displayAccountInfoAt(containerId, templateId, extendedAccountData) {
    d.clearContainer(containerId);
    d.appendTemplate("DIV", containerId, templateId, extendedAccountData);
    const container = new d.El("#" + containerId);
    if (extendedAccountData.accountInfo.stakingPool) {
        container.sub("#staking-pool-info-line").show();
    }
}
async function searchTheAccountName(accName) {
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
        displayAccountInfoAt("searched-account-info", "search-info-account-template", mainExtData);
        accountSearchResults.show();
        searchedAccountInfo.show();
        //lockup contract?
        let lockupExtData;
        const accInfo = new Account();
        accInfo.ownerId = accName;
        const lockupContract = await searchAccounts.getLockupContract(accInfo);
        if (lockupContract) {
            lastSearchResult.lockupContract = lockupContract;
            lockupExtData = new ExtendedAccountData(lockupContract.contractAccount, lockupContract.accountInfo);
            displayAccountInfoAt("searched-lockup-account-info", "search-info-account-template", lockupExtData);
            searchedLockupInfo.show();
        }
        if (d.qs("#yes-search-the-pools").el.checked) {
            await searchThePools(mainExtData);
            displayAccountInfoAt("searched-account-info", "search-info-account-template", mainExtData);
            //Note: the lockupContract knows how much it has staked, no need to search the pools to get total balance
        }
    }
    catch (ex) {
        d.showErr(ex.message);
        accountGetMessage.innerText = ex.message;
        accountGetMessage.show();
        accountGetMessage.classList.add("red-bg");
        messageLine.show();
    }
    finally {
        d.hideWait();
    }
}
async function importIfNew(accType, accName, accountInfo, order) {
    const networkAccounts = await askBackgroundAllNetworkAccounts();
    if (networkAccounts && networkAccounts[accName]) {
        d.showErr(`${accType} ${accName} is already in the wallet`);
        //repair: if we found staking pool info and the account in the wallet has no pool associated, we update that info
        const walletInfo = networkAccounts[accName];
        if (!walletInfo.stakingPool && accountInfo.stakingPool) {
            walletInfo.stakingPool = accountInfo.stakingPool;
            walletInfo.staked = accountInfo.staked;
            walletInfo.unstaked = accountInfo.unstaked;
            walletInfo.stakingPoolPct = accountInfo.stakingPoolPct;
            await askBackgroundSetAccount(accName, walletInfo);
        }
        return false;
    }
    else {
        d.showSuccess("Account added: " + accName); //new account
        accountInfo.order = order;
        console.log("added ", order, accName);
        await askBackgroundSetAccount(accName, accountInfo);
        return true;
    }
}
async function importClicked(ev) {
    ev.preventDefault();
    if (!lastSearchResult.mainAccount || !lastSearchResult.mainAccountName)
        return;
    const networkAccounts = await askBackgroundAllNetworkAccounts();
    let accountOrder = networkAccounts ? Object.keys(networkAccounts).length + 1 : 0;
    let couldNotImport = false;
    const importedMain = await importIfNew("Account", lastSearchResult.mainAccountName, lastSearchResult.mainAccount, accountOrder);
    if (!importedMain)
        couldNotImport = true;
    if (lastSearchResult.lockupContract) {
        const importedLc = await importIfNew("Lockup Contract", lastSearchResult.lockupContract.contractAccount, lastSearchResult.lockupContract.accountInfo, accountOrder + 1);
        if (!importedLc)
            couldNotImport = true;
    }
    if (couldNotImport) {
        //some time to see the error
        setTimeout(Pages.show, 5000);
    }
    else {
        Pages.show();
    }
}
async function searchClicked(ev) {
    ev.preventDefault();
    hideSearchResultExtraData();
    // accountBalance.innerText = ""
    // LockupContractLine.hide()
    // accountStakedLine.hide()
    // let accName = accountInfoName.innerText; //d.byId(ACCOUNT_INFO_NAME).innerText;
    const input = d.inputById("search-account-name");
    let accName = input.value.trim().toLowerCase();
    const netInfo = await askBackgroundGetNetworkInfo();
    const root = netInfo.rootAccount;
    if (accName
        && accName.length < 60
        && !accName.endsWith(root)
        && !(netInfo.name == 'testnet' && /dev-[0-9]{13}-[0-9]{7}/.test(accName))) {
        accName = accName + "." + root;
    }
    if (!accName) {
        d.showErr("Enter the account to search for");
    }
    else if (!isValidAccountID(accName)) {
        d.showErr("The account name is invalid");
    }
    else {
        searchTheAccountName(accName);
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
async function onNetworkChanged(info) {
    if (!info) {
        console.error("!info");
        return;
    }
    //update .root-account
    d.byId(NET_NAME).innerText = info.name; //search button
    d.byId(NET_ROOT).innerText = "." + info.rootAccount; //account name label
}
function createAccountClicked(ev) {
    //d.showPage(CREATE_ACCOUNT)
}
// on document load
export async function addListeners() {
    d.onClickId("option-import", importExistingAccount);
    d.onClickId("option-create", createAccountClicked);
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
