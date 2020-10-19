import * as d from "../common+ts.js"
import * as global from "../data/global+ts.js"
import * as Network from "../data/Network+ts.js"
import * as near from "../util/jsonRpc/near+ts.js"
import * as Pages from "../pages+ts.js"

/*+
import type { anyElement } from "../common+ts.js"
+*/

let accountInfoName/*:d.El*/;
let accountBalance/*:d.El*/;
let sendButton/*:d.El*/;
let removetButton/*:d.El*/;

// page init
export function initPage() {
  
  //accountAmount.onInput(amountInput);
  
 accountInfoName=new d.El("#selected-account .name");
 accountBalance=new d.El("#selected-account .balance");
 sendButton=new d.El("button#send");
 removetButton=new d.El("button#remove");

  const backLink=new d.El("#account-selected .back-link");
  backLink.onClick(Pages.showMain);

  sendButton.onClick(sendClicked);
  removetButton.onClick(removeClicked);

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
  accountBalance.text = d.yton(data.amount);
  //accountBalanceLine.show()
  //messageLine.hide()
  //removetButton.disabled=false;
}

function jsonRpcFailed(reason/*:any*/){
  removetButton.disabled=true;
  accountBalance.text = ""
  //accountBalanceLine.hide()
  if (typeof reason=="string") reason=reason.replace("while viewing","")
  d.showErr(reason.toString());
  //accountGetMessage.text=reason.toString()
  //accountGetMessage.show()
  //accountGetMessage.classList.add("red-bg")
  //messageLine.show()
}

function sendClicked(ev /*:Event*/) {
  ev.preventDefault();
  d.hideErr()
  const accName=accountInfoName.text; //d.byId(ACCOUNT_INFO_NAME).innerText;

  d.showWait()
  near.state(accName)
    .then(stateReceived)
    .catch(jsonRpcFailed)
    .finally(d.hideWait)
}

function amountInput(ev /*:Event*/) {
  //enable create button when terms accepted
  const input = ev.target /*+as HTMLInputElement+*/
  sendButton.disabled = (input.value=="")
  accountBalance.text=""
  //accountBalanceLine.hide()
  //messageLine.hide()
}

function removeClicked(ev /*:Event*/) {

  ev.preventDefault();

  const accName=accountInfoName.text; //d.byId(ACCOUNT_INFO_NAME).innerText;

  // if (Array.isArray(global.SecureState.accounts)) { //fix model change
  //   global.SecureState.accounts={accName:{type:"del"}};
  // }
  
  if (!global.SecureState.accounts[accName]) return d.showErr("The account is not in the wallet")
  delete global.SecureState.accounts[accName]; //remove
  global.saveSecureState()
  Pages.showMain()
}

