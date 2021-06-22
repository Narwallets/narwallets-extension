import * as d from "./util/document.js";
import * as Pages from "./pages/main.js";
import { NetworkList } from "./lib/near-api-lite/network.js";

import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js";
import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js";
import { addListeners as Import_addListeners } from "./pages/import.js";

import { show as AccountSelectedPage_show } from "./pages/account-selected.js";
import { show as UnlockPage_show } from "./pages/unlock.js";

import { localStorageSet } from "./data/util.js";
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

const hamb = new d.El(".hamb");
const aside = new d.El("aside");

const currentNetworkDisplayName = new d.El("#current-network-display-name");

let isOpen = false;

function updateNetworkIndicatorVisualState(info: NetworkInfo) {
  currentNetworkDisplayName.innerText = info.displayName; //set name
  currentNetworkDisplayName.el.className = "circle " + info.color; //set indicator color
}

async function networkItemClicked(e: Event) {
  try {
    //console.log("networkItemClicked",e)
    if (!e.target) return;

    if (!(e.target instanceof HTMLElement)) return;
    const networkName = e.target.getAttribute(DATA_CODE);
    if (!networkName) return;

    //close dropdown
    closeDropDown(NETWORKS_LIST); //close

    //update global state (background)
    const info = await askBackgroundSetNetwork(networkName);
    //update indicator visual state
    updateNetworkIndicatorVisualState(info);

    //on network-change restart the page-flow
    Pages.show(); //refresh account list
  } catch (ex) {
    d.showErr(ex.message);
  }
}

function closeDropDown(id: string): void {
  d.byId(id).classList.remove(d.OPEN); //hides
}

function selectNetworkClicked(ev: Event) {
  const selectionBox = d.byId(NETWORKS_LIST);
  if (selectionBox == undefined) return;
  if (selectionBox.classList.contains(d.OPEN)) {
    closeDropDown(NETWORKS_LIST); //close
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
  if (!isOpen) {
    d.byId("account-list-main").classList.add("hidden");
    isOpen = true;
  } else {
    d.byId("account-list-main").classList.remove("hidden");
    isOpen = false;
  }
}

async function asideLock() {
  await askBackground({ code: "lock" });
  hambClicked();
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
  Pages.show();
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
  //close moreless because options can change behavior
  const buttonsMore = new d.All(".buttons-more");
  buttonsMore.addClass("hidden");
  d.qs("#moreless").innerText = "More...";

  d.showPage("security-options");
  const data = await askBackground({ code: "get-options" });
  d.inputById("auto-unlock-seconds").value = data.autoUnlockSeconds.toString();
  d.inputById("advanced-mode").checked = data.advancedMode ? true : false;
  d.onClickId("save-settings", saveSecurityOptions);
  d.onClickId("cancel-security-settings", Pages.show);
}

async function saveSecurityOptions(ev: Event) {
  try {
    ev.preventDefault();

    const checkElem = document.getElementById(
      "advanced-mode"
    ) as HTMLInputElement;
    const aulSecs = Number(d.inputById("auto-unlock-seconds").value);
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds");

    await askBackground({
      code: "set-options",
      autoUnlockSeconds: aulSecs,
      advancedMode: checkElem.checked,
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

function asideCreateUserClicked() {
  hambClicked();
  d.showPage(Pages.WELCOME_NEW_USER_PAGE);
}
async function asideAddAccount() {
  if (await asideIsUnlocked()) {
    d.showPage(IMPORT_OR_CREATE);
  }
}

async function asideChangePassword() {
  if (await asideIsUnlocked()) {
    d.showPage("change-password");
  }
}

//-----------------------
//executed after the background-page is available
async function initPopup() {
  chrome.alarms.clear("unlock-expired");

  hamb.onClick(hambClicked);

  d.onClickId("err-div", () => {
    const errDiv = d.byId("err-div");
    while (errDiv.firstChild) errDiv.firstChild.remove();
  });

  d.onClickId(SELECT_NETWORK, selectNetworkClicked);

  //aside
  d.qs("aside #lock").onClick(asideLock);
  //d.qs("aside #expand").onClick(asideExpand);
  d.qs("aside #accounts").onClick(asideAccounts);
  d.qs("aside #create-user").onClick(asideCreateUserClicked);
  d.qs("aside #add-account-side").onClick(asideAddAccount);
  //d.qs("aside #change-password").onClick(asideChangePassword);
  d.qs("aside #options").onClick(asideOptions);
  d.qs("aside #contact").onClick(asideContact);
  d.qs("aside #about").onClick(asideAbout);

  d.populateUL("network-items", "network-item-template", NetworkList);

  //--init other pages
  //lala_design temp commented
  d.onClickId("welcome-create-pass", welcomeCreatePassClicked);
  d.onClickId("open-terms-of-use", openTermsOfUseOnNewWindow);
  CreateUser_addListeners();
  ImportOrCreate_addListeners();

  Import_addListeners();

  //update network indicator visual state
  const info = await askBackgroundGetNetworkInfo();
  updateNetworkIndicatorVisualState(info);

  calculateDollarValue();

  //show main page
  return Pages.show();
}

function openTermsOfUseOnNewWindow() {
  localStorageSet({
    reposition: "create-user",
    email: d.inputById("email").value,
  });
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
