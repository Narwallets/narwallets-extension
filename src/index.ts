import * as d from "./util/document.js"
import * as Pages from "./pages/main.js"
import {NetworkList} from "./api/network.js"

import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js"
import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js"
import { addListeners as Import_addListeners } from "./pages/import.js"

import { show as AccountSelectedPage_show } from "./pages/account-selected.js"
import { show as UnlockPage_show } from "./pages/unlock.js"

import { localStorageGet, localStorageGetAndRemove, localStorageRemove, localStorageSet } from "./data/util.js"
import { askBackground, askBackgroundGetNetworkInfo, askBackgroundGetState, askBackgroundIsLocked, askBackgroundSetNetwork } from "./api/askBackground.js"
import { functionCall } from "./api/transaction.js"
import { isValidEmail } from "./api/utils/valid.js"

import * as bip39 from "./bundled-types/bip39-light"
import type { NetworkInfo} from "./api/network.js"


const AUTO_LOCK_SECONDS = 15; //auto-lock wallet after 1hr

//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_USER = "create-user"

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


function onNetworkChanged(info:NetworkInfo) {
  //update indicator visual state
  if (!info) return;
  currentNetworkDisplayName.innerText = info.displayName //set name
  currentNetworkDisplayName.el.className = "circle " + info.color //set indicator color
}

async function networkItemClicked(e:Event) {
  try {
    console.log("networkItemClicked",e)
    if (!e.target) return;

    if (!(e.target instanceof HTMLElement)) return
    const networkName = e.target.getAttribute(DATA_CODE)
    if (!networkName) return;

    //update indicator visual state & global state (background)
    await askBackgroundSetNetwork(networkName)

    //close dropdown
    closeDropDown(NETWORKS_LIST) //close 

    const islocked = await askBackgroundIsLocked()
    if (islocked) {
      UnlockPage_show();
      return;
    }
    Pages.show() //refresh account list

  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

function closeDropDown(id:string) :void {
  d.byId(id).classList.remove(d.OPEN); //hides
}

function selectNetworkClicked(ev :Event) {
  const selectionBox = d.byId(NETWORKS_LIST)
  if (selectionBox == undefined) return;
  if (selectionBox.classList.contains(d.OPEN)) {
    closeDropDown(NETWORKS_LIST) //close
    return;
  }
  //open drop down box
  selectionBox.classList.add(d.OPEN)
  selectionBox.querySelectorAll("div.circle").forEach((div:Element) => {
    div.addEventListener(d.CLICK, networkItemClicked)
  });
}

function welcomeCreatePassClicked() {
  d.showPage(CREATE_USER)
}


function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

async function asideLock() {
  await askBackground({code:"lock"})
  hambClicked();
  UnlockPage_show();
}

function asideAccounts() {
  hambClicked();
  Pages.show();
}

async function asideIsUnlocked() {
  hambClicked();
  const isLocked=await askBackgroundIsLocked()
  if (isLocked) {
    UnlockPage_show();
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
  d.inputById("auto-unlock-seconds").value = data.autoUnlockSeconds.toString()
  d.inputById("advanced-mode").checked = data.advancedMode? true : false;
  d.onClickId("save-settings", saveSecurityOptions)
  d.onClickId("cancel-security-settings", Pages.show)
}

async function saveSecurityOptions(ev:Event) {
  try {
    ev.preventDefault()

    const checkElem = document.getElementById("advanced-mode") as HTMLInputElement
    const aulSecs = Number(d.inputById("auto-unlock-seconds").value)
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds")

    await askBackground({code:"set-options",autoUnlockSeconds:aulSecs, advancedMode:checkElem.checked})

    Pages.show()
    d.showSuccess("Options saved")
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

function asideContact() {
  chrome.windows.create({
    url: "https://narwallets.com/contact.html",
    state: "maximized"
  });
}

function asideAbout() {
  chrome.windows.create({
    url: "https://narwallets.com",
    state: "maximized"
  });
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
      const isLocked = await askBackgroundIsLocked()
      if (!isLocked) {
        if (account) {
          AccountSelectedPage_show(account, reposition)
        }
      }
    }
  }
}


//-----------------------
async function initPopup() {

  chrome.alarms.clear("unlock-expired")

  hamb.onClick(hambClicked)

  d.onClickId("err-div", () => {
    const errDiv = d.byId("err-div")
    while (errDiv.firstChild) errDiv.firstChild.remove()
  });

  d.onClickId(SELECT_NETWORK, selectNetworkClicked);
  d.onClickId("welcome-create-pass", welcomeCreatePassClicked);
  d.onClickId("open-terms-of-use", openTermsOfUseOnNewWindow);

  //aside
  d.qs("aside #lock").onClick(asideLock);
  d.qs("aside #accounts").onClick(asideAccounts);
  d.qs("aside #create-user").onClick(asideCreateUserClicked);
  d.qs("aside #add-account").onClick(asideAddAccount);
  //d.qs("aside #change-password").onClick(asideChangePassword);
  d.qs("aside #options").onClick(asideOptions);
  d.qs("aside #contact").onClick(asideContact);
  d.qs("aside #about").onClick(asideAbout);

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

    const locked = await askBackgroundIsLocked()
    if (!locked){
      await Pages.show()
      tryReposition();
      return;
    }


    UnlockPage_show(); //DEFAULT: ask the user to unlock SecureState
    //showPage clears all input fields, set ddefault value after show-page
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
    UnlockPage_show(); //ask the user to unlock SecureState
  }
  finally {
  }
}


function openTermsOfUseOnNewWindow() {
  localStorageSet({reposition:"create-user", email:d.inputById("email").value})
  chrome.windows.create({
    url: 'https://narwallets.com/terms.html'
  });
  return false
}


//event to inform background.js we're unloading (starts auto-lock timer)
addEventListener("unload", function (event) {
  //@ts-ignore
  background.postMessage({code:"popupUnloading"},"*")
}, true)

//listen to background messages
chrome.runtime.onMessage.addListener(function(msg){
  if (msg.code=="network-changed") {
    onNetworkChanged(msg.networkInfo)
  }
  else if (msg.code=="can-init-popup") {
    initPopup()
  }
})

var background:Window|undefined
//wake-up background page
chrome.runtime.getBackgroundPage((bgpage)=>{
  background=bgpage;
  //@ts-ignore
  background.postMessage({code:"popupLoading"},"*")
  //will reply with "can-init-popup" after retrieving data from localStorage
});

