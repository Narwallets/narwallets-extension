import * as d from "../common+ts.js"
import * as global from "../global+ts.js"

//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_PASS = "create-pass"

const UNLOCK_PAGE = "unlock-page"
const PASSW = "passw"
const UNLOCK = "unlock"

const MAIN_PAGE = "main-page"
const ADD_ACCOUNT = "add-account"
const ACCOUNTS_LIST = "accounts-list"
const ACCOUNT_ITEM_TEMPLATE = "account-item-template"
const ACCOUNT_ITEM = "account-item"
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
  window.open(chrome.runtime.getURL('setup/create-pass.html')); //navigate to create pass page
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
  //d.showPage(IMPORT_OR_CREATE)
  window.open(chrome.runtime.getURL('setup/import-or-create.html')); //navigate to create pass page
}

function populateLI(containerId/*:string*/, templateId/*:string*/, dataArray/*:Record<string,any>[]*/) {
  const listContainer = d.byId(containerId)
  if (dataArray) {
    for (let inx in dataArray) {
      const dataItem = dataArray[inx]
      const newLI = document.createElement("LI")  /*+as HTMLLIElement+*/
      newLI.innerHTML = d.templateReplace(templateId, dataItem)
      listContainer.appendChild(newLI)
    }
  }

}

function showMainPage() {
  //build DOM accounts list
  populateLI(ACCOUNTS_LIST, ACCOUNT_ITEM_TEMPLATE, global.SecureState.accounts)
  d.showPage(MAIN_PAGE)
  if (!global.SecureState.accounts || global.SecureState.accounts.length == 0) {
    //window.open(chrome.runtime.getURL('/setup/import-or-create.html')); //open add-account-page
  }
}


// ---------------------
// DOM Loaded - START
// ---------------------
function onLoad() {

  //d.byId('buttonGetPosts').addEventListener(d.CLICK, clicked);

  d.byId(SELECT_NETWORK).addEventListener(d.CLICK, selectNetworkClicked);

  d.byId(CREATE_PASS).addEventListener(d.CLICK, createPassClicked);

  d.byId(UNLOCK).addEventListener(d.CLICK, unlockClicked);
  d.byId(PASSW).addEventListener("keyup", (event/*:KeyboardEvent*/) => { if (event.key === 'Enter' || event.keyCode === 13) unlockClicked(event) })

  d.byId(ADD_ACCOUNT).addEventListener(d.CLICK, addAccountClicked);

  chrome.storage.sync.clear();

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
        global.tryRecoverSecureStateSHA(global.State.unlockSHA,(ok/*:boolean*/)=>{
          //auto-unlock succeeded
          if (ok) {
            showMainPage(); 
          }
          else {
             d.showPage(UNLOCK_PAGE); //ask the user to unlok SecureState
          }
        });
      }
      else {
        d.showPage(UNLOCK_PAGE);
      }
        
    }
  })
}

document.addEventListener('DOMContentLoaded', onLoad);


  // button.addEventListener('click',  () => {
  //   //alert('Button clicked!');
  //   var port = chrome.extension.connect({
  //     name: "Sample Communication"
  //   });
  //   port.postMessage("Hi BackGround");
  //   port.onMessage.addListener(function(msg) {
  //     console.log("popup.js: message recieved " + msg);
  //   });
  // })

// });