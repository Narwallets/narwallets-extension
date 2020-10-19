import * as d from "./common+ts.js"
import * as global from "./data/global+ts.js"
import * as Network from "./data/Network+ts.js"

import { accountItemClicked } from "./index+ts.js"

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
  d.populateLI(ACCOUNTS_LIST, ACCOUNT_ITEM_TEMPLATE, global.SecureState.accounts[Network.current])

  let total = 0;
  //connect all item to accountItemClicked
  document.querySelectorAll(".account-item").forEach((item) => {
    item.addEventListener("click", accountItemClicked)
    let balanceNum = 0;
    try {
      balanceNum = Number(d.getChildText(item, ".acc-value.balance"))
    } catch { balanceNum = 0 }
    if (isNaN(balanceNum)) balanceNum = 0;
    total += balanceNum;
  });

  //show total
  const totalEl = new d.El(".acc-value.balance.total");
  let text1e4N = Math.round(total * 10000).toString();
  totalEl.text = text1e4N.slice(0, -4) + "." + text1e4N.slice(-4);
  d.showPage(MAIN)

}



