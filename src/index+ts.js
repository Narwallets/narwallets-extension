import * as d from "./common+ts.js"
import * as global from "./data/global+ts.js"
import * as Pages from "./pages+ts.js"
import * as Network from "./data/Network+ts.js"
import { isValidEmail } from "./util/email+ts.js"

import { addListeners as CreateUser_addListeners } from "./page/create-pass+ts.js"
import { addListeners as ImportOrCreate_addListeners } from "./page/import-or-create+ts.js"
import { addListeners as Import_addListeners } from "./page/import+ts.js"

import { initPage as AccountSelected_initPage } from "./page/account-selected+ts.js"


//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_USER = "create-user"

const UNLOCK = "unlock"

const MAIN_PAGE = "main-page"
const ADD_ACCOUNT = "add-account"
const TYPE = "type"
const NAME = "name"
const BALANCE = "balance"
const STAKED = "staked"
const AVAILABLE = "available"

const IMPORT_OR_CREATE = "import-or-create"

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

function setCurrentNetwork(networkName/*:string*/) {
  //update global internal state
  const networkInfo = Network.setCurrent(networkName);
  //update indicator visual state
  currentNetworkDisplayName.text = networkInfo.displayName //set name
  currentNetworkDisplayName.el.className = networkInfo.color //set indicator color
}

function networkItemClicked(e /*:Event*/) {
  try {
    //console.log(e.target.getAttribute("data-code"))
    if (!e.target) return;

    /*+if (!(e.target instanceof HTMLElement)) return;+*/
    const networkName = e.target.getAttribute(DATA_CODE)
    if (!networkName) return;

    //update indicator visual state & global state
    setCurrentNetwork(networkName);

    //close dropdown
    closeDropDown(NETWORKS_LIST) //close 

    if (!global.unlocked) {
      d.showPage(UNLOCK);
      return;
    }

    global.SecureState.initialNetworkName = networkName;
    global.saveSecureState();

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

function welcomeCreatePassClicked(ev /*:Event*/) {
  d.showPage(CREATE_USER)
}

async function unlockClicked(ev /*:Event*/) {

  const emailEl=d.textById("unlock-email")
  const passEl=d.textById("unlock-pass")

  const email=emailEl.innerText
  if (!isValidEmail( email)){
    d.showErr("Invalid email");
    return;
  }

  if (!global.State.usersList.includes( email)){
    d.showErr("User already exists");
    return;
  }

  const password = passEl.value;
  passEl.value=""

  try {
    await global.tryRecoverSecureState( email,password)
    global.setAutoUnlock(password); //auto-unlock
    d.showPage(MAIN_PAGE);
  }
  catch (ex) {
    d.showErr(ex.message);
    return;
  };
}

function addAccountClicked(ev /*:Event*/) {
  d.showPage(IMPORT_OR_CREATE)
}

export function accountItemClicked(ev/*:Event*/) {
  const accName = d.getClosestChildText(".account-item", ev.target, ".name");
  if (!accName) return;
  const SELECTED_ACCOUNT = "selected-account"
  d.clearContainer(SELECTED_ACCOUNT)
  d.populateSingleLI(SELECTED_ACCOUNT, "account-item-template", global.SecureState.accounts[Network.current], accName)
  d.showPage("account-selected")
  AccountSelected_initPage();
}

function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

function asideLock() {
  global.State.unlockSHA = undefined;
  global.saveState();
  hambClicked();
  d.showPage(UNLOCK)
}
function asideAccounts() {
  hambClicked();
  Pages.showMain();
}
function asideCreateUser() {
  global.State.unlockSHA = undefined;
  global.saveState();
  hambClicked();
  d.showPage(WELCOME_NEW_USER_PAGE)
}
function asideAddAccount() {
  if (!global.unlocked) {
      d.showPage(UNLOCK)
  }
  else {
    d.showPage(IMPORT_OR_CREATE)
  }
  hambClicked();
}

// ---------------------
// DOM Loaded - START
// ---------------------
async function onLoad() {

  hamb.onClick(hambClicked)

  d.onClickId(SELECT_NETWORK, selectNetworkClicked);
  d.onClickId("welcome-create-pass", welcomeCreatePassClicked);
  d.onClickId(UNLOCK, unlockClicked);

  d.onEnterKey("unlock-pass", unlockClicked)

  d.onClickId(ADD_ACCOUNT, addAccountClicked);

  //aside
  new d.El("aside #lock").onClick(asideLock);
  new d.El("aside #accounts").onClick(asideAccounts);
  new d.El("aside #create-user").onClick(asideCreateUser);
  new d.El("aside #add-account").onClick(asideAddAccount);
  //new d.El(".aside #contact).asideContact);
  //new d.El(".aside #about).asideAbout);


  //chrome.storage.sync.clear();

  //restore State from chrome.storage.sync
  try {
    await global.recoverState();
    console.log(global.State)
    if (!global.State.dataVersion){
      global.clearState();
    }
    if (global.State.usersList.length == 0) {
      //no users => welcome new User
      d.showPage(WELCOME_NEW_USER_PAGE)
    }
    else {
      d.textById("unlock-email").innerText=global.State.currentUser;
      if (global.State.currentUser && global.State.unlockSHA) {
        //auto-unlock is enabled
        //try unlocking
        try {
          await global.tryRecoverSecureStateSHA(global.State.currentUser, global.State.unlockSHA);
          //if unlock succeeded
          setCurrentNetwork(global.SecureState.initialNetworkName) //initial networkName for this user
          Pages.showMain(); //show acc list
        }
        catch (ex) {
          d.showErr(ex.message);
          //invalid pass-SHA or other error
          d.showPage(UNLOCK); //ask the user to unlock SecureState
        }
      }
      else {
        d.showPage(UNLOCK);
      }
    }
  }
  catch (ex) {
    d.showErr(ex.message);
    Pages.showMain();
  }

  //--init other pages
  CreateUser_addListeners();
  ImportOrCreate_addListeners();
  Import_addListeners();

}

document.addEventListener('DOMContentLoaded', onLoad);
