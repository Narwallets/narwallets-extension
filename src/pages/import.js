import * as d from "../util/document.js"
import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import * as Network from "../data/Network.js"
import * as near from "../util/near-accounts.js"
import * as Pages from "../pages/main.js"

import { LockupContract } from "../contracts/LockupContract.js"

let EmptySearchAccountResult/*:near.SearchAccountResult*/={
  accName: "",
  accountInfo: undefined,
  foundLockupContract: undefined,
  error: "not searched"
}
let searchAccountResult = EmptySearchAccountResult;


/*+
import type { NetworkInfo} from "../data/Network.js"
+*/

const NET_NAME = "net-name"
const NET_ROOT = "net-root"

const accountName = new d.El("input#account-name");
const messageLine = new d.El("#account-get-message-line");
const searchButton = new d.El("button#search");
const importButton = new d.El("button#import");
const accountInfoName = new d.El("#account-info-name");
const accountBalance = new d.El("#account-balance");
const accountBalanceLine = new d.El("#account-balance-line");
const accountStaked = new d.El("#account-staked");
const accountAvailable = new d.El("#account-available");
const accountStakedLine = new d.El("#account-staked-line");
const LockupContractLine = new d.El("#account-lockup-line");
const accountGetMessage = new d.El("#account-get-message");

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


export async function searchAccount(accName/*:string*/) {

  d.showWait()
  try {

    searchAccountResult = await near.searchAccount(accName)

    if (searchAccountResult.error || searchAccountResult.accountInfo==undefined){
      importButton.disabled = true;
      accountBalance.innerText = ""
      accountBalanceLine.hide()
      d.showErr(searchAccountResult.error);
      accountGetMessage.innerText = searchAccountResult.error
      accountGetMessage.show()
      accountGetMessage.classList.add("red-bg")
      messageLine.show()
      return;
    }

    const acInfo = searchAccountResult.accountInfo
    accountBalance.innerText = c.toStringDec(acInfo.lastBalance);
    accountBalanceLine.show()

    accountStaked.innerText = c.toStringDec(acInfo.staked);
    accountAvailable.innerText = c.toStringDec(acInfo.lastBalance-acInfo.staked)
    accountStakedLine.show()

    importButton.disabled = false;


    //lockup contract found?
    if (searchAccountResult.foundLockupContract){
      //lockupBalance.text =`${ownerBalance} / ${liquidBalance} / ${lockedAmount}`
      //lockupBalance.text =`${liquidBalance} / ${lockedAmount}`
      LockupContractLine.el.innerHTML = `
                <label>Lockup Contract Balance</label>
                <div class="balance">${searchAccountResult.foundLockupContract.totalBalance}</div>
                `
      LockupContractLine.show()
    }

  }
  catch(ex){
    d.showErr(ex.message)
  }
  finally {
    d.hideWait()
  }

}


async function searchClicked(ev /*:Event*/) {
  ev.preventDefault();
  accountBalance.innerText = ""
  messageLine.hide()
  LockupContractLine.hide()
  accountStakedLine.hide()

  const accName = accountInfoName.innerText; //d.byId(ACCOUNT_INFO_NAME).innerText;
  searchAccount(accName);
}

function accountNameInput(ev /*:Event*/) {
  //enable create button when terms accepted
  const input = ev.target /*+as HTMLInputElement+*/
  searchButton.disabled = (input.value == "")
  accountBalance.innerText = ""
  accountBalanceLine.hide()
  LockupContractLine.hide()
  accountStakedLine.hide()
  if (input.value && input.value.length > 32) { //implicit account or large name account
    accountInfoName.innerText = input.value;
  }
  else {
    accountInfoName.innerText = input.value + "." + Network.currentInfo().rootAccount;
  }
  messageLine.hide()
}

function importClicked(ev /*:Event*/) {

  ev.preventDefault();
  if (searchAccountResult.error || !searchAccountResult.accountInfo) return;

  near.saveFoundAccounts(searchAccountResult);

  Pages.showMain()
}

function onNetworkChanged(data/*:NetworkInfo*/) {
  d.byId(NET_NAME).innerText = Network.current; //serach button
  d.byId(NET_ROOT).innerText = "." + Network.currentInfo().rootAccount; //account name label
}

// on document load
export function addListeners() {

  accountName.onInput(accountNameInput);

  searchButton.onClick(searchClicked);
  importButton.onClick(importClicked);


  onNetworkChanged(Network.currentInfo());
  Network.changeListeners["import-page"] = onNetworkChanged

}
