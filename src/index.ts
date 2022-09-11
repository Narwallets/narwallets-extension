import * as d from "./util/document.js";
import * as Pages from "./pages/main.js";
import { NetworkList } from "./lib/near-api-lite/network.js";

//import { refreshAccountListBalances } from "./pages/main.js";
import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js";
import { addListeners as ChangePass_addListeners } from "./pages/change-pass.js";
import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js";
import {
  addListeners as Import_addListeners,
  onNetworkChanged as Import_onNetworkChanged,
} from "./pages/import.js";

import { refreshSelectedAccountAndAssets, selectedAccountData } from "./pages/account-selected.js";
import { show as UnlockPage_show } from "./pages/unlock.js";
import { show as AddressBook_show } from "./pages/address-book.js";
import { show as Options_show } from "./pages/options.js";

import { recoverState, State } from "./data/global.js";
import { localStorageRemove, localStorageSet } from "./data/util.js";
import {
  askBackground,
  askBackgroundGetNetworkInfo,
  askBackgroundGetState,
  askBackgroundIsLocked,
  askBackgroundSetNetwork,
} from "./background/askBackground.js";
import { functionCall } from "./lib/near-api-lite/transaction.js";
import { isValidEmail } from "./lib/near-api-lite/utils/valid.js";

import type { NetworkInfo } from "./lib/near-api-lite/network.js";
import { calculateDollarValue } from "./data/global.js";
import { D } from "./lib/tweetnacl/core/core.js";
import { hideOkCancel, OkCancelInit } from "./util/okCancel.js";
import { initPopupHandlers } from "./util/popup-list.js";

export const SINGLE_USER_EMAIL = "unique-user@narwallets.com"

const AUTO_LOCK_SECONDS = 15; //auto-lock wallet after 1hr

//--- content sections at MAIN popup.html

const IMPORT_OR_CREATE = "import-or-create";

const TYPE = "type";
const NAME = "name";
const BALANCE = "balance";
const STAKED = "staked";
const AVAILABLE = "available";

const SELECT_NETWORK = "select-network";
const DATA_CODE = "data-code";
const NETWORKS_LIST = "networks-list";

let isDark = true;

let hamb: d.El;
let aside: d.El;

let hambIsOpen = false;

export var activeNetworkInfo: NetworkInfo;

function updateNetworkIndicatorVisualState(info: NetworkInfo) {
  const currentNetworkDisplayName = new d.El("#current-network-display-name");
  currentNetworkDisplayName.innerText = info.displayName; //set name
  currentNetworkDisplayName.el.className = "circle " + info.color; //set indicator color
}

export function setIsDark(d: boolean) {
  isDark = d
}

async function networkItemClicked(e: Event) {
  try {
    OkCancelInit();
    hideOkCancel();
    //console.log("networkItemClicked",e)
    if (!e.target) return;

    if (!(e.target instanceof HTMLElement)) return;
    const networkName = e.target.getAttribute(DATA_CODE);
    if (!networkName) return;

    //close dropdown
    d.byId(NETWORKS_LIST).classList.remove(d.OPEN); //hides

    //update global state (background)
    activeNetworkInfo = await askBackgroundSetNetwork(networkName);
    //update indicator visual state
    updateNetworkIndicatorVisualState(activeNetworkInfo);
    Import_onNetworkChanged(activeNetworkInfo);

    // Account_onNetworkChanged(activeNetworkInfo);
    //on network-change restart the page-flow
    localStorageRemove("reposition");
    Pages.show(); //refresh account list
  } catch (ex) {
    d.showErr(ex.message);
  }
}

function selectNetworkClicked(ev: Event) {
  const selectionBox = d.byId(NETWORKS_LIST);
  if (selectionBox == undefined) return;
  if (selectionBox.classList.contains(d.OPEN)) {
    d.byId(NETWORKS_LIST).classList.remove(d.OPEN); //hides
    return;
  }
  //open drop down box
  selectionBox.classList.add(d.OPEN);
  selectionBox.querySelectorAll("div.circle").forEach((div: Element) => {
    div.addEventListener(d.CLICK, networkItemClicked);
  });
}

function welcomeCreatePassClicked() {
  d.showPage(Pages.CREATE_USER);
}

function hambClicked() {
  hamb.toggleClass("open");
  aside.toggleClass("open");
  if (!hambIsOpen) {
    d.byId("account-list-main").classList.add("hidden");
    hambIsOpen = true;
  } else {
    d.byId("account-list-main").classList.remove("hidden");
    hambIsOpen = false;
  }
}

async function asideLock() {
  await askBackground({ code: "lock" });
  hambClicked();
  hideOkCancel();
  await UnlockPage_show();
}

function asideExpand() {
  chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    state: "maximized",
  });
}

function asideAccounts() {
  hambClicked();
  hideOkCancel();
  d.showPage("account-list-main");
}

async function asideIsUnlocked() {
  hambClicked();
  const isLocked = await askBackgroundIsLocked();
  if (isLocked) {
    await UnlockPage_show();
    d.showErr("You need to unlock the wallet first");
    return false;
  }
  return true;
}

async function securityOptions() {
  Options_show();
}

async function saveSecurityOptions(ev: Event) {
  try {
    ev.preventDefault();

    const aulSecs = Number(d.inputById("autolock-seconds-input").value);
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds");

    await askBackground({
      code: "set-options",
      autoUnlockSeconds: aulSecs,
    });

    Pages.show();
    d.showSuccess("Options saved");
  } catch (ex) {
    d.showErr(ex.message);
  }
}

function asideContact() {
  chrome.windows.create({
    url: "https://narwallets.com/contact.html",
    state: "maximized",
  });
}

function asideAbout() {
  chrome.windows.create({
    url: "https://narwallets.com",
    state: "maximized",
  });
}

async function asideOptions() {
  if (await asideIsUnlocked()) {
    securityOptions();
  }
}

async function changePassword() {
  if (await asideIsUnlocked()) {
    hideOkCancel();
    d.showPage(Pages.CHANGE_PASSWORD);
    ChangePass_addListeners();
  }
}

function asideCreateUserClicked() {
  hambClicked();
  d.showPage(Pages.WELCOME_NEW_USER_PAGE);
}
async function asideAddAccount() {
  if (await asideIsUnlocked()) {
    hideOkCancel();
    Pages.addAccountClicked();
  }
}

async function asideChangePassword() {
  if (await asideIsUnlocked()) {
    d.showPage("change-password");
  }
}

async function asideAddressBook() {
  hideOkCancel();
  if (await asideIsUnlocked()) {
    AddressBook_show();
  }
}

export async function asideSwitchMode() {
  //close aside
  hambClicked();

  let colorMode = switchDarkLight();

  localStorageSet({ popupConfig: { lightMode: colorMode == "light" } })

}

export function switchDarkLight(): string {

  const cssLinkIndex = 0;
  var oldlink = document.getElementsByTagName("link").item(cssLinkIndex);

  var colorMode;
  var cssFile = "";
  if (isDark) {
    cssFile = "css/styles_light.css";
    colorMode = "light"
  } else {
    cssFile = "css/styles_dark.css";
    colorMode = "dark"
  }
  isDark = !isDark;

  //console.log(oldlink?.href, cssFile);
  if (oldlink && !oldlink.href.includes(cssFile)) {
    oldlink.href = cssFile;
  }

  return colorMode;
}

//-----------------------
//executed after the background-page is available
let initPopupTimestamp: number = 0;
async function initPopup() {
  // debounce
  if (Date.now() < initPopupTimestamp + 100) return;
  initPopupTimestamp = Date.now()

  chrome.alarms.clear("unlock-expired");
  //console.log(new Date().toISOString(), "enter initPopup()")

  //update network indicator visual state
  activeNetworkInfo = await askBackgroundGetNetworkInfo();
  updateNetworkIndicatorVisualState(activeNetworkInfo);
  Import_onNetworkChanged(activeNetworkInfo);

  hamb = new d.El(".hamb");
  aside = new d.El("aside");
  hamb.onClick(hambClicked);

  d.onClickId("err-div", () => {
    const errDiv = d.byId("err-div");
    while (errDiv.firstChild) errDiv.firstChild.remove();
  });

  d.onClickId(SELECT_NETWORK, selectNetworkClicked);

  //aside
  d.qs("aside #lock").onClick(asideLock);
  d.qs("aside #accounts").onClick(asideAccounts);
  //d.qs("aside #create-user").onClick(asideCreateUserClicked);
  d.qs("aside #add-account-side").onClick(asideAddAccount);
  d.qs("aside #options").onClick(asideOptions);
  d.qs("aside #contact").onClick(asideContact);
  d.qs("aside #change-password").onClick(changePassword);
  d.qs("aside #about").onClick(asideAbout);
  d.qs("aside #address-book-side").onClick(asideAddressBook);
  d.qs("aside #darkmode").onClick(asideSwitchMode);

  {
    const TEMPLATE = `<div>
      <div data-code="{name}" class="circle {color}">{displayName}</div>
    </div>`;
    const NET_LIST_CONTAINER = "network-items"
    d.clearContainer(NET_LIST_CONTAINER)
    d.populateUL(NET_LIST_CONTAINER, TEMPLATE, NetworkList);
  }

  //--init other pages
  d.onClickId("welcome-create-pass", welcomeCreatePassClicked);
  d.onClickId("open-terms-of-use", openTermsOfUseOnNewWindow);
  CreateUser_addListeners();
  ImportOrCreate_addListeners();

  Import_addListeners();

  // Account_onNetworkChanged(activeNetworkInfo);

  calculateDollarValue();

  initPopupHandlers()

  // set auto-refresh based on page shown
  // first
  setTimeout(autoRefresh, 200);
  // then every 10 secs
  window.setInterval(async function () {
    autoRefresh();
  }, 10000);

  //show main page
  return Pages.show();
}

let refreshing: boolean = false;
export async function autoRefresh() {
  //console.log(refreshing ? "SKIP" : "DO", "autoRefresh enter", d.activePage, "already refreshing?", refreshing)
  if (refreshing) return;
  try {
    refreshing = true
    //console.log(`Calling auto-refresh, selectedAccountData ${selectedAccountData} d.activePage ${d.activePage}`);
    // if (d.activePage == "account-list-main") {
    //   await refreshAccountListBalances();
    // }
    // else 
    if (d.activePage == "account-selected" || d.activePage == "AccountAssetDetail") {
      await refreshSelectedAccountAndAssets();
    }
  }
  finally {
    refreshing = false
    //console.log("autoRefresh EXIT", d.activePage)
  }
}

function openTermsOfUseOnNewWindow() {
  // localStorageSet({
  //   reposition: "create-user",
  //   email: SINGLE_USER_EMAIL, // d.inputById("email").value,
  // });
  chrome.windows.create({
    url: "https://narwallets.com/terms.html",
  });
  return false;
}

//event to inform background.js we're unloading (starts auto-lock timer)
addEventListener(
  "unload",
  function (event) {
    //@ts-ignore
    background.postMessage({ code: "popupUnloading" }, "*");
  },
  true
);

//listen to background messages
chrome.runtime.onMessage.addListener(function (msg) {
  if (msg.code == "can-init-popup") {
    initPopup();
  }
});

window.onload = function () {
  // dark light mode
  // default is dark
  chrome.storage.local.get("popupConfig", (obj) => {
    if (chrome.runtime.lastError) {
      console.log(JSON.stringify(chrome.runtime.lastError));
    }
    else {
      //console.log(obj);
      if (obj?.popupConfig?.lightMode) {
        switchDarkLight();
      }
    }
  });

};

var background: Window | undefined;
//wake-up background page
//WARNING:  chrome.runtime.getBackgroundPage != chrome.extension.getBackgroundPage
chrome.runtime.getBackgroundPage((bgpage) => {
  if (chrome.runtime.lastError) {
    console.error(JSON.stringify(chrome.runtime.lastError));
    alert(chrome.runtime.lastError);
  } else {
    background = bgpage;

    //@ts-ignore
    background.postMessage({ code: "popupLoading" }, "*");
    //will reply with "can-init-popup" after retrieving data from localStorage
  }
});


