import * as d from "../common+ts.js"
import * as global from "../global+ts.js"
import * as near from "../util/jsonRpc/near+ts.js"

const NET_NAME="net-name"
const NET_ROOT="net-root"
const SEARCH="search"
const ACCOUNT_NAME = "account-name"

const ACCOUNT_INFO_NAME="account-info-name"
const ACCOUNT_BALANCE = "account-balance"

function accountNameInput(ev /*:Event*/) {
  //enable create button when terms accepted
  const input = ev.target /*+as HTMLInputElement+*/
  d.textById(SEARCH).disabled = (input.value=="");
  d.byId(ACCOUNT_INFO_NAME).innerText=input.value+"."+global.State.networkRootAccount;
}

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

function stateReceived(data/*:StateResult*/){
  d.byId(ACCOUNT_BALANCE).innerText=d.yton(data.amount)
  d.textById(d.IMPORT).disabled = false;
}

function jsonRpcFailed(reason/*:any*/){
  d.textById(d.IMPORT).disabled = true;
  d.byId(ACCOUNT_BALANCE).innerText=""
  d.showErr(reason);
}

function searchClicked(ev /*:Event*/) {
  ev.preventDefault();
  const accName=d.byId(ACCOUNT_INFO_NAME).innerText;

  d.showWait()
  near.state(accName)
    .then(stateReceived)
    .catch(jsonRpcFailed)
    .finally(d.hideWait)
}

function importClicked(ev /*:Event*/) {
  ev.preventDefault();
  const accName=d.byId(ACCOUNT_INFO_NAME).innerText;
  global.SecureState.accounts.push(
    { type: "acc",
      name: accName,
      stakingPool: "",
      lockingContract: ""
    })
  global.saveSecureState()
}

// on document load
document.addEventListener('DOMContentLoaded', () => {
  
  d.byId(ACCOUNT_NAME).addEventListener(d.INPUT, accountNameInput);
  d.byId(SEARCH).addEventListener(d.CLICK, searchClicked);
  d.byId(d.IMPORT).addEventListener(d.CLICK, importClicked);

  d.byId(NET_NAME).innerText = global.State.network;
  d.byId(NET_ROOT).innerText = "."+global.State.networkRootAccount;

});
