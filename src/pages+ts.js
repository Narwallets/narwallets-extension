import * as d from "./common+ts.js"
import * as global from "./global+ts.js"

//--- content sections at MAIN popup.html
export const WELCOME_NEW_USER = "welcome-new-user-page"
export const CREATE_PASS = "create-pass"

export const UNLOCK_PAGE = "unlock-page"
export const UNLOCK = "unlock"

export const MAIN = "main-page"
export const ADD_ACCOUNT = "add-account"
export const IMPORT_OR_CREATE = "import-or-create"


export const ACCOUNTS_LIST = "accounts-list"
export const ACCOUNT_ITEM_TEMPLATE = "account-item-template"
export const ACCOUNT_ITEM = "account-item"

export function showMain() {
  //build DOM accounts list
  if (!global.SecureState.accounts || Object.keys(global.SecureState.accounts).length == 0) {
    d.showPage(IMPORT_OR_CREATE)
  }
  else {
    populateLI(ACCOUNTS_LIST, ACCOUNT_ITEM_TEMPLATE, global.SecureState.accounts)
    d.showPage(MAIN)
  }
}

export function populateLI(containerId/*:string*/, templateId/*:string*/, dataArray/*:Record<string,any>*/) {
  const listContainer = d.byId(containerId)
  if (dataArray) {
    for (let inx in dataArray) {
      const dataItem = {
          key: inx, ...dataArray[inx]
      } 
      const newLI = document.createElement("LI")  /*+as HTMLLIElement+*/
      newLI.innerHTML = d.templateReplace(templateId, dataItem)
      listContainer.appendChild(newLI)
    }
  }
}

