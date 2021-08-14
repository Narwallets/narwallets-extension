const THIS_PAGE = "AccountAssetDetail";

import * as c from "../util/conversions.js";
import {
  askBackground,
  askBackgroundCallMethod,
  askBackgroundGetNetworkInfo,
  askBackgroundSetAccount,
  askBackgroundTransferNear,
} from "../background/askBackground.js";
import {
  Asset,
  ExtendedAccountData,
  History,
  addHistory,
} from "../data/account.js";
import {
  isValidAccountID,
  isValidAmount,
} from "../lib/near-api-lite/utils/valid.js";
import * as d from "../util/document.js";
import {
  disableOKCancel,
  enableOKCancel,
  hideOkCancel,
  showOKCancel,
} from "../util/okCancel.js";
import * as searchAccounts from "../util/search-accounts.js";
import {
  addAssetToken,
  fixUserAmountInY,
  populateAssets,
  populateSendCombo,
  show as AccountSelectedPage_show,
} from "./account-selected.js";
import * as StakingPool from "../contracts/staking-pool.js";
import { asyncRefreshAccountInfo } from "../util/search-accounts.js";
import { addressContacts, saveContactOnBook } from "./address-book.js";
import { GContact } from "../data/Contact.js";
import { localStorageSet } from "../data/util.js";
import {
  META_SVG,
  SEND_SVG,
  STAKE_DEFAULT_SVG,
  STNEAR_SVG,
  UNSTAKE_DEFAULT_SVG,
  WITHDRAW_SVG,
} from "../util/svg_const.js";
import { MetaPool } from "../contracts/meta-pool.js";
import { MetaPoolContractState } from "../contracts/meta-pool-structs.js";
import { nearDollarPrice } from "../data/global.js";
import { setLastSelectedAsset } from "./main.js";
import { networkInterfaces } from "node:os";

let asset_array: Asset[];
let asset_selected: Asset;
let asset_index: number;
let accData: ExtendedAccountData;
let isMoreOptionsOpen = false;
let contactToAdd: string;
let metaPoolContract: MetaPool;
let metaPoolContractData: MetaPoolContractState;

// page init
export async function show(
  acc: ExtendedAccountData,
  assetIndex: number,
  reposition?: string
) {
  hideInMiddle(); // confirmBtn = new d.El("#account-selected-action-confirm");
  d.onClickId("asset-receive", showAssetReceiveClicked);
  d.onClickId("asset-send", showAssetSendClicked);
  d.onClickId("asset-remove", removeSelectedFromAssets);
  d.onChangeId("liquid-unstake-amount", inputChanged);

  accData = acc;
  asset_array = acc.accountInfo.assets;
  asset_index = assetIndex;
  asset_selected = acc.accountInfo.assets[asset_index];
  setLastSelectedAsset(asset_selected);

  if (asset_selected.symbol == "STAKED" && asset_selected.icon == "") {
    asset_selected.icon = STAKE_DEFAULT_SVG;
    await saveSelectedAccount();
  }
  d.showPage(THIS_PAGE);
  d.onClickId("back-to-selected", backToSelectClicked);
  d.showSubPage("asset-history");
  d.byId("topbar").innerText = "Assets";

  reloadDetails();

  await populateSendCombo("combo-send-asset");
  console.log(asset_selected);

  switch (asset_selected.symbol) {
    case "STNEAR": {
      d.byId("asset-send").classList.remove("hidden");
      d.byId("asset-receive").classList.remove("hidden");
      d.byId("asset-liquid-unstake").classList.remove("hidden");
      break;
    }
    case "UNSTAKED": {
      d.byId("asset-withdraw").classList.remove("hidden");
      d.byId("asset-restake").classList.remove("hidden");
      break;
    }
    case "STAKED": {
      d.byId("asset-unstake").classList.remove("hidden");
      break;
    }
    default: {
      d.byId("asset-send").classList.remove("hidden");
      d.byId("asset-receive").classList.remove("hidden");
      break;
    }
  }

  d.onClickId("asset-unstake", DelayedUnstake);
  d.onClickId("asset-withdraw", Withdraw);
  d.onClickId("asset-liquid-unstake", LiquidUnstake);
  d.onClickId("asset-restake", ReStake);

  localStorageSet({
    reposition: "asset",
    account: acc.name,
    assetIndex: assetIndex,
  });
}

function inputChanged() {
  // TO DO: Agregar fee y receive
  let value = c.toNum(d.inputById("liquid-unstake-amount").value);
  let fee_bp;
  let extraMsg = "";
  if (isNaN(value) || value <= 0) {
    fee_bp = metaPoolContractData.nslp_current_discount_basis_points;
  } else {
    const liquidity = BigInt(metaPoolContractData.nslp_liquidity);
    const receiveNear = BigInt(
      c.ntoy(value * Number(c.ytonFull(metaPoolContractData.st_near_price)))
    );
    fee_bp = get_discount_basis_points(liquidity, receiveNear);
    const realReceive: BigInt =
      receiveNear - (receiveNear * BigInt(fee_bp)) / BigInt(10000);
    const nearAmount = c.yton(realReceive.toString());
    extraMsg = ` - receive ${c.toStringDec(nearAmount)} \u24c3`;
    extraMsg += ` ~  ${c.toStringDec(nearAmount * nearDollarPrice)} USD`;
    if (liquidity < realReceive) extraMsg = " - Not enough liquidity";
  }
  d.byId("fee-amount").innerText = `Fee: ${(
    fee_bp / 100
  ).toString()} % ${extraMsg}`;
}

function get_discount_basis_points(liquidity: bigint, sell: bigint): number {
  try {
    if (sell > liquidity) {
      //more asked than available => max discount
      return metaPoolContractData.nslp_max_discount_basis_points;
    }

    const target = BigInt(metaPoolContractData.nslp_target);
    const liq_after = liquidity - sell;
    if (liq_after >= target) {
      //still >= target after swap => min discount
      return metaPoolContractData.nslp_min_discount_basis_points;
    }

    let range = BigInt(
      metaPoolContractData.nslp_max_discount_basis_points -
      metaPoolContractData.nslp_min_discount_basis_points
    );
    //here 0<after<target, so 0<proportion<range
    const proportion: bigint = (range * liq_after) / target;
    return (
      metaPoolContractData.nslp_max_discount_basis_points - Number(proportion)
    );
  } catch (ex) {
    console.error(ex);
    return metaPoolContractData.nslp_current_discount_basis_points;
  }
}

function hideInMiddle() {
  d.byId("asset-send").classList.add("hidden");
  d.byId("asset-receive").classList.add("hidden");
  d.byId("asset-liquid-unstake").classList.add("hidden");
  d.byId("asset-withdraw").classList.add("hidden");
  d.byId("asset-unstake").classList.add("hidden");
  d.byId("asset-restake").classList.add("hidden");
}

function reloadDetails() {
  d.clearContainer("selected-asset");
  var templateData = {
    acc: accData,
    asset: asset_selected,
  };
  d.appendTemplateLI("selected-asset", "selected-asset-template", templateData);

  d.clearContainer("asset-history-details");
  d.populateUL(
    "asset-history-details",
    "asset-history-template",
    asset_selected.history
  );
}

async function ReStake() {
  d.showSubPage("restake");
  d.onClickId("restake-max", function () {
    d.maxClicked("restake-amount", "#selected-asset #balance");
  });
  await showOKCancel(restakeOk, showInitial);
}

async function confirmWithdraw() {
  try {
    d.showWait();
    const amount = c.toNum(d.inputById("withdraw-amount").value);

    const poolAccInfo = await StakingPool.getAccInfo(
      accData.name,
      asset_selected.contractId
    );
    if (poolAccInfo.unstaked_balance == "0")
      throw Error("No funds unstaked to withdraw");

    if (!poolAccInfo.can_withdraw)
      throw Error(
        "Funds are unstaked but you must wait (36-48hs) after unstaking to withdraw"
      );

    // ok we've unstaked funds we can withdraw
    let yoctosToWithdraw = fixUserAmountInY(
      amount,
      poolAccInfo.unstaked_balance
    ); // round user amount
    if (yoctosToWithdraw == poolAccInfo.unstaked_balance) {
      await askBackgroundCallMethod(
        asset_selected.contractId,
        "withdraw_all",
        {},
        accData.name
      );
    } else {
      await askBackgroundCallMethod(
        asset_selected.contractId,
        "withdraw",
        { amount: yoctosToWithdraw },
        accData.name
      );
    }
    addAssetHistory("withdraw", amount, WITHDRAW_SVG);
    asset_selected.balance = asset_selected.balance - c.yton(yoctosToWithdraw);

    if (asset_selected.balance == 0) {
      await deleteAsset();
      backToSelectClicked();
    } else {
      await refreshSaveSelectedAccount();
      reloadDetails();
      showInitial();
    }

    d.showSuccess(
      c.toStringDec(c.yton(yoctosToWithdraw)) + " withdrew from the pool"
    );
    console.log(poolAccInfo);
  } catch (ex) {
    d.showErr(ex);
  } finally {
    hideOkCancel();
    d.hideWait();
    showInitial();
  }
}

function Withdraw() {
  d.showSubPage("withdraw");
  d.onClickId("withdraw-max", function () {
    d.maxClicked("withdraw-amount", "#selected-asset #balance");
  });
  showOKCancel(confirmWithdraw, showInitial);
}

async function DelayedUnstake() {
  d.showSubPage("delayed-unstake");
  d.onClickId("delayed-unstake-max", function () {
    d.maxClicked("delayed-unstake-amount", "#selected-asset #balance");
  });
  await showOKCancel(DelayedUnstakeOk, showInitial);
}

async function LiquidUnstake() {
  try {
    d.showSubPage("liquid-unstake");
    d.onClickId("liquid-unstake-max", function () {
      d.maxClicked("liquid-unstake-amount", "#selected-asset #balance");
    });
    d.byId("fee-amount").innerText = "";
    metaPoolContract = new MetaPool(asset_selected.contractId, accData.name);
    metaPoolContractData = await metaPoolContract.get_contract_state();

    //searchAccounts.contractState;
    await showOKCancel(LiquidUnstakeOk, showInitial);
  } catch (error) {
    d.showErr(error);
  }
}

function addAssetHistory(type: string, amount: number, icon: string) {
  let hist: History;
  hist = {
    amount: amount,
    date: new Date().toISOString(),
    type: type,
    destination: "",
    icon,
  };

  if (type == "send") {
    contactToAdd.length > 27
      ? (hist.destination = contactToAdd.substring(0, 24) + "...")
      : (hist.destination = contactToAdd);
  }

  asset_selected.history.unshift(hist);
}
async function LiquidUnstakeOk() {
  d.showWait();

  try {
    if (!accData.isFullAccess)
      throw Error("you need full access on " + accData.name);

    const amount = c.toNum(d.inputById("liquid-unstake-amount").value);
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    const actualSP = asset_selected.contractId;

    const poolAccInfo = await StakingPool.getAccInfo(accData.name, actualSP);

    if (poolAccInfo.staked_balance == "0")
      throw Error("No funds staked to unstake");

    let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance); // round user amount

    var result = await askBackgroundCallMethod(
      actualSP,
      "liquid_unstake",
      { st_near_to_burn: yoctosToUnstake, min_expected_near: "0" },
      accData.name
    );

    if (result.meta > 0) {
      await addMetaAsset(c.yton(result.meta));
    }

    asset_selected.balance -= c.yton(yoctosToUnstake);

    addAssetHistory("liquid-unstake", c.yton(yoctosToUnstake), STNEAR_SVG);
    await refreshSaveSelectedAccount();
    hideOkCancel();
    reloadDetails();
    showInitial();
    d.showSuccess("Liquid unstaked " + c.toStringDec(c.yton(result.near)));
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

async function addMetaAsset(amount: number) {
  const asset = accData.accountInfo.assets.find((i) => i.symbol == "META");
  let networkInfo = await askBackgroundGetNetworkInfo();
  if (!asset) {
    await addAssetToken(networkInfo.liquidStakingGovToken);
  }
}

async function restakeOk() {
  d.showWait();

  try {
    if (!accData.isFullAccess)
      throw Error("you need full access on " + accData.name);

    const amount = c.toNum(d.inputById("restake-amount").value);
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    const actualSP = asset_selected.contractId;

    const poolAccInfo = await StakingPool.getAccInfo(accData.name, actualSP);

    if (poolAccInfo.unstaked_balance == "0")
      throw Error("No funds unstaked to restake");

    let yoctosToRestake = fixUserAmountInY(
      amount,
      poolAccInfo.unstaked_balance
    ); // round user amount

    await askBackgroundCallMethod(
      actualSP,
      "stake",
      { amount: yoctosToRestake },
      accData.name
    );

    asset_selected.balance -= c.yton(yoctosToRestake);

    addHistory(
      asset_selected,
      "restake",
      c.yton(yoctosToRestake),
      STAKE_DEFAULT_SVG
    );

    // Como estoy restakeando, necesito incrementar el saldo del stake (o inicializarlo)
    let foundAsset: Asset = getOrCreateAsset(
      "STAKED",
      actualSP,
      "stake",
      STAKE_DEFAULT_SVG
    );
    foundAsset.balance += c.yton(yoctosToRestake);
    addHistory(foundAsset, "stake", c.yton(yoctosToRestake), STAKE_DEFAULT_SVG);

    await refreshSaveSelectedAccount();
    hideOkCancel();
    reloadDetails();
    showInitial();
    d.showSuccess("Restake " + c.toStringDec(c.yton(yoctosToRestake)));
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

function getOrCreateAsset(
  symbol: string,
  contractId: string,
  type: string,
  icon: string
): Asset {
  let existAssetWithThisPool = false;
  let foundAsset: Asset = new Asset();
  accData.accountInfo.assets.forEach((asset) => {
    if (asset.symbol == symbol && asset.contractId == contractId) {
      existAssetWithThisPool = true;
      foundAsset = asset;
    }
  });

  if (!existAssetWithThisPool) {
    foundAsset = {
      spec: "idk",
      url: "",
      contractId: contractId,
      balance: 0,
      type: type,
      symbol: symbol,
      icon: icon,
      history: [],
    };
    accData.accountInfo.assets.push(foundAsset);
  }
  return foundAsset;
}

async function DelayedUnstakeOk() {
  d.showWait();

  try {
    if (!accData.isFullAccess)
      throw Error("you need full access on " + accData.name);

    const amount = c.toNum(d.inputById("delayed-unstake-amount").value);
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    const actualSP = asset_selected.contractId;

    const poolAccInfo = await StakingPool.getAccInfo(accData.name, actualSP);

    if (poolAccInfo.staked_balance == "0")
      throw Error("No funds staked to unstake");

    let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance); // round user amount
    if (yoctosToUnstake == poolAccInfo.staked_balance) {
      await askBackgroundCallMethod(actualSP, "unstake_all", {}, accData.name);
    } else {
      await askBackgroundCallMethod(
        actualSP,
        "unstake",
        { amount: yoctosToUnstake },
        accData.name
      );
    }
    await createOrUpdateAssetUnstake(poolAccInfo, c.yton(yoctosToUnstake));
    hideOkCancel();
    reloadDetails();
    showInitial();
    d.showSuccess("Unstaked");
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

async function createOrUpdateAssetUnstake(poolAccInfo: any, amount: number) {
  let existAssetWithThisPool = false;
  let foundAsset: Asset = new Asset();
  let amountToUnstake: number = amount;

  let hist: History;

  hist = {
    amount: amountToUnstake,
    date: new Date().toISOString(), //so it's the same as when the data is JSON.parsed() from localStorage
    type: "unstake",
    destination: "",
    icon: UNSTAKE_DEFAULT_SVG,
  };

  accData.accountInfo.assets.forEach((asset) => {
    if (
      asset.contractId == asset_selected.contractId &&
      asset.symbol == "UNSTAKED"
    ) {
      existAssetWithThisPool = true;
      foundAsset = asset;
    }
  });

  if (existAssetWithThisPool) {
    foundAsset.history.unshift(hist);
    foundAsset.balance = c.yton(poolAccInfo.unstaked_balance) + amountToUnstake;
  } else {
    if (asset_selected.symbol == "STAKED") {
      let asset: Asset;
      asset = {
        spec: "",
        url: "",
        contractId: asset_selected.contractId,
        balance: amountToUnstake,
        type: "unstake",
        symbol: "UNSTAKED",
        icon: UNSTAKE_DEFAULT_SVG,
        history: [],
      };
      asset.history.unshift(hist);
      accData.accountInfo.assets.push(asset);
    } else if (asset_selected.symbol == "STNEAR") {
      //TODO
      //Tengo que agregar la actualizacion al inicio
    }
  }
  // update balance of currently selected
  let balance = await StakingPool.getAccInfo(
    accData.name,
    asset_selected.contractId
  );
  asset_selected.balance = c.yton(balance.staked_balance);
  asset_selected.history.unshift(hist);
  //Agrego history de account
  if (!accData.accountInfo.history) {
    accData.accountInfo.history = [];
  }
  accData.accountInfo.history.unshift(hist);

  refreshSaveSelectedAccount();
}

function backToSelectClicked() {
  AccountSelectedPage_show(accData.name, undefined);
  hideOkCancel();
}

function showAssetReceiveClicked() {
  d.showSubPage("asset-receive-subpage");
  d.byId("asset-receive-symbol").innerText = asset_selected.symbol;
  d.byId("asset-receive-account").innerText = accData.name;
  showOKCancel(showInitial, showInitial);
}

function showAssetSendClicked() {
  try {

    if (accData.isReadOnly) throw Error("Account is read-only");

    d.showSubPage("asset-send-subpage");
    d.byId("asset-symbol").innerText = asset_selected.symbol;
    d.byId("max-amount-send-asset").innerText = c.toStringDec(
      asset_selected.balance
    );
    d.onClickId("asset-send-max", function () {
      d.maxClicked("send-to-asset-amount", "#selected-asset #balance");
    });

    showOKCancel(sendOKClicked, showInitial);
  } catch (ex) {
    d.showErr(ex.message);
  }
}

async function sendOKClicked() {
  try {
    //validate
    const toAccName = new d.El("#send-to-asset-account").value;
    const amountToSend = d.getNumber("#send-to-asset-amount");
    if (!isValidAccountID(toAccName))
      throw Error("Receiver Account Id is invalid");
    if (!isValidAmount(amountToSend))
      throw Error("Amount should be a positive integer");

    if (amountToSend > asset_selected.balance)
      throw Error("Amount exceeds available balance");

    //show confirmation subpage
    d.showSubPage("asset-selected-send-confirmation");
    d.byId("asset-send-confirmation-amount").innerText = c.toStringDec(amountToSend);
    d.byId("asset-symbol-confirmation").innerText = asset_selected.symbol;
    d.byId("asset-send-confirmation-receiver").innerText = toAccName;
    showOKCancel(performSend, showInitial); //on OK clicked, send
    
  } catch (ex) {
    d.showErr(ex.message);
  }
}

async function performSend() {
  try {
    const toAccName = d.byId("asset-send-confirmation-receiver").innerText;
    contactToAdd = toAccName;
    const amountToSend = c.toNum(
      d.byId("asset-send-confirmation-amount").innerText
    );
    d.byId("asset-symbol-confirmation").innerText = asset_selected.symbol;

    disableOKCancel();
    d.showWait();

    await askBackgroundCallMethod(
      asset_selected.contractId,
      "ft_transfer",
      {
        receiver_id: toAccName,
        amount: c.ntoy(amountToSend),
        memo: null,
      },
      accData.name,
      undefined,
      "1"
    );

    asset_selected.balance -= amountToSend;

    addAssetHistory("send", amountToSend, SEND_SVG);
    reloadDetails();
    await saveSelectedAccount();
    hideOkCancel();
    showInitial();

    d.showSuccess(
      "Success: " +
      accData.name +
      " transferred " +
      c.toStringDec(amountToSend) +
      " " +
      asset_selected.symbol +
      " to " +
      toAccName
    );

    checkContactList();
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

async function deleteAsset() {
  asset_array.splice(asset_index, 1);
  accData.accountInfo.assets = asset_array;

  await saveSelectedAccount();

  refreshSaveSelectedAccount();

  populateAssets();

  //Guardo

  //Salgo del asset detail eliminado
  backToSelectClicked();
}

export function removeSelectedFromAssets() {
  d.showSubPage("asset-remove-selected");
  showOKCancel(deleteAsset, showInitial);

  // //elimino, limpio y relleno lista de assets
}

function showInitial() {
  console.log(accData);
  hideOkCancel();
  d.showSubPage("asset-history");
}

async function refreshSaveSelectedAccount() {
  await searchAccounts.asyncRefreshAccountInfo(
    accData.name,
    accData.accountInfo
  );

  await saveSelectedAccount();

  accData.available =
    accData.accountInfo.lastBalance - accData.accountInfo.lockedOther;
  accData.total = accData.available;
}

async function saveSelectedAccount(): Promise<any> {
  return askBackgroundSetAccount(accData.name, accData.accountInfo);
}

async function checkContactList() {
  const toAccName = contactToAdd;
  let found = false;

  if (addressContacts.length < 1) {
    d.showSubPage("sure-add-contact-asset");
    showOKCancel(addContactToList, showInitial);
  }

  addressContacts.forEach((contact) => {
    if (contact.accountId == toAccName) {
      found = true;
    }
  });

  if (found) {
    showInitial();
    hideOkCancel();
  } else {
    d.showSubPage("sure-add-contact-asset");
    d.byId("asset-add-confirmation-name").innerText = contactToAdd;
    showOKCancel(addContactToList, showInitial);
  }
}

async function addContactToList() {
  try {
    const contactToSave: GContact = {
      accountId: contactToAdd,
      note: "",
    };

    addressContacts.push(contactToSave);

    d.showSuccess("Success");
    hideOkCancel();
    populateSendCombo("combo-send-asset");
    await saveContactOnBook(contactToSave.accountId, contactToSave);
    showInitial();
  } catch {
    d.showErr("Error in save contact");
  }
}

// function displayReflectTransfer(amountToSend: number, toAccName: string) {

//   if (amountToSend == 0) return;

//   .forEach(accData => {

//   });
//   selectedAccountData.accountInfo.lastBalance -= amountNear;
//   selectedAccountData.available -= amountNear;}
