import * as d from "../util/document.js"
import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import * as Network from "../data/Network.js"
import * as near from "../util/near-accounts.js"
import {isValidAccountID} from "../api/near-rpc.js"
import * as Pages from "../pages/main.js"

import { Account, ExtendedAccountData } from "../data/Account.js"
import { LockupContract } from "../contracts/LockupContract.js"
import {searchThePools} from "./account-selected.js"

/*+
import type { NetworkInfo} from "../data/Network.js"
+*/

const NET_NAME = "net-name"
const NET_ROOT = "net-root"

const IMPORT_OR_CREATE = "import-or-create"
const IMPORT_ACCOUNT ="import-account"

//const accountName = new d.El("input#account-name");
const messageLine = new d.El("#account-get-message-line");
const searchButton = new d.El("button#search");
const importButton = new d.El("button#import");
//const accountInfoName = new d.El("#account-info-name");

const accountSearchResults = new d.El("#account-search-results");
const searchedAccountInfo = new d.El("#searched-account-info");
const searchedLockupInfo = new d.El("#searched-lockup-account-info");
const accountGetMessage = new d.El("#account-get-message");
/*
const accountBalance = new d.El("#account-balance");
const accountBalanceLine = new d.El("#account-balance-line");
const accountStaked = new d.El("#account-staked");
const accountAvailable = new d.El("#account-available");
const accountStakedLine = new d.El("#account-staked-line");
const LockupContractLine = new d.El("#account-lockup-line");
*/

/*+
type StateResult={
    amount: string; // "27101097909936818225912322116"
    block_hash: string; //"DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
    block_height: number; //20046823
    code_hash: string; //"11111111111111111111111111111111"
    locked: string; //"0"
    storage_paid_at: number; // 0
    storage_usage: number; //2080
}
+*/

class SearchResult {
  mainAccountName /*:string*/=""
  mainAccount /*:Account|undefined*/
  lockupContract /*:LockupContract|undefined*/
}

let lastSearchResult = new SearchResult();

function hideSearchResultExtraData() {
  accountSearchResults.hide()
  searchedAccountInfo.hide()
  searchedLockupInfo.hide()
  messageLine.hide()
  importButton.hide()


  // accountBalance.innerText = ""
  // accountBalanceLine.hide()
  // LockupContractLine.hide()
  // accountStakedLine.hide()
}

function importExistingAccount() {
  //accountInfoName.innerText=""
  hideSearchResultExtraData()
  d.showPage(IMPORT_ACCOUNT)
}

function displayAccountInfoAt(containerId /*:string*/, templateId /*:string*/, extendedAccountData/*:ExtendedAccountData*/) {

    d.clearContainer(containerId)
    d.appendTemplate("DIV",containerId, templateId, extendedAccountData)

    const container = new d.El("#" + containerId)
    if (extendedAccountData.accountInfo.stakingPool) {
        container.sub("#staking-pool-info-line").show()
    }
}

async function searchTheAccountName(accName/*:string*/) {

  lastSearchResult=new SearchResult()

  d.showWait()
  try {

    importButton.hide()
    // accountBalance.innerText = ""
    // accountBalanceLine.hide()

    const mainAccInfo = await near.searchAccount(accName)

    //accountBalance.innerText = c.toStringDec(acInfo.lastBalance);
    //accountBalanceLine.show()

    importButton.show()
    lastSearchResult.mainAccountName = accName;
    lastSearchResult.mainAccount = mainAccInfo

    const mainExtData = new ExtendedAccountData(accName,mainAccInfo)
    displayAccountInfoAt("searched-account-info","search-info-account-template",mainExtData)
    accountSearchResults.show()
    searchedAccountInfo.show()

    //lockup contract?
    let lockupExtData;
    const accInfo = new Account()
    accInfo.ownerId = accName
    const lockupContract = await near.getLockupContract(accInfo)
    if (lockupContract){
      lastSearchResult.lockupContract = lockupContract
      lockupExtData= new ExtendedAccountData(lockupContract.contractAccount, lockupContract.accountInfo)
      displayAccountInfoAt("searched-lockup-account-info","search-info-account-template",lockupExtData)
      searchedLockupInfo.show()
    }

    if (d.qs("#yes-search-the-pools").el.checked){
      await searchThePools(mainExtData)
      displayAccountInfoAt("searched-account-info","search-info-account-template",mainExtData)
      //Note: the lockupContract knows how much it has staked, no need to search at this point to get total balance
    }

  }
  catch(ex){
    d.showErr(ex.message)
    accountGetMessage.innerText = ex.message
    accountGetMessage.show()
    accountGetMessage.classList.add("red-bg")
    messageLine.show()
}
  finally {
    d.hideWait()
  }
}

function importIfNew(accType/*:string*/, accName/*:string*/,accountInfo/*:Account*/, order/*:number*/){

  const networkAccounts = global.SecureState.accounts[Network.current]

  if (networkAccounts && networkAccounts[accName]){
    d.showErr(`${accType} ${accName} is already in the wallet`)
    return 0;
    }
  else  {
    d.showSuccess("Account added: "+accName)//new account
    accountInfo.order = order
    console.log("added ",order,accName)
    global.saveAccount(accName, accountInfo);
    return 1;
    }
}

function importClicked(ev /*:Event*/) {

  ev.preventDefault();
  if (!lastSearchResult.mainAccount || !lastSearchResult.mainAccountName) return;

  const networkAccounts = global.SecureState.accounts[Network.current]
  let accountOrder = networkAccounts? Object.keys(networkAccounts).length+1: 0

  let importedCount=0;
  
  importedCount+=importIfNew("Account", 
    lastSearchResult.mainAccountName,
    lastSearchResult.mainAccount, accountOrder)

  if (lastSearchResult.lockupContract) {
    importedCount+=importIfNew("Lockup Contract",
      lastSearchResult.lockupContract.contractAccount,
      lastSearchResult.lockupContract.accountInfo, accountOrder+1)
  }

  if (importedCount==0){
    //some time to see the error
    setTimeout(Pages.showMain,5000)
  }
  else {
    Pages.showMain()
  }
}

async function searchClicked(ev /*:Event*/) {
  ev.preventDefault();
  hideSearchResultExtraData()
  // accountBalance.innerText = ""
  // LockupContractLine.hide()
  // accountStakedLine.hide()

  // let accName = accountInfoName.innerText; //d.byId(ACCOUNT_INFO_NAME).innerText;
  const input = d.inputById("search-account-name")
  let accName = input.value.trim().toLowerCase()
  const root = Network.currentInfo().rootAccount
  if (accName && !accName.endsWith(root)) accName=accName+ "." +root

  if (!accName) {
    d.showErr("Enter the account to search for")
  }
  else if (!isValidAccountID(accName)) {
    d.showErr("The account name is invalid")
  }
  else  {
    searchTheAccountName(accName);
  }
}


// function accountNameInput(ev /*:Event*/) {
//   //enable create button when terms accepted
//   const input = ev.target /*+as HTMLInputElement+*/
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

function onNetworkChanged(data/*:NetworkInfo*/) {
  d.byId(NET_NAME).innerText = Network.current; //serach button
  d.byId(NET_ROOT).innerText = "." + Network.currentInfo().rootAccount; //account name label
}

function createAccountClicked(ev /*:Event*/) {
  //d.showPage(CREATE_ACCOUNT)
}

// on document load
export function addListeners() {

  d.onClickId("option-import", importExistingAccount);
  d.onClickId("option-create", createAccountClicked);

  //accountName.onInput(accountNameInput);

  searchButton.onClick(searchClicked);
  importButton.onClick(importClicked);


  onNetworkChanged(Network.currentInfo());
  Network.changeListeners["import-page"] = onNetworkChanged

}
