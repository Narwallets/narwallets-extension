require("../global.ts")

//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_PASS = "create-pass"

const UNLOCK_PAGE = "unlock-page"
const PASSW = "passw"
const UNLOCK = "unlock"

const MAIN_PAGE = "main-page"
const ADD_ACCOUNT = "add-account"
const ACCOUNT_ITEM_TEMPLATE = "account-item-template"
const ACCOUNT_ITEM = "account-item"
const TYPE = "type"
const NAME = "name"
const BALANCE = "balance"
const STAKED = "staked"
const AVAILABLE = "available"

const IMPORT_OR_CREATE="import-or-create"

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
//       //@ts-ignore
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
    State.network = network
    const name = e.target.innerText
    State.networkName = name

    //close dropdown
    closeDropDown(NETWORKS_LIST) //close 

    //update visual state
    const curNet = byId(CURNET_NAME)
    curNet.innerText = name //set name
    curNet.className = e.target.className //copy indicator color
  }
}

function closeDropDown(id/*:string*/) /*:void*/ {
  byId(id).classList.remove(OPEN); //hides
}

function selectNetworkClicked(ev /*:Event*/) {
  const selectionBox = byId(NETWORKS_LIST)
  if (selectionBox == undefined) return;
  if (selectionBox.classList.contains(OPEN)) {
    closeDropDown(NETWORKS_LIST) //close
    return;
  }
  //open drop down box
  selectionBox.classList.add(OPEN)
  selectionBox.querySelectorAll("li").forEach((li/*:HTMLElement*/) => {
    li.addEventListener(CLICK, networkItemClicked)
  });
}

function createPassClicked(ev /*:Event*/) {
  window.open(chrome.runtime.getURL('init/create-pass.html')); //navigate to create pass page
}

function unlockClicked(ev /*:Event*/) {
  const password = textById(PASSW).value;
  textById(PASSW).value = "";
  if (!recoverSecureState(password)) {
    showErr("Invalid Password");
    return;
  }
  showPage(MAIN_PAGE)
}

function addAccountClicked(ev /*:Event*/) {
  showPage(IMPORT_OR_CREATE)
  //window.open(chrome.runtime.getURL('init/import-or-create.html')); //navigate to create pass page
}


// ---------------------
// DOM Loaded - START
// ---------------------
document.addEventListener('DOMContentLoaded', () => {

  //byId('buttonGetPosts').addEventListener(CLICK, clicked);

  byId(SELECT_NETWORK).addEventListener(CLICK, selectNetworkClicked);
  
  byId(CREATE_PASS).addEventListener(CLICK, createPassClicked);
  
  byId(UNLOCK).addEventListener(CLICK, unlockClicked);
  byId(PASSW).addEventListener("keyup",(event)=>{if (event.key === 'Enter' || event.keyCode === 13) unlockClicked(event)})

  byId(ADD_ACCOUNT).addEventListener(CLICK, addAccountClicked);

  recoverState();
  if (!State.secureStateExists) {
    //no passwd => new User
    showPage(WELCOME_NEW_USER_PAGE)
  }
  else {
    if (State.unlockSHA){
      if (recoverSecureStateSHA(State.unlockSHA)){
        showPage(MAIN_PAGE)
        return;        
      }
    }
    showPage(UNLOCK_PAGE)
  }

});

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