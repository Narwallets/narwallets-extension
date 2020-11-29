import * as d from "./util/document.js"
import * as Pages from "./pages/main.js"
import {NetworkList} from "./api/network.js"

import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js"
import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js"
import { addListeners as Import_addListeners } from "./pages/import.js"

import { show as AccountSelectedPage_show } from "./pages/account-selected.js"
import { localStorageGet, localStorageGetAndRemove, localStorageRemove, localStorageSet } from "./data/util.js"
import { askBackground, askBackgroundGetNetworkInfo, askBackgroundGetState, askBackgroundSetNetwork } from "./api/askBackground.js"
import { functionCall } from "./api/transaction.js"
import { isValidEmail } from "./api/utils/valid.js"

/*+
import * as bip39 from "./bundled-types/bip39-light"
import type { NetworkInfo} from "./api/network.js"
+*/

const AUTO_LOCK_SECONDS = 15; //auto-lock wallet after 1hr

//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_USER = "create-user"

const UNLOCK = "unlock"

const MAIN_PAGE = "main-page"
const ADD_ACCOUNT = "add-account"
const IMPORT_OR_CREATE = "import-or-create"


const TYPE = "type"
const NAME = "name"
const BALANCE = "balance"
const STAKED = "staked"
const AVAILABLE = "available"

const SELECT_NETWORK = "select-network"
const DATA_CODE = "data-code"
const NETWORKS_LIST = "networks-list"

const hamb = new d.El(".hamb")
const aside = new d.El("aside")

const currentNetworkDisplayName = new d.El("#current-network-display-name");

// function clicked(ev /*:Event*/) {
//   console.log("click!");
//   console.log(ev);
//   chrome.runtime.getBackgroundPage(function (backgroundPageWindow /*+?: Window+*/ ) {
//     if (backgroundPageWindow!=undefined) {
//       const bp = backgroundPageWindow /*+ as unknown as BackgroundPage +*/;
//       let result = bp.backgroundFunction("Get Posts click!");
//       console.log("background page says: ", result);
//     }

//   })
// }

function onNetworkChanged(info/*:NetworkInfo*/) {
  //update indicator visual state
  currentNetworkDisplayName.innerText = info.displayName //set name
  currentNetworkDisplayName.el.className = "circle " + info.color //set indicator color
}

async function networkItemClicked(e /*:Event*/) {
  try {
    //console.log(e.target.getAttribute("data-code"))
    if (!e.target) return;

    /*+if (!(e.target instanceof HTMLElement)) return;+*/
    const networkName = e.target.getAttribute(DATA_CODE)
    if (!networkName) return;

    //update indicator visual state & global state (background)
    await askBackgroundSetNetwork(networkName)

    //close dropdown
    closeDropDown(NETWORKS_LIST) //close 

    const global = await askBackgroundGetState()
    if (!global.unlocked) {
      d.showPage(UNLOCK);
      return;
    }

    Pages.showMain(); //refresh accounts list

  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

function closeDropDown(id/*:string*/) /*:void*/ {
  d.byId(id).classList.remove(d.OPEN); //hides
}

function selectNetworkClicked(ev /*:Event*/) {
  const selectionBox = d.byId(NETWORKS_LIST)
  if (selectionBox == undefined) return;
  if (selectionBox.classList.contains(d.OPEN)) {
    closeDropDown(NETWORKS_LIST) //close
    return;
  }
  //open drop down box
  selectionBox.classList.add(d.OPEN)
  selectionBox.querySelectorAll("li").forEach((li/*:HTMLElement*/) => {
    li.addEventListener(d.CLICK, networkItemClicked)
  });
}

function welcomeCreatePassClicked() {
  d.showPage(CREATE_USER)
}

async function unlockClicked(ev /*:Event*/) {

  const emailEl = d.inputById("unlock-email")
  const passEl = d.inputById("unlock-pass")

  const email = emailEl.value
  if (!isValidEmail(email)) {
    d.showErr("Invalid email");
    return;
  }

  const password = passEl.value;
  passEl.value = ""

  try {
    await askBackground({code:"unlockSecureState",email:email, password:password})
    await Pages.showMain()
    const numAccounts=await askBackground({code:"getNetworkAccountsCount"})
    if (numAccounts == 0) {
      d.showPage(IMPORT_OR_CREATE); //auto-add account after unlock
    }
    else {
      tryReposition(); //try reposition
    }
  }
  catch (ex) {
    d.showErr(ex.message);
  }

}

function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

async function asideLock() {
  await askBackground({code:"lock"})
  hambClicked();
  d.showPage(UNLOCK)
  const state=await askBackgroundGetState()
  d.inputById("unlock-email").value = state.currentUser;

}
function asideAccounts() {
  hambClicked();
  Pages.showMain();
}

async function asideIsUnlocked() {
  hambClicked();
  const state=await askBackgroundGetState()
  if (!state.unlocked) {
    d.showPage(UNLOCK)
    d.showErr("You need to unlock the wallet first")
    return false;
  }
  return true;
}

async function securityOptions() {

  //close moreless because options can change behavior
  const buttonsMore = new d.All(".buttons-more")
  buttonsMore.addClass("hidden")
  d.qs("#moreless").innerText = "More..."

  d.showPage("security-options")
  const data=await askBackground({code:"get-options"})
  d.inputById("auto-unlock-seconds").value = data.getAutoUnlockSeconds().toString()
  d.inputById("advanced-mode").checked = data.advancedMode? true : false;
  d.onClickId("save-settings", saveSecurityOptions)
  d.onClickId("cancel-security-settings", Pages.showMain)
}

async function saveSecurityOptions(ev/*:Event*/) {
  try {
    ev.preventDefault()

    const checkElem = document.getElementById("advanced-mode") /*+as HTMLInputElement+*/
    const aulSecs = Number(d.inputById("auto-unlock-seconds").value)
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds")

    await askBackground({code:"set-options",autoUnlockSeconds:aulSecs, advancedMode:checkElem.checked})

    Pages.showMain()
    d.showSuccess("Options saved")
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

function asideOptions() {
  if (asideIsUnlocked()) {
    securityOptions()
  }
}

function asideCreateUserClicked() {
  hambClicked();
  d.showPage(WELCOME_NEW_USER_PAGE)
}
function asideAddAccount() {
  if (asideIsUnlocked()) {
    d.showPage(IMPORT_OR_CREATE)
  }
}

function asideChangePassword() {
  if (asideIsUnlocked()) {
    d.showPage("change-password")
  }
}

async function tryReposition() {
  const reposition = await localStorageGetAndRemove("reposition")
  switch (reposition) {
    case "create-user": { //was creating user but maybe jumped to terms-of-use
      welcomeCreatePassClicked()
      d.inputById("email").value = await localStorageGetAndRemove("email")
      break;
    }
    case "account": case "stake":  {
      const account = await localStorageGetAndRemove("account")
      if (account) {
        AccountSelectedPage_show(account, reposition)
      }
    }
  }
}

// ---------------------
// DOM Loaded - START
// ---------------------
async function onLoad() {

  hamb.onClick(hambClicked)

  d.onClickId("err-div", () => {
    const errDiv = d.byId("err-div")
    while (errDiv.firstChild) errDiv.firstChild.remove()
  });

  d.onClickId(SELECT_NETWORK, selectNetworkClicked);
  d.onClickId("welcome-create-pass", welcomeCreatePassClicked);
  d.onClickId("open-terms-of-use", openTermsOfUseOnNewWindow);

  d.onClickId(UNLOCK, unlockClicked);

  d.onEnterKey("unlock-pass", unlockClicked)

  //aside
  d.qs("aside #lock").onClick(asideLock);
  d.qs("aside #accounts").onClick(asideAccounts);
  d.qs("aside #create-user").onClick(asideCreateUserClicked);
  d.qs("aside #add-account").onClick(asideAddAccount);
  //d.qs("aside #change-password").onClick(asideChangePassword);
  d.qs("aside #options").onClick(asideOptions);
  //new d.El(".aside #contact).asideContact);
  //new d.El(".aside #about).asideAbout);

  d.populateUL("network-items", "network-item-template", NetworkList)

  //--init other pages
  CreateUser_addListeners();
  ImportOrCreate_addListeners();
  Import_addListeners();

  //restore State from chrome.storage.local
  try {
    //show current network
    const networkInfo = await askBackgroundGetNetworkInfo()
    onNetworkChanged(networkInfo); //set indicator with current network

    const state = await askBackgroundGetState()

    if (state.usersList.length == 0) {
      //no users => welcome new User
      d.showPage(WELCOME_NEW_USER_PAGE)
      tryReposition();
      return; //***
    }

    if (state.unlocked){
      await Pages.showMain()
      tryReposition();
      return;
    }


    d.showPage(UNLOCK); //DEFAULT: ask the user to unlock SecureState
    //showPage clears all input fields, set ddefault value after show-page
    d.inputById("unlock-email").value = state.currentUser;

    // if (state.currentUser) { //we have a "last-user"
    //   //try to get auto-unlock key
    //   const uk = await localStorageGetAndRemove("uk")
    //   const exp = await localStorageGetAndRemove("exp")
    //   if (exp && Date.now() < exp && uk) { //maybe we can auto-unlock
    //     if (await tryAutoUnlock(uk)) { //if we succeed
    //       tryReposition(); //try reposition
    //     }
    //   }

  }
  catch (ex) {
    d.showErr(ex.message)
    d.showPage(UNLOCK); //ask the user to unlock SecureState
  }
  finally {
  }
}

// async function tryAutoUnlock(unlockSHA/*:string*/) /*:Promise<boolean>*/ {
//   if (unlockSHA) {
//     //auto-unlock is enabled
//     //try unlocking
//     try {
//       await global.unlockSecureStateSHA(global.State.currentUser, unlockSHA);
//       //if unlock succeeded
//       global.saveOnUnload.unlockSHA = unlockSHA;
//       try { 
//         Network.setCurrent(global.SecureState.initialNetworkName) 
//         //also inform background page
//         await askBackgroundSetNetwork(global.SecureState.initialNetworkName)
//       } catch { }; //initial networkName for this user

//       Pages.showMain(); //show acc list
//       return true;
//     }
//     catch (ex) {
//       //invalid pass-SHA or other error
//       d.showErr(ex.message);
//       return false;
//     }
//   }
//   return false;
// }


document.addEventListener('DOMContentLoaded', onLoad);

//inform background.js we're unloading (starts auto-lock timer)
addEventListener("unload", function (event) {
  chrome.runtime.sendMessage({dest:"ext",code:"popupUnloading"})
  })
//   const autoUnlockSeconds = global.getAutoUnlockSeconds()
//   if (autoUnlockSeconds>0) {
//     const backgroundPage = chrome.extension.getBackgroundPage()
//     //@ts-ignore
//     backgroundPage.popupUnloading(global.saveOnUnload.unlockSHA, autoUnlockSeconds * 1000); //SET AUTO-LOCK after x ms
//   }
// }, true);

//listen to extension messages
chrome.runtime.onMessage.addListener(function(msg){
  if (msg.code="network-changed") {
    onNetworkChanged(msg.network)
  }
})

//console.log(bip39.mnemonicToSeed("correct horse battery staple"))

function openTermsOfUseOnNewWindow() {
  localStorageSet({reposition:"create-user", email:d.inputById("email").value})
  chrome.windows.create({
    url: 'https://narwallets.com/terms.html'
  });
  return false
}
