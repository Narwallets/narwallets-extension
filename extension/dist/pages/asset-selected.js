const THIS_PAGE = "AccountAssetDetail";
import * as c from "../util/conversions.js";
import { askBackgroundCallMethod, askBackgroundSetAccount, } from "../background/askBackground.js";
import { Asset } from "../data/account.js";
import { isValidAccountID, isValidAmount, } from "../lib/near-api-lite/utils/valid.js";
import * as d from "../util/document.js";
import { disableOKCancel, enableOKCancel, hideOkCancel, showOKCancel, } from "../util/okCancel.js";
import * as searchAccounts from "../util/search-accounts.js";
import { STAKE_DEFAULT_SVG, populateSendCombo } from "./account-selected.js";
import * as StakingPool from "../contracts/staking-pool.js";
let asset_array;
let asset_selected;
let asset_index;
let accData;
let isMoreOptionsOpen = false;
// page init
export async function show(acc, assetIndex, reposition) {
    // confirmBtn = new d.El("#account-selected-action-confirm");
    // cancelBtn = new d.El("#account-selected-action-cancel");
    d.onClickId("asset-receive", showAssetReceiveClicked);
    d.onClickId("asset-send", showAssetSendClicked);
    d.onClickId("asset-remove", removeSelectedFromAssets);
    // confirmBtn.onClick(confirmClicked);
    // cancelBtn.onClick(cancelClicked);
    accData = acc;
    asset_array = acc.accountInfo.assets;
    asset_index = assetIndex;
    asset_selected = acc.accountInfo.assets[asset_index];
    if (asset_selected.symbol == "STAKE" && asset_selected.icon == "") {
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
            d.byId("asset-unstake").innerText = "Liquid Unstake";
            break;
        }
        case "UNSTAKED": {
            d.byId("asset-unstake").innerText = "Withdraw";
            break;
        }
        default: {
            d.byId("asset-unstake").innerText = "Unstake";
            break;
        }
    }
    d.onClickId("asset-unstake", UnstakeMiddle);
}
function reloadDetails() {
    d.clearContainer("selected-asset");
    var templateData = {
        acc: accData,
        asset: asset_selected,
    };
    d.appendTemplateLI("selected-asset", "selected-asset-template", templateData);
    d.clearContainer("asset-history-details");
    d.populateUL("asset-history-details", "asset-history-template", asset_selected.history);
}
function UnstakeMiddle() {
    switch (d.byId("asset-unstake").innerText) {
        case "Liquid Unstake": {
            LiquidUnstake();
            break;
        }
        case "Withdraw": {
            Withdraw();
            break;
        }
        default: {
            DelayedUnstake();
            break;
        }
    }
}
async function Withdraw() {
    try {
        const amount = c.toNum(d.inputById("liquid-unstake-mount").value);
        const poolAccInfo = await StakingPool.getAccInfo(accData.name, asset_selected.contractId);
        if (poolAccInfo.unstaked_balance == "0")
            throw Error("No funds unstaked to withdraw");
        if (!poolAccInfo.can_withdraw)
            throw Error("Funds are unstaked but you must wait (36-48hs) after unstaking to withdraw");
        // ok we've unstaked funds we can withdraw
        let yoctosToWithdraw = fixUserAmountInY(amount, poolAccInfo.unstaked_balance); // round user amount
        if (yoctosToWithdraw == poolAccInfo.unstaked_balance) {
            await askBackgroundCallMethod(asset_selected.contractId, "withdraw_all", {}, accData.name);
        }
        else {
            await askBackgroundCallMethod(asset_selected.contractId, "withdraw", { amount: yoctosToWithdraw }, accData.name);
        }
        d.showSuccess(c.toStringDec(c.yton(yoctosToWithdraw)) + " withdrew from the pool");
        console.log(poolAccInfo);
    }
    catch (ex) {
        d.showErr(ex);
    }
}
async function DelayedUnstake() {
    d.showSubPage("liquid-unstake");
    await showOKCancel(DelayedUnstakeOk, showInitial);
}
async function LiquidUnstake() {
    console.log("Hola, unstake normal");
    const poolAccInfo = await StakingPool.getAccInfo(accData.name, asset_selected.contractId);
    console.log(poolAccInfo);
}
async function DelayedUnstakeOk() {
    d.showWait();
    try {
        if (!accData.isFullAccess)
            throw Error("you need full access on " + accData.name);
        const amount = c.toNum(d.inputById("liquid-unstake-mount").value);
        if (!isValidAmount(amount))
            throw Error("Amount is not valid");
        const actualSP = asset_selected.contractId;
        const poolAccInfo = await StakingPool.getAccInfo(accData.name, actualSP);
        if (poolAccInfo.staked_balance == "0")
            throw Error("No funds staked to unstake");
        let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance); // round user amount
        if (yoctosToUnstake == poolAccInfo.staked_balance) {
            await askBackgroundCallMethod(actualSP, "unstake_all", {}, accData.name);
        }
        else {
            await askBackgroundCallMethod(actualSP, "unstake", { amount: yoctosToUnstake }, accData.name);
        }
        await createOrUpdateAssetUnstake(poolAccInfo);
        hideOkCancel();
        reloadDetails();
        showInitial();
        d.showSuccess("Unstaked");
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
        d.hideWait();
    }
}
async function createOrUpdateAssetUnstake(poolAccInfo) {
    let existAssetWithThisPool = false;
    let foundAsset = new Asset();
    let amountToUnstake = c.toNum(d.inputById("liquid-unstake-mount").value);
    let hist;
    hist = {
        ammount: amountToUnstake,
        date: new Date().toISOString(),
        type: "unstake",
    };
    accData.accountInfo.assets.forEach((asset) => {
        if (asset.contractId == asset_selected.contractId &&
            asset.symbol == "UNSTAKED") {
            existAssetWithThisPool = true;
            foundAsset = asset;
        }
    });
    if (existAssetWithThisPool) {
        foundAsset.history.push(hist);
        foundAsset.balance = c.yton(poolAccInfo.unstaked_balance);
    }
    else {
        let asset;
        asset = {
            spec: "",
            url: "",
            contractId: asset_selected.contractId,
            balance: c.yton(poolAccInfo.unstaked_balance),
            type: "unstake",
            symbol: "UNSTAKED",
            icon: STAKE_DEFAULT_SVG,
            history: [],
        };
        asset.history.push(hist);
        accData.accountInfo.assets.push(asset);
    }
    let balance = await StakingPool.getAccInfo(accData.name, asset_selected.contractId);
    asset_selected.balance = c.yton(balance.staked_balance);
    asset_selected.history.push(hist);
    //Agrego history de account
    if (!accData.accountInfo.history) {
        accData.accountInfo.history = [];
    }
    accData.accountInfo.history.push(hist);
    console.log(accData);
    refreshSaveSelectedAccount();
}
function fixUserAmountInY(amount, yoctosMax) {
    let yoctosResult = yoctosMax; //default => all
    if (amount + 2 < c.yton(yoctosResult)) {
        yoctosResult = c.ntoy(amount); //only if it's less of what's available, we take the input amount
    }
    else if (amount > 2 + c.yton(yoctosMax)) {
        //only if it's +1 above max
        throw Error("Max amount is " + c.toStringDec(c.yton(yoctosMax)));
        //----------------
    }
    return yoctosResult;
}
function reloadAssetsList() {
    d.clearContainer("assets-list");
    d.populateUL("assets-list", "asset-item-template", accData.accountInfo.assets);
}
function backToSelectClicked() {
    reloadAssetsList();
    d.showPage("account-selected");
    d.showSubPage("assets");
    d.byId("ok-cancel-row").classList.add("hidden");
    d.byId("topbar").innerText = "Accounts";
}
function showAssetReceiveClicked() {
    d.showSubPage("asset-receive-subpage");
    d.byId("asset-receive-symbol").innerText = asset_selected.symbol;
    d.byId("asset-receive-account").innerText = accData.name;
    showOKCancel(showInitial, showInitial);
}
function showAssetSendClicked() {
    d.showSubPage("asset-send-subpage");
    d.byId("asset-symbol").innerText = asset_selected.symbol;
    d.byId("max-amount-send-asset").innerText = c.toStringDec(asset_selected.balance);
    showOKCancel(sendOKClicked, showInitial);
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
        if (accData.isReadOnly)
            throw Error("Account is read-only");
        if (amountToSend > asset_selected.balance)
            throw Error("Amount exceeds available balance");
        //show confirmation subpage
        d.showSubPage("asset-selected-send-confirmation");
        d.byId("asset-send-confirmation-amount").innerText =
            c.toStringDec(amountToSend);
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
        const amountToSend = c.toNum(d.byId("asset-send-confirmation-amount").innerText);
        d.byId("asset-symbol-confirmation").innerText = asset_selected.symbol;
        disableOKCancel();
        d.showWait();
        await askBackgroundCallMethod(asset_selected.contractId, "ft_transfer", {
            receiver_id: toAccName,
            amount: c.ntoy(amountToSend),
            memo: null,
        }, accData.name, undefined, "1");
        hideOkCancel();
        showInitial();
        //TODO transaction history per network
        //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
        //global.state.transactions[Network.current].push(transactionInfo)
        d.showSuccess("Success: " +
            accData.name +
            " transferred " +
            c.toStringDec(amountToSend) +
            " " +
            asset_selected.symbol +
            " to " +
            toAccName);
        //Checkear
        //displayReflectTransfer(amountToSend, toAccName);
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
        d.hideWait();
        enableOKCancel();
    }
}
function deleteAsset() {
    asset_array.splice(asset_index, 1);
    d.clearContainer("assets-list");
    d.populateUL("assets-list", "asset-item-template", asset_array);
    //Guardo
    refreshSaveSelectedAccount();
    //Salgo del asset detail eliminado
    backToSelectClicked();
}
export function removeSelectedFromAssets() {
    d.showSubPage("asset-remove-selected");
    showOKCancel(deleteAsset, showInitial);
    // //elimino, limpio y relleno lista de assets
}
function showInitial() {
    d.showSubPage("asset-history");
}
async function refreshSaveSelectedAccount() {
    await searchAccounts.asyncRefreshAccountInfo(accData.name, accData.accountInfo);
    await saveSelectedAccount();
}
async function saveSelectedAccount() {
    return askBackgroundSetAccount(accData.name, accData.accountInfo);
}
// function displayReflectTransfer(amountToSend: number, toAccName: string) {
//   if (amountToSend == 0) return;
//   .forEach(accData => {
//   });
//   selectedAccountData.accountInfo.lastBalance -= amountNear;
//   selectedAccountData.available -= amountNear;}
//# sourceMappingURL=asset-selected.js.map