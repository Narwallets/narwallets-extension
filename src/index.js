import * as d from "./util/document.js"
import * as global from "./data/global.js"
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

const AUTO_LOCK_SECONDS = 3600; //auto-lock wallet after 1hr

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

function onNetworkChanged(info/*:NetworkInfo*/){
  //update indicator visual state
  currentNetworkDisplayName.innerText = info.displayName //set name
  currentNetworkDisplayName.el.className = "circle "+info.color //set indicator color
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

  const emailEl=d.inputById("unlock-email")
  const passEl=d.inputById("unlock-pass")

  const email=emailEl.value
  if (!isValidEmail( email)){
    d.showErr("Invalid email");
    return;
  }

  //if (!global.State.usersList.includes( email)){
  //  d.showErr("User already exists");
  //  return;
  //}

  const password = passEl.value;
  passEl.value=""

  global.tryRecoverSecureState(email,password)
  .then(()=>{
    global.setAutoUnlock(password); //auto-unlock
    Pages.showMain()
  })
  .catch((ex)=>{
    d.showErr(ex.message);
  })

}

function addAccountClicked(ev /*:Event*/) {
  d.showPage(IMPORT_OR_CREATE)
}


function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

function asideLock() {
  global.lock()
  hambClicked();
  d.showPage(UNLOCK)
}
function asideAccounts() {
  hambClicked();
  Pages.showMain();
}
function asideCreateUser() {
  global.MemState.unlockSHA = "";
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

  d.onClickId("err-div", ()=>{
    const errDiv=d.byId("err-div")
    while (errDiv.firstChild) errDiv.firstChild.remove()
  });

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

  d.populateUL("network-items", "network-item-template", Network.List)

  onNetworkChanged(Network.currentInfo());
  Network.changeListeners["index-page"]=onNetworkChanged;

  //--init other pages
  CreateUser_addListeners();
  ImportOrCreate_addListeners();
  Import_addListeners();

  //chrome.storage.sync.clear();
  chrome.runtime.sendMessage({kind:"testing-1-2-3"})

  //restore State from chrome.storage.sync
  try {

    await global.recoverState();
    //console.log(global.State)

    if (!global.State.dataVersion){
      global.clearState();
    }
    if (global.State.usersList.length == 0) {
      //no users => welcome new User
      d.showPage(WELCOME_NEW_USER_PAGE)
      return; //***
    }

    if (!global.State.currentUser) { //no last-user
      d.showPage(UNLOCK); //ask the user to unlock SecureState
      return; //***
    }

    //we have a last user
    d.inputById("unlock-email").value=global.State.currentUser;

    //try to get auto-unlock key
    chrome.storage.local.get("uk", (obj) => {
      //console.log("chrome.storage.local.get(uk", obj)
      tryAutoUnlock(obj.uk)
    });

    d.showPage(UNLOCK); //DEFAULT: ask the user to unlock SecureState
  }
  catch(ex){
    d.showErr(ex.message)
    d.showPage(UNLOCK); //ask the user to unlock SecureState
  }
  finally{
  }
}

async function tryAutoUnlock(unlockSHA/*:string*/){
    global.MemState.unlockSHA = unlockSHA;
    if (global.MemState.unlockSHA) {
      //auto-unlock is enabled
      //try unlocking
      try {
        await global.tryRecoverSecureStateSHA(global.State.currentUser, global.MemState.unlockSHA);
        //if unlock succeeded
        try {Network.setCurrent(global.SecureState.initialNetworkName)}catch{}; //initial networkName for this user
        Pages.showMain(); //show acc list
        return;
      }
      catch (ex) {
        //invalid pass-SHA or other error
        d.showErr(ex.message);
      }
    }
    //default initial page: UNLOCK
    d.showPage(UNLOCK); //ask the user to unlock SecureState
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

var background = chrome.extension.getBackgroundPage();
addEventListener("unload", function (event) {
     //@ts-ignore
     background.popupUnloading(global.MemState.unlockSHA, 3600000); //SET AUTO-UNLOCK for 1h
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


console.log(bip39.mnemonicToSeed("correct horse battery staple"))

