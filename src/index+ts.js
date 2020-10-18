import * as d from "./common+ts.js"
import * as global from "./global+ts.js"
import * as Pages from "./pages+ts.js"

import {addListeners as CreateUser_addListeners} from "./page/create-pass+ts.js"
import {addListeners as ImportOrCreate_addListeners} from "./page/import-or-create+ts.js"
import {addListeners as Import_addListeners} from "./page/import+ts.js"

//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_PASS = "create-pass"

const UNLOCK_PAGE = "unlock-page"
const PASSW = "passw"
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
const CURNET_NAME = "curnet-name"
const NETWORKS_LIST = "networks-list"

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

function networkItemClicked(e /*:Event*/) {
  //console.log(e.target.getAttribute("data-code"))
  if (!e.target) return;
  /*+if (!(e.target instanceof HTMLElement)) return;+*/
  const network = e.target.getAttribute(DATA_CODE)
  if (network) {

    //update data state
    const name = e.target.innerText
    global.State.networkName = name
    global.State.network = network
    global.saveState()

    //close dropdown
    closeDropDown(NETWORKS_LIST) //close 

    //update visual state
    const curNet = d.byId(CURNET_NAME)
    curNet.innerText = name //set name
    curNet.className = e.target.className //copy indicator color
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

function createPassClicked(ev /*:Event*/) {
  d.showPage(CREATE_PASS)
}

function unlockClicked(ev /*:Event*/) {
  const password = d.textById(PASSW).value;
  d.textById(PASSW).value = "";
  global.recoverSecureState(password,(ok)=>{

    if (!ok) {
      d.showErr("Invalid Password");
      return;
    }

    global.setAutoUnlock(password); //auto-unlock

    d.showPage(MAIN_PAGE);
  
  });
  
}

function addAccountClicked(ev /*:Event*/) {
  d.showPage(IMPORT_OR_CREATE)
}


// ---------------------
// DOM Loaded - START
// ---------------------
function onLoad() {

  //d.byId('buttonGetPosts').addEventListener(d.CLICK, clicked);

  d.onClick(SELECT_NETWORK, selectNetworkClicked);
  d.onClick(CREATE_PASS, createPassClicked);
  d.onClick(UNLOCK, unlockClicked);

  d.onEnterKey(PASSW,unlockClicked)

  d.onClick(ADD_ACCOUNT,addAccountClicked);

  //chrome.storage.sync.clear();

  //restore State from chrome.storage.sync
  global.recoverState((err/*:string*/) => {

    if (err) {
      d.showErr(err);
      return;
    }

    console.log(global.State)
    if (!global.State.secureStateExists) {
      //no secureStateExists => no passwd created => new User
      d.showPage(WELCOME_NEW_USER_PAGE)
    }
    else {
      if (global.State.unlockSHA) { 
        //auto-unlock is enabled
        //try unlocking
        global.tryRecoverSecureStateSHA(global.State.unlockSHA, (ok/*:boolean*/) => {
          //auto-unlock succeeded
          if (ok) {
            Pages.showMain(); 
          }
          else {
             d.showPage(UNLOCK_PAGE); //ask the user to unlock SecureState
          }
        });
      }
      else {
        d.showPage(UNLOCK_PAGE);
      }
        
    }
  })

  //--init other pages
  CreateUser_addListeners();
  ImportOrCreate_addListeners();
  Import_addListeners();
  
}

document.addEventListener('DOMContentLoaded', onLoad);
