import * as d from "./util/document.js"
import * as global from "./data/global.js"
import { recoverOptions } from "./data/options.js"
import * as Pages from "./pages/main.js"
import * as Network from "./data/Network.js"
import { isValidEmail } from "./util/email.js"

import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js"
import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js"
import { addListeners as Import_addListeners } from "./pages/import.js"

/*+
import * as bip39 from "./bundled-types/bip39-light"
import type { NetworkInfo} from "./data/Network.js"
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

function networkItemClicked(e /*:Event*/) {
  try {
    //console.log(e.target.getAttribute("data-code"))
    if (!e.target) return;

    /*+if (!(e.target instanceof HTMLElement)) return;+*/
    const networkName = e.target.getAttribute(DATA_CODE)
    if (!networkName) return;

    //update indicator visual state & global state
    Network.setCurrent(networkName);

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

function unlockClicked(ev /*:Event*/) {

  const emailEl = d.inputById("unlock-email")
  const passEl = d.inputById("unlock-pass")

  const email = emailEl.value
  if (!isValidEmail(email)) {
    d.showErr("Invalid email");
    return;
  }

  //if (!global.State.usersList.includes( email)){
  //  d.showErr("User already exists");
  //  return;
  //}

  const password = passEl.value;
  passEl.value = ""

  global.tryRecoverSecureState(email, password)
    .then(() => {
      global.setAutoUnlock(email, password); //auto-unlock
      Pages.showMain()
      if (global.getNetworkAccountsCount() == 0) d.showPage(IMPORT_OR_CREATE); //auto-add account after unlock
    })
    .catch((ex) => {
      d.showErr(ex.message);
    })

}

function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

function asideLock() {
  global.lock()
  hambClicked();
  d.showPage(UNLOCK)
  d.inputById("unlock-email").value = global.State.currentUser;

}
function asideAccounts() {
  hambClicked();
  Pages.showMain();
}

function asideIsUnlocked() {
  hambClicked();
  if (!global.unlocked) {
    d.showPage(UNLOCK)
    d.showErr("You need to unlock the wallet first")
    return false;
  }
  return true;
}

function securityOptions() {
  d.showPage("security-options")
  d.inputById("auto-unlock-seconds").value = global.getAutoUnlockSeconds().toString()
  d.inputById("advanced-mode").checked = global.SecureState.advancedMode ? true : false;
  d.onClickId("save-settings", saveSecurityOptions)
  d.onClickId("cancel-security-settings", Pages.showMain)
}
function saveSecurityOptions(ev/*:Event*/) {
  try {
    ev.preventDefault()

    const checkElem = document.getElementById("advanced-mode") /*+as HTMLInputElement+*/
    global.SecureState.advancedMode = checkElem.checked

    const aulSecs = Number(d.inputById("auto-unlock-seconds").value)
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds")
    global.SecureState.autoUnlockSeconds = aulSecs

    global.saveSecureState()
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
  // chrome.windows.create({
  //     url: chrome.runtime.getURL("options/options.html")
  // });
}

function asideCreateUser() {
  global.saveOnUnload.unlockSHA = "";
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

function addAccountClicked() {
  d.showPage(IMPORT_OR_CREATE)
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

  d.onClickId(ADD_ACCOUNT, addAccountClicked);

  //aside
  d.qs("aside #lock").onClick(asideLock);
  d.qs("aside #accounts").onClick(asideAccounts);
  d.qs("aside #create-user").onClick(asideCreateUser);
  d.qs("aside #add-account").onClick(asideAddAccount);
  d.qs("aside #change-password").onClick(asideChangePassword);
  d.qs("aside #options").onClick(asideOptions);
  //new d.El(".aside #contact).asideContact);
  //new d.El(".aside #about).asideAbout);

  d.populateUL("network-items", "network-item-template", Network.List)

  onNetworkChanged(Network.currentInfo());
  Network.changeListeners["index-page"] = onNetworkChanged;


  //--init other pages
  CreateUser_addListeners();
  ImportOrCreate_addListeners();
  Import_addListeners();

  //restore State from chrome.storage.sync
  try {

    await recoverOptions();
    await global.recoverState();
    //console.log(global.State)

    if (!global.State.dataVersion) {
      global.clearState();
    }
    if (global.State.usersList.length == 0) {
      //no users => welcome new User
      d.showPage(WELCOME_NEW_USER_PAGE)
      return; //***
    }

    if (global.State.currentUser) { //last-user
      //try to get auto-unlock key
      chrome.storage.local.get("uk", (obj) => {
        //console.log("chrome.storage.local.get(uk", obj)
        tryAutoUnlock(obj.uk)
      });
    }

    d.showPage(UNLOCK); //DEFAULT: ask the user to unlock SecureState
    //showPage clears all input fields
    //if we have a last user
    d.inputById("unlock-email").value = global.State.currentUser;

  }
  catch (ex) {
    d.showErr(ex.message)
    d.showPage(UNLOCK); //ask the user to unlock SecureState
  }
  finally {
  }
}

async function tryAutoUnlock(unlockSHA/*:string*/) {
  if (unlockSHA) {
    //auto-unlock is enabled
    //try unlocking
    try {
      await global.tryRecoverSecureStateSHA(global.State.currentUser, unlockSHA);
      //if unlock succeeded
      global.saveOnUnload.unlockSHA = unlockSHA;
      try { Network.setCurrent(global.SecureState.initialNetworkName) } catch { }; //initial networkName for this user
      Pages.showMain(); //show acc list
      return;
    }
    catch (ex) {
      //invalid pass-SHA or other error
      d.showErr(ex.message);
      chrome.storage.local.get
    }
  }
}


// //-- OJO deben hacerse FUERA de un async
// //window.addEventListener("unload", onUnload);
// window.addEventListener("unload", ()=>{
//     chrome.runtime.getBackgroundPage((background)=>{
//     try{
//       //@ts-ignore      
//       background.console.log("fore: about call hold",global.MemState.unlockSHA, AUTO_LOCK_SECONDS*1000);
//       //@ts-ignore      
//       background.hold(global.MemState.unlockSHA, AUTO_LOCK_SECONDS*1000);
//     }
//     catch(ex){console.error(ex)};
//     });
//   console.log("onUnload executed");
// });

// function onUnload(event/*:Event*/){
//   chrome.runtime.getBackgroundPage((background)=>{
//     try{
//       //@ts-ignore      
//       background.console.log("fore: about call hold",global.MemState.unlockSHA, AUTO_LOCK_SECONDS*1000);
//       //@ts-ignore      
//       background.hold(global.MemState.unlockSHA, AUTO_LOCK_SECONDS*1000);
//     }
//     catch(ex){console.error(ex)};
//     });
//   console.log("onUnload executed");
// }

// window.addEventListener("unload",()=>{
//   chrome.runtime.sendMessage({kind:"popup-unload"})
// })

// chrome.runtime.onSuspend.addListener(()=>{
//   chrome.runtime.sendMessage({kind:"popup-unload"})
// })

document.addEventListener('DOMContentLoaded', onLoad);

//calling a background fn seems to be the only way to execut something on popupUnload
var background = chrome.extension.getBackgroundPage();
addEventListener("unload", function (event) {
  //@ts-ignore
  background.popupUnloading(global.saveOnUnload.unlockSHA, global.getAutoUnlockSeconds()*1000); //SET AUTO-UNLOCK for 1h
}, true);

// chrome.runtime.getBackgroundPage((background)=>{
//   try{
//     //@ts-ignore      
//     background.console.log("FROM INDEX")
//     //@ts-ignore      
//     //background.msg("popup-opened");
//     //background.hold("ALGO", AUTO_LOCK_SECONDS*1000);
//   }
//   catch(ex){console.error(ex)};
//   });


//console.log(bip39.mnemonicToSeed("correct horse battery staple"))

function openTermsOfUseOnNewWindow() {
  chrome.windows.create({
    url: 'https://narwallet.io/terms.html'
  });
  return false
}
