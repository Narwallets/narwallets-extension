import * as d from "../util/document.js";
import * as c from "../util/conversions.js";

import { Account, Asset, asyncRefreshAccountInfoLastBalance, ExtendedAccountData } from "../data/account.js";
import { show as AccountSelectedPage_show } from "./account-selected.js";
import { show as UnlockPage_show } from "./unlock.js";

import {
  localStorageGet,
  localStorageGetAndRemove,
  localStorageRemove,
  localStorageSet,
} from "../data/util.js";
import {
  askBackground,
  askBackgroundAllAddressContact,
  askBackgroundAllNetworkAccounts,
  askBackgroundGetState,
  askBackgroundIsLocked,
  askBackgroundSetAccount,
  askBackgroundViewMethod,
} from "../background/askBackground.js";
import { D } from "../lib/tweetnacl/core/core.js";
import { saveAccount } from "../data/global.js";
import * as StakingPool from "../contracts/staking-pool.js";
import { activeNetworkInfo, asideSwitchMode, setIsDark } from "../index.js";
import { hideOkCancel } from "../util/okCancel.js";

//--- content sections at MAIN popup.html
export const WELCOME_NEW_USER_PAGE = "welcome-new-user-page";
export const CREATE_USER = "create-user";
export const CHANGE_PASSWORD = "change-password";

export const UNLOCK = "unlock";

export const ACCOUNT_LIST_MAIN = "account-list-main";
export const ADD_ACCOUNT = "add-account";
export const IMPORT_OR_CREATE = "import-or-create";

export const ACCOUNTS_LIST = "accounts-list";
export const ACCOUNT_ITEM = "account-item";

let lastSelectedAccount: ExtendedAccountData;
export let lastSelectedAsset: Asset;

export function setLastSelectedAccount(data: ExtendedAccountData) {
  lastSelectedAccount = data;
}

export function setLastSelectedAsset(data: Asset) {
  lastSelectedAsset = data;
}

let draggingEl: HTMLElement;
function accountItem_drag(ev: Event) {
  ev.preventDefault();
  if (!draggingEl) {
    //console.log("start")
    draggingEl = ev.target as HTMLElement;
    if (draggingEl) draggingEl.classList.add("invisible");
    new d.All("li.account-item").toggleClass("unselectable");
  }
}

function accountItem_dragOver(ev: Event) {
  ev.preventDefault(); //allow drop
  //console.log("over")
  //@ts-ignore
  if (ev.target.classList.contains("account-item")) {
    //@ts-ignore
    draggingEl.parentNode.insertBefore(draggingEl, ev.target);
    //console.log("over")
  }
}
function total_dragOver() {
  if (draggingEl && draggingEl.parentNode)
    draggingEl.parentNode.appendChild(draggingEl);
}
// function accountItem_dragEnter(ev:Event){
//   //@ts-ignore
//   if (ev.target.classList.contains("account-item")){
//     //console.log("enter")
//     //ev.target.classList.add("dragover")
//   }
// }
// function accountItem_dragLeave(ev:Event){
//   //@ts-ignore
//   if (ev.target.classList.contains("account-item")){
//     //console.log("leave")
//     //ev.target.classList.remove("dragover")
//   }
// }
function accountItem_drop(ev: Event) {
  ev.preventDefault();
  //console.log("drop")
}
async function accountItem_dragend(ev: Event) {
  //console.log("dragEnd")
  ev.preventDefault();
  d.all("li.account-item");
  draggingEl.classList.remove("invisible");
  draggingEl = undefined as unknown as HTMLElement;
  //save new order
  const accountLis = d.all("li.account-item");
  accountLis.toggleClass("unselectable");
  let order = 1;
  const networkAccounts = await askBackgroundAllNetworkAccounts();
  accountLis.elems.forEach(async (li) => {
    const accInfo = networkAccounts[li.id];
    //console.log(n,accInfo.type,li.id)
    if (accInfo && accInfo.order != order) {
      await askBackground({
        code: "set-account-order",
        accountId: li.id,
        order: order,
      });
    }
    order++;
  });
}

//--------------------------
function sortByOrder(a: ExtendedAccountData, b: ExtendedAccountData) {
  if (a.accountInfo.order > b.accountInfo.order) return 1;
  return -1;
}

export function addAccountClicked() {
  d.onClickId("add-account-back-to-account", backToAccountsClicked);
  d.showPage(IMPORT_OR_CREATE);
}

async function disconnectFromWepPageClicked() {
  const button = d.qs("#disconnect-from-web-page");
  button.enabled = false;
  try {
    await askBackground({ code: "disconnect" });
    d.showSuccess("disconnected");
    setTimeout(function () {
      d.qs("#disconnect-line").hide();
      button.enabled = true;
    }, 1000);
  } catch (ex) {
    d.showErr(ex.message);
    button.enabled = true;
  }
}

//--------------------------
export async function show() {
  try {
    d.hideErr();

    //is locked?
    const locked = await askBackgroundIsLocked();
    if (locked) {
      //do a user exists?
      const state = await askBackgroundGetState();

      if (state.usersList.length == 0) {
        //no users => welcome new User
        d.showPage(WELCOME_NEW_USER_PAGE);
        await tryReposition();
        return; //*****
      }
      //user & locked => unlock
      await UnlockPage_show();
      return; //*****
    }

    //logged-in and with no accounts? add an account
    const countAccounts = await askBackground({
      code: "getNetworkAccountsCount",
    });
    if (countAccounts == 0) {
      d.showPage(IMPORT_OR_CREATE);
      return;
    }

    //here we have:
    //a user, unlocked, with accounts.
    //
    //show the logged-in & unlocked user their accounts
    //
    d.qs(".topbarcaption").innerText = "Accounts";
    d.clearContainer(ACCOUNTS_LIST);

    //get accounts, sort by accountInfo.order and show as LI
    const accountsRecord = await askBackgroundAllNetworkAccounts();
    const list: ExtendedAccountData[] = [];
    for (let key in accountsRecord) {
      list.push(new ExtendedAccountData(key, accountsRecord[key]));
    }
    list.sort(sortByOrder);
    //debug
    //for(let item of list) console.log(item.accountInfo.order,item.accountInfo.type, item.name)

    const TEMPLATE = `
    <div class="account-item" data-id="{name}">
      <div class="accountlistitem">
        <div class="accountlistname">{name}</div>
        <div class="accountlistbalance balance">{total}</div>
        <div class="accountlistcomment">{accountInfo.note}</div>
      </div>
    </div>
    `;
    d.populateUL(ACCOUNTS_LIST, TEMPLATE, list);

    let total = 0;
    //connect all item to accountItemClicked
    document
      .querySelectorAll("#accounts-list .account-item")
      .forEach((item) => {
        item.addEventListener("click", accountItemClicked);
        //item.addEventListener("dragstart", accountItem_dragStart)
        item.addEventListener("drag", accountItem_drag);
        //item.addEventListener("dragenter", accountItem_dragEnter)
        item.addEventListener("dragover", accountItem_dragOver);
        //item.addEventListener("dragleave", accountItem_dragLeave)
        item.addEventListener("drop", accountItem_drop);
        item.addEventListener("dragend", accountItem_dragend);
        //@ts-ignore
        item.draggable = true;
        let balanceNum = 0;
        try {
          balanceNum = c.toNum(d.getChildText(item, ".balance"));
        } catch {
          balanceNum = 0;
        }
        if (isNaN(balanceNum)) balanceNum = 0;
        total += balanceNum;
      });

    //show total
    const totalEl = new d.El("#account-list-main .balance.total");
    totalEl.innerText = c.toStringDec(total);
    d.qs("#account-list-main .total-row").el.addEventListener(
      "dragover",
      total_dragOver
    );

    d.onClickId(ADD_ACCOUNT, addAccountClicked);

    //const disconnectButton = d.qs("#disconnect-from-web-page");
    //disconnectButton.onClick(disconnectFromWepPageClicked);

    d.showPage(ACCOUNT_LIST_MAIN);

    //d.qs("#disconnect-line").hide();
    const isConnected = await askBackground({ code: "isConnected" });
    d.onClickId("back-to-account", backToAccountsClicked);

    //d.qs("#disconnect-line").showIf(isConnected);

    await tryReposition();

  } catch (ex) {
    await UnlockPage_show(); //show the unlock-page
    d.showErr(ex.message);
  } finally {
  }
}

export function backToAccountsClicked() {
  d.clearContainer("assets-list");
  d.showPage("account-list-main");
  d.showSubPage("assets");
  hideOkCancel()
}

async function tryReposition() {
  const reposition = await localStorageGetAndRemove("reposition");
  switch (reposition) {
    case "create-user": {
      //was creating user but maybe jumped to terms-of-use
      d.showPage(CREATE_USER);
      //d.inputById("email").value = await localStorageGetAndRemove("email");
      break;
    }
    case "account":
    case "asset":
    case "stake": {
      const account = await localStorageGetAndRemove("account");
      const assetIndex = await localStorageGetAndRemove("assetIndex");
      const isLocked = await askBackgroundIsLocked();
      if (!isLocked) {
        if (account) {
          //console.log("reposition ", account, reposition, assetIndex)
          AccountSelectedPage_show(account, reposition, assetIndex);
        }
      }
    }
  }
}

export function backToAccountsList() {
  //remove selected account auto-click
  localStorageRemove("account");
  show();
}

//---------------------------------------------------
//-- account item clicked => account selected Page --
//---------------------------------------------------
export function accountItemClicked(ev: Event) {
  if (ev.target && ev.target instanceof HTMLElement) {
    const li = ev.target.closest("li");
    if (li) {
      const accName = li.id; // d.getClosestChildText(".account-item", ev.target, ".name");
      if (!accName) return;
      AccountSelectedPage_show(accName, undefined);
    }
  }
}


export async function refreshAllAccounts() {
  const accountsRecord = await askBackgroundAllNetworkAccounts();

  for (let key in accountsRecord) {

    if (activeNetworkInfo.name != accountsRecord[key].network) {
      // network changed
      return;
    }

    await asyncRefreshAccountInfoLastBalance(key, accountsRecord[key]);
    const extAcc = new ExtendedAccountData(key, accountsRecord[key]);

    if (key == lastSelectedAccount?.name) {
      d.qs("#selected-account .accountdetsbalance").innerText = c.toStringDec(extAcc.total);
      for (let i = 0; i < extAcc.accountInfo.assets.length; i++) {
        let asset = extAcc.accountInfo.assets[i];
        if (asset.symbol == "UNSTAKED" || asset.symbol == "STAKED") {
          let poolAccInfo = await StakingPool.getAccInfo(
            extAcc.name,
            asset.contractId
          );
          if (asset.symbol == "UNSTAKED") {
            asset.balance = c.yton(poolAccInfo.unstaked_balance);
          } else {
            asset.balance = c.yton(poolAccInfo.staked_balance);
          }
        } else {
          let tokenAccBalance = await askBackgroundViewMethod(
            asset.contractId,
            "ft_balance_of",
            { account_id: extAcc.name }
          );
          asset.balance = c.yton(tokenAccBalance);
        }

        if (asset.contractId == lastSelectedAsset?.contractId && asset.symbol == lastSelectedAsset.symbol) {
          d.qs("#selected-asset #balance").innerText = c.toStringDec(asset.balance);
        }
      }
    }
    await askBackgroundSetAccount(key, accountsRecord[key]);
  }

}
