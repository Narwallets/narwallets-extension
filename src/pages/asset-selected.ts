import * as c from "../util/conversions.js";
import {
  askBackground,
  askBackgroundCallMethod,
  askBackgroundGetNetworkInfo,
  askBackgroundSetAccount,
} from "../background/askBackground.js";
import { Asset, ExtendedAccountData, History } from "../data/account.js";
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
  selectedAccountData,
  show as AccountSelectedPage_show,
  accountHasPrivateKey,
  showGrantAccessSubPage,
  historyWithIcons
} from "./account-selected.js";
import * as StakingPool from "../contracts/staking-pool.js";
import { asyncRefreshAccountInfo } from "../util/search-accounts.js";
import { addressContacts, saveContactOnBook } from "./address-book.js";
import { GContact } from "../data/Contact.js";
import { localStorageSet } from "../data/util.js";
import { contactExists } from '../pages/address-book.js'
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

const THIS_PAGE = "AccountAssetDetail";

let asset_array: Asset[];
let asset_selected: Asset;
let asset_index: number;
//let accData: ExtendedAccountData;
let isMoreOptionsOpen = false;
let contactToAdd: string;
let metaPoolContract: MetaPool;
let metaPoolContractData: MetaPoolContractState;

// page init
export async function show(
  /*acc: ExtendedAccountData,*/
  assetIndex: number,
  reposition?: string
) {
  hideInMiddle(); // confirmBtn = new d.El("#account-selected-action-confirm");
  d.onClickId("asset-receive", showAssetReceiveClicked);
  d.onClickId("asset-send", showAssetSendClicked);
  d.onClickId("asset-remove", removeSelectedFromAssets);
  d.onChangeId("liquid-unstake-amount", inputChanged);

  //accData = acc;
  asset_array = selectedAccountData.accountInfo.assets;
  asset_index = assetIndex;
  // use Object.assign(new Asset()... to convert into an instance of the class
  asset_selected = Object.assign(new Asset(), selectedAccountData.accountInfo.assets[asset_index]);
  setLastSelectedAsset(asset_selected);

  if (asset_selected.symbol == "STAKED" && asset_selected.icon == "") {
    asset_selected.icon = "STAKE";
    await saveSelectedAccount();
  }
  d.showPage(THIS_PAGE);
  d.onClickId("back-to-selected", backToSelectClicked);
  d.showSubPage("asset-history");
  d.byId("topbar").innerText = "Assets";

  reloadDetails();

  await populateSendCombo("combo-send-asset");

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
    account: selectedAccountData.name,
    assetIndex: assetIndex,
  });
}

function inputChanged() {
  // TO DO: Add fee & receive
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
    acc: selectedAccountData,
    asset: asset_selected,
  };
  d.appendTemplateLI("selected-asset", "selected-asset-template", templateData);

  d.clearContainer("asset-history-details");

  d.populateUL(
    "asset-history-details",
    "asset-history-template",
    historyWithIcons(asset_selected.history)
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
      selectedAccountData.name,
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
        selectedAccountData.name
      );
    } else {
      await askBackgroundCallMethod(
        asset_selected.contractId,
        "withdraw",
        { amount: yoctosToWithdraw },
        selectedAccountData.name
      );
    }
    asset_selected.addHistory("withdraw", amount);
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
  } catch (ex) {
    d.showErr(ex);
  } finally {
    hideOkCancel();
    d.hideWait();
    showInitial();
  }
}

async function Withdraw() {
  try {
    if (!await accountHasPrivateKey()) {
      await backToSelectClicked();
      showGrantAccessSubPage();
      return;
    }

    d.showSubPage("withdraw");
    d.onClickId("withdraw-max", function () {
      d.maxClicked("withdraw-amount", "#selected-asset #balance");
    });
    showOKCancel(confirmWithdraw, showInitial);
  } catch (ex) {
    d.showErr(ex);
  }

}

async function DelayedUnstake() {
  try {
    if (!await accountHasPrivateKey()) {
      await backToSelectClicked();
      showGrantAccessSubPage();
      return;
    }
    d.showSubPage("delayed-unstake");
    d.onClickId("delayed-unstake-max", function () {
      d.maxClicked("delayed-unstake-amount", "#selected-asset #balance");
    });
    await showOKCancel(DelayedUnstakeOk, showInitial);
  } catch (ex) {
    d.showErr(ex);
  }
}

async function LiquidUnstake() {
  try {

    if (!await accountHasPrivateKey()) {
      await backToSelectClicked();
      showGrantAccessSubPage();
      return;
    }

    d.showSubPage("liquid-unstake");
    d.onClickId("liquid-unstake-max", function () {
      d.maxClicked("liquid-unstake-amount", "#selected-asset #balance");
    });
    d.byId("fee-amount").innerText = "";
    metaPoolContract = new MetaPool(
      asset_selected.contractId,
      selectedAccountData.name
    );
    metaPoolContractData = await metaPoolContract.get_contract_state();

    //searchAccounts.contractState;
    await showOKCancel(LiquidUnstakeOk, showInitial);
  } catch (error) {
    d.showErr(error);
  }
}

async function LiquidUnstakeOk() {
  d.showWait();

  try {
    if (!selectedAccountData.isFullAccess) {
      throw Error("you need full access on " + selectedAccountData.name);
    }

    const amount = d.getNumber("#liquid-unstake-amount");
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    const actualSP = asset_selected.contractId;

    const poolAccInfo = await StakingPool.getAccInfo(
      selectedAccountData.name,
      actualSP
    );

    if (poolAccInfo.staked_balance == "0")
      throw Error(`No ${asset_selected.symbol} to liquid-unstake`);

    let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance); // round user amount

    var liquidUnstakeResult = await askBackgroundCallMethod(
      actualSP,
      "liquid_unstake",
      { st_near_to_burn: yoctosToUnstake, min_expected_near: "0" },
      selectedAccountData.name
    );

    asset_selected.balance -= c.yton(yoctosToUnstake);
    asset_selected.addHistory("liquid-unstake", c.yton(yoctosToUnstake));

    await refreshSaveSelectedAccount();
    hideOkCancel();
    reloadDetails();
    showInitial();
    d.showSuccess(
      "Liquid unstaked " + c.toStringDec(c.yton(yoctosToUnstake)) + " stNEAR, received " +
      c.toStringDec(c.yton(liquidUnstakeResult.near)) + " NEAR"
    );

    // leave this for last in case it fails to add the $META asset
    if (liquidUnstakeResult.near != "0") {
      // add also liquid-unstake to main account, with the NEAR amount received
      let hist = new History("liquid-unstake", c.yton(liquidUnstakeResult.near), "", undefined);
      selectedAccountData.accountInfo.history.unshift(hist)
    }

    // leave this for last in case it fails to add the $META asset
    // commented. $META is left in the contract, users must "harvest" to send it to their wallets
    // if (liquidUnstakeResult.meta > 0) {
    //   await addMetaAsset(c.yton(liquidUnstakeResult.meta));
    // }
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
  }
}

async function addMetaAsset(amount: number) {
  let metaAsset = selectedAccountData.accountInfo.assets.find(
    (i) => i.symbol == "META" || i.symbol == "$META"
  );
  if (!metaAsset) {
    let networkInfo = await askBackgroundGetNetworkInfo();
    metaAsset = await addAssetToken(networkInfo.liquidStakingGovToken);
  }
}

async function restakeOk() {
  d.showWait();

  try {
    if (!selectedAccountData.isFullAccess)
      throw Error("you need full access on " + selectedAccountData.name);

    const amount = c.toNum(d.inputById("restake-amount").value);
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    const actualSP = asset_selected.contractId;

    const poolAccInfo = await StakingPool.getAccInfo(
      selectedAccountData.name,
      actualSP
    );

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
      selectedAccountData.name
    );

    asset_selected.balance -= c.yton(yoctosToRestake);
    asset_selected.addHistory("restake", c.yton(yoctosToRestake));

    // since we're re-staking we need to increase staked amount (or initialize it)
    let foundAsset: Asset = getOrCreateAsset(
      "STAKED",
      actualSP,
      "stake",
      "STAKE"
    );
    foundAsset.balance += c.yton(yoctosToRestake);
    foundAsset.addHistory("stake", c.yton(yoctosToRestake));

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
  selectedAccountData.accountInfo.assets.forEach((asset) => {
    if (asset.symbol == symbol && asset.contractId == contractId) {
      existAssetWithThisPool = true;
      foundAsset = asset;
    }
  });

  if (!existAssetWithThisPool) {
    foundAsset = new Asset("idk", "", contractId, 0, type, symbol, icon);
    selectedAccountData.accountInfo.assets.push(foundAsset);
  }
  return foundAsset;
}

async function DelayedUnstakeOk() {
  d.showWait();

  try {
    if (!selectedAccountData.isFullAccess)
      throw Error("you need full access on " + selectedAccountData.name);

    const amount = c.toNum(d.inputById("delayed-unstake-amount").value);
    if (!isValidAmount(amount)) throw Error("Amount is not valid");

    const actualSP = asset_selected.contractId;

    const poolAccInfo = await StakingPool.getAccInfo(
      selectedAccountData.name,
      actualSP
    );

    if (poolAccInfo.staked_balance == "0")
      throw Error("No funds staked to unstake");

    let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance); // round user amount
    if (yoctosToUnstake == poolAccInfo.staked_balance) {
      await askBackgroundCallMethod(
        actualSP,
        "unstake_all",
        {},
        selectedAccountData.name
      );
    } else {
      await askBackgroundCallMethod(
        actualSP,
        "unstake",
        { amount: yoctosToUnstake },
        selectedAccountData.name
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
  let amountToUnstake: number = amount;

  let hist = new History("unstake", amountToUnstake, asset_selected.contractId);

  let unstakedAsset: Asset | undefined = undefined;
  for (let asset of selectedAccountData.accountInfo.assets) {
    if (asset.contractId == asset_selected.contractId && asset.symbol == "UNSTAKED") {
      unstakedAsset = asset;
    }
  };

  if (unstakedAsset) {
    unstakedAsset.balance = c.yton(poolAccInfo.unstaked_balance) + amountToUnstake;
  } else {
    // not existent in wallet
    if (asset_selected.symbol == "STAKED") {
      unstakedAsset = new Asset(
        "",
        "",
        asset_selected.contractId,
        amountToUnstake,
        "unstake",
        "UNSTAKED",
        UNSTAKE_DEFAULT_SVG
      );
      selectedAccountData.accountInfo.assets.push(unstakedAsset);
    } else if (asset_selected.symbol == "STNEAR") {
      // Can't unstake STNEAR if there's no STNEAR asset
      // this is unreachable code
    }
  }
  // add asset history 
  if (unstakedAsset) { unstakedAsset.history.unshift(hist) };
  // add account history
  if (!selectedAccountData.accountInfo.history) {
    selectedAccountData.accountInfo.history = [];
  }
  selectedAccountData.accountInfo.history.unshift(hist);

  // update balance of currently selected pool
  let balance = await StakingPool.getAccInfo(
    selectedAccountData.name,
    asset_selected.contractId
  );
  asset_selected.balance = c.yton(balance.staked_balance);

  refreshSaveSelectedAccount();
}

async function backToSelectClicked() {
  await AccountSelectedPage_show(selectedAccountData.name, undefined);
  hideOkCancel();
}

function showAssetReceiveClicked() {
  d.showSubPage("asset-receive-subpage");
  d.byId("asset-receive-symbol").innerText = asset_selected.symbol;
  d.byId("asset-receive-account").innerText = selectedAccountData.name;
  showOKCancel(showInitial, showInitial);
}

async function showAssetSendClicked() {
  try {

    if (!await accountHasPrivateKey()) {
      await backToSelectClicked();
      showGrantAccessSubPage();
      return;
    }

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
    if (!isValidAccountID(toAccName)) throw Error("Receiver Account Id is invalid");
    if (!isValidAmount(amountToSend)) throw Error("Amount should be a positive integer");
    if (amountToSend > asset_selected.balance) throw Error("Amount exceeds available balance");

    let accountExists = await searchAccounts.checkIfAccountExists(toAccName);
    if (!accountExists) throw Error("Receiver Account does not exists");
    //show confirmation subpage
    d.showSubPage("asset-selected-send-confirmation");
    d.byId("asset-send-confirmation-amount").innerText = c.toStringDec(amountToSend);
    d.byId("asset-symbol-confirmation").innerText = asset_selected.symbol;
    d.byId("asset-send-confirmation-receiver").innerText = toAccName;
    showOKCancel(performSend, showInitial); //on OK clicked, send
  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

async function performSend() {
  try {
    const toAccName = d.byId("asset-send-confirmation-receiver").innerText;
    contactToAdd = toAccName;
    const amountToSend = c.toNum(d.byId("asset-send-confirmation-amount").innerText);
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
      selectedAccountData.name,
      undefined,
      "1"
    );

    hideOkCancel();
    showInitial();

    asset_selected.balance -= amountToSend;
    asset_selected.addHistory("send", amountToSend, toAccName);
    reloadDetails();
    await saveSelectedAccount();

    d.showSuccess(
      "Success: " +
      selectedAccountData.name +
      " transferred " +
      c.toStringDec(amountToSend) +
      " " +
      asset_selected.symbol +
      " to " +
      toAccName
    );

    checkContactList(toAccName);

  } catch (ex) {
    d.showErr(ex.message);
  } finally {
    d.hideWait();
    enableOKCancel();
  }
}

async function deleteAsset() {
  asset_array.splice(asset_index, 1);
  selectedAccountData.accountInfo.assets = asset_array;

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
  console.log(selectedAccountData);
  hideOkCancel();
  d.showSubPage("asset-history");
}

async function refreshSaveSelectedAccount() {
  await searchAccounts.asyncRefreshAccountInfo(
    selectedAccountData.name,
    selectedAccountData.accountInfo
  );

  await saveSelectedAccount();

  selectedAccountData.available =
    selectedAccountData.accountInfo.lastBalance -
    selectedAccountData.accountInfo.lockedOther;
  selectedAccountData.total = selectedAccountData.available;
}

async function saveSelectedAccount(): Promise<any> {
  return askBackgroundSetAccount(
    selectedAccountData.name,
    selectedAccountData.accountInfo
  );
}

function checkContactList(address: string) {
  const toAccName = address.trim()
  if (contactExists(toAccName)) {
    showInitial();
    hideOkCancel();
  }
  else {
    d.showSubPage("sure-add-contact-asset");
    d.byId("asset-add-confirmation-name").innerText = toAccName;
    showOKCancel(addContactToList, showInitial);
  }
}

async function addContactToList() {
  try {
    const contactToSave: GContact = {
      accountId: contactToAdd,
      note: "",
    };
    await saveContactOnBook(contactToSave.accountId, contactToSave);
    populateSendCombo("combo-send-asset");
    showInitial();
  } catch {
    d.showErr("Error in save contact");
  }
  finally {
    hideOkCancel();
  }
}
