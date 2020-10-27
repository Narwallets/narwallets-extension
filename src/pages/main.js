import * as d from "../util/document.js"
import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import * as Network from "../data/Network.js"
import { show as AccountSelectedPage_show } from "./account-selected.js"

//--- content sections at MAIN popup.html
export const WELCOME_NEW_USER = "welcome-new-user-page"
export const CREATE_PASS = "create-pass"

export const UNLOCK = "unlock"

export const MAIN = "main-page"
export const ADD_ACCOUNT = "add-account"
export const IMPORT_OR_CREATE = "import-or-create"


export const ACCOUNTS_LIST = "accounts-list"
export const ACCOUNT_ITEM_TEMPLATE = "account-item-template"
export const ACCOUNT_ITEM = "account-item"

//--------------------------
export function showMain() {
  
  d.hideErr()
  
  //logged and with no accounts? add one
  if (global.unlocked && Object.keys(global.SecureState.accounts).length == 0) {
    d.showPage(IMPORT_OR_CREATE)
    return;
  }
  if (!global.unlocked) {
    d.showPage(UNLOCK)
    return;
  }

  d.clearContainer(ACCOUNTS_LIST);
  d.populateUL(ACCOUNTS_LIST, ACCOUNT_ITEM_TEMPLATE, global.SecureState.accounts[Network.current])

  let total = 0;
  //connect all item to accountItemClicked
  document.querySelectorAll("#accounts-list .account-item").forEach((item) => {
    item.addEventListener("click", accountItemClicked)
    let balanceNum = 0;
    try {
      balanceNum = c.toNum(d.getChildText(item, ".balance"))
    } catch { balanceNum = 0 }
    if (isNaN(balanceNum)) balanceNum = 0;
    total += balanceNum;
  });

  //show total
  const totalEl = new d.El("#main-page .balance.total");
  totalEl.innerText = c.toStringDec(total);
  d.showPage(MAIN)

}


//---------------------------------------------------
//-- account item clicked => account selected Page --
//---------------------------------------------------
export function accountItemClicked(ev/*:Event*/) {
  const accName = d.getClosestChildText(".account-item", ev.target, ".name");
  if (!accName) return;
  AccountSelectedPage_show(accName);
}

