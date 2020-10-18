import * as d from "../common+ts.js"
import * as global from "../global+ts.js"
import * as near from "../util/jsonRpc/near+ts.js"
import * as Pages from "../pages+ts.js"

const NET_NAME="net-name"
const NET_ROOT="net-root"

const accountName=new d.El("input#account-name");
const messageLine=new d.El("#account-get-message-line");
const searchButton=new d.El("button#search");
const importButton=new d.El("button#import");
const accountInfoName=new d.El("#account-info-name");
const accountBalance=new d.El("#account-balance");
const accountBalanceLine=new d.El("#account-balance-line");
const accountGetMessage=new d.El("#account-get-message");

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
  accountBalance.text = d.yton(data.amount);
  accountBalanceLine.show()
  messageLine.hide()
  importButton.disabled=false;
}

function jsonRpcFailed(reason/*:any*/){
  importButton.disabled=true;
  accountBalance.text = ""
  accountBalanceLine.hide()
  if (typeof reason=="string") reason=reason.replace("while viewing","")
  d.showErr(reason.toString());
  accountGetMessage.text=reason.toString()
  accountGetMessage.show()
  accountGetMessage.classList.add("red-bg")
  messageLine.show()
}

function searchClicked(ev /*:Event*/) {
  ev.preventDefault();
  d.hideErr()
  const accName=accountInfoName.text; //d.byId(ACCOUNT_INFO_NAME).innerText;

  d.showWait()
  near.state(accName)
    .then(stateReceived)
    .catch(jsonRpcFailed)
    .finally(d.hideWait)
}

function accountNameInput(ev /*:Event*/) {
  //enable create button when terms accepted
  const input = ev.target /*+as HTMLInputElement+*/
  searchButton.disabled = (input.value=="")
  accountBalance.text=""
  accountBalanceLine.hide()
  accountInfoName.text = input.value+"."+global.State.networkRootAccount;
  messageLine.hide()
}

function importClicked(ev /*:Event*/) {

  ev.preventDefault();

  const accName=accountInfoName.text; //d.byId(ACCOUNT_INFO_NAME).innerText;

  if (global.SecureState.accounts[accName]) return d.showErr("The account is already in the wallet")
  global.SecureState.accounts[accName] = 
    { type: "acc",
      stakingPool: "",
      lockingContract: ""
    }
  global.saveSecureState()
  Pages.showMain()
}

// on document load
export function addListeners() {
  
  accountName.onInput(accountNameInput);
  
  searchButton.onClick(searchClicked);
  importButton.onClick(importClicked);

  d.byId(NET_NAME).innerText = global.State.network;
  d.byId(NET_ROOT).innerText = "."+global.State.networkRootAccount;

}
