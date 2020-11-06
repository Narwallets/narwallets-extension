import * as c from "../util/conversions.js"
import * as d from "../util/document.js"
import * as global from "../data/global.js"
import { options } from "../data/options.js"
import * as Network from "../data/Network.js"
import * as nearAccounts from "../util/near-accounts.js"
import * as Pages from "../pages/main.js"

import * as near from "../api/near-rpc.js"
import * as seedPhraseUtil from "../api/utils/seed-phrase.js"
import { PublicKey } from "../api/utils/key-pair.js"
import { setRpcUrl } from "../api/utils/json-rpc.js"
import { LockupContract } from "../contracts/LockupContract.js"
import { Account, ExtendedAccountData } from "../data/Account.js"

/*+
import type { AnyElement, ClickHandler } from "../util/document.js"
+*/

const THIS_PAGE = "account-selected";

let selectedAccountData/*:ExtendedAccountData*/

let accountInfoName /*:d.El*/;
let accountBalance /*:d.El*/;

let removeButton /*:d.El*/;
let refreshButton /*:d.El*/;

let seedTextElem /*:d.El*/;

export function show(accName/*:string*/) {
    initPage();
    showAccountData(accName);
    d.showPage(THIS_PAGE)
}

// page init
let okCancelRow/*:d.El*/
let confirmBtn/*:d.El*/
let cancelBtn/*:d.El*/

function initPage() {

    //accountAmount.onInput(amountInput);

    removeButton = new d.El("button#remove");
    refreshButton = new d.El("button#refresh");

    okCancelRow = new d.El(".footer .ok-cancel")
    confirmBtn = new d.El("#account-selected-action-confirm")
    cancelBtn = new d.El("#account-selected-action-cancel")

    seedTextElem = new d.El("#seed-phrase")

    const backLink = new d.El("#account-selected.page .back-link");
    backLink.onClick(Pages.showMain);

    d.onClickId("send", sendClicked);
    d.onClickId("stake", stakeClicked);
    d.onClickId("unstake", unstakeClicked);
    d.onClickId("list-pools", listPoolsClicked);
    d.onClickId("receive", receiveClicked);

    showButtons(); //2nd or third entry - always show the buttons

    refreshButton.onClick(refreshClicked);
    d.onClickId("moreless", moreLessClicked);
    d.onClickId("add-note", addNoteClicked);

    d.onClickId("access", accessStatusClicked);
    d.onClickId("explore", exploreButtonClicked);
    d.onClickId("search-pools", searchPoolsButtonClicked);
    d.onClickId("show-public-key", showPublicKeyClicked);
    d.onClickId("lockup-add-public-key", LockupAddPublicKey);
    d.onClickId("delete-account", DeleteAccount);


    removeButton.onClick(removeAccountClicked);

    confirmBtn.onClick(confirmClicked);
    cancelBtn.onClick(cancelClicked);

}

function showingMore() {
    const buttonsMore = new d.All(".buttons-more")
    if (buttonsMore.elems.length == 0) return false;
    return !buttonsMore.elems[0].classList.contains("hidden")
}
function moreLessClicked() {
    const selector = global.SecureState.advancedMode ? ".buttons-more" : ".buttons-more:not(.advanced)"
    const buttonsMore = new d.All(selector)
    buttonsMore.toggleClass("hidden")
    d.qs("#moreless").innerText = (showingMore() ? "Less..." : "More...")
}


function getAccountRecord(accName/*:string*/)/*:Account*/ {
    return global.SecureState.accounts[Network.current][accName];
}

function showAccountData(accName/*:string*/) {

    const accInfo = getAccountRecord(accName)
    if (!accInfo) throw new Error("Account is not in this wallet: " + accName)

    selectedAccountData = new ExtendedAccountData(accName, accInfo)

    const SELECTED_ACCOUNT = "selected-account"
    d.clearContainer(SELECTED_ACCOUNT)
    d.appendTemplateLI(SELECTED_ACCOUNT, "selected-account-template", selectedAccountData)

    accountInfoName = new d.El(".selected-account-info .name");
    accountBalance = new d.El(".selected-account-info .total.balance");

    if (selectedAccountData.accountInfo.ownerId) {
        const oiLine = new d.El(".selected-account-info #owner-id-info-line");
        oiLine.show()
    }
    if (selectedAccountData.accountInfo.lockedOther) {
        const lockedOthLine = new d.El(".selected-account-info #locked-others-line");
        lockedOthLine.show()
    }
    if (selectedAccountData.accountInfo.stakingPool) {
        d.qs(".selected-account-info #staking-pool-info-line").show()
        d.qs(".selected-account-info #staking-pool-balance-line").show()
    }

    d.onClickSelector(".selected-account-info .access-status", accessLabelClicked)
}

/*+
type StateResult={
    amount: string; // "27101097909936818225912322116"
    block_hash: string; //"DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
    block_height: number; //20046823
    code_hash: string; //"11111111111111111111111111111111"
    locked: string; //"0"
    storage_paid_at: number; // 0
    storage_usage: number; //2080
}
+*/


function listPoolsClicked() {
    chrome.storage.local.set({ selectedNetwork: Network.current })
    chrome.windows.create({
        url: chrome.runtime.getURL("outside/list-pools.html"),
        state: "maximized"
    });

}


let confirmFunction/*:(ev:Event)=>void*/ = function (ev) { }

function showOKCancel(OKHandler/*:d.ClickHandler*/) {
    confirmFunction = OKHandler
    okCancelRow.show()
    enableOKCancel()
}
function disableOKCancel() {
    confirmBtn.disabled = true
    cancelBtn.disabled = true
}
function enableOKCancel() {
    confirmBtn.disabled = false
    cancelBtn.disabled = false
}

function checkNormalAccountIsFullAccess() {
    if (selectedAccountData.accountInfo.privateKey) return true;
    showOKToGrantAccess()
    throw Error("Account access is Read-Only")
}

function checkAccountAccess() {
    if (selectedAccountData.accountInfo.type == "lock.c") {
        if (!selectedAccountData.accountInfo.ownerId) throw Error("Owner is unknown. Try importing owner account");
        const ownerInfo = getAccountRecord(selectedAccountData.accountInfo.ownerId)
        if (!ownerInfo) throw Error("The owner account is not in this wallet")
        if (!ownerInfo.privateKey) throw Error("You need full access on the owner account: " + selectedAccountData.accountInfo.ownerId + " to operate this lockup account")
        //new d.El(".footer .title").hide() //no hay  espacio
    }
    else {//normal account
        checkNormalAccountIsFullAccess()
        //new d.El(".footer .title").show() //hay espacio
    }
}

function fullAccessSubPage(subPageId/*:string*/, OKHandler/*:ClickHandler*/) {
    try {
        d.hideErr()
        checkAccountAccess()
        d.showSubPage(subPageId)
        showOKCancel(OKHandler)
    }
    catch (ex) {
        d.showErr(ex.message)
    }

}

function GotoOwnerOkHandler() {
    if (selectedAccountData.accountInfo.ownerId) {
        show(selectedAccountData.accountInfo.ownerId);
    }
}

function showGotoOwner() {
    if (selectedAccountData.accountInfo.ownerId) {
        d.byId("account-selected-open-owner-name").innerText = selectedAccountData.accountInfo.ownerId;
        d.showSubPage('account-selected-open-owner')
        showOKCancel(GotoOwnerOkHandler)
    }
}
function showOKToGrantAccess() {
    d.showSubPage('account-selected-ok-to-grant-access')
    showOKCancel(accessStatusClicked)
}

function receiveClicked() {
    d.showSubPage('account-selected-receive')
    d.byId("account-selected-receive-name").innerText = selectedAccountData.name
    showOKCancel(showButtons)
    showGotoOwner() //if this is a lock.c shows the "goto owner" page
}


//--------------------------------
function checkOwnerAccessThrows(action/*:string*/) {
    //check if we have owner's key
    const info = selectedAccountData.accountInfo
    if (info.ownerId) {
        const owner = getAccountRecord(info.ownerId)
        if (!owner || !owner.privateKey) {
            showGotoOwner()
            throw Error("You need full access on " + info.ownerId +
                " to " + action + " from this " + selectedAccountData.typeFull);
        }
    }
}

//----------------------
function sendClicked() {
    try {
        let maxAmountToSend = selectedAccountData.available
        let performer = performSend //default send
        //if it's a lock.c and we didn't add a priv key yet, use contract method "trasnfer" (performLockupContractSend)
        if (selectedAccountData.accountInfo.type == "lock.c" && !selectedAccountData.accountInfo.privateKey) {
            checkOwnerAccessThrows("send")
            performer = performLockupContractSend
        }

        //check amount
        if (maxAmountToSend <= 0) {
            d.showErr("Not enough balance to send")
        }
        else {
            d.byId("max-amount-send").innerText = c.toStringDec(maxAmountToSend)
            fullAccessSubPage("account-selected-send", performer)
        }
    } catch (ex) {
        d.showErr(ex.message)
    }
}

//----------------------
async function performLockupContractSend() {
    try {

        disableOKCancel();
        d.showWait()

        const info = selectedAccountData.accountInfo
        if (!info.ownerId) throw Error("unknown ownerId");

        const owner = getAccountRecord(info.ownerId)
        if (!owner.privateKey) throw Error("you need full access on " + info.ownerId);

        const toAccName = d.inputById("send-to-account-name").value.trim();
        if (!near.isValidAccountID(toAccName)) throw Error("Receiver Account Id is invalid");

        //const amountToStake = info.lastBalance - info.staked - 36
        const amountToSend = c.toNum(d.inputById("send-to-account-amount").value);
        if (!near.isValidAmount(amountToSend)) throw Error("Amount should be a positive integer");

        const lc = new LockupContract(info)
        await lc.transfer(info.ownerId,
            amountToSend,
            toAccName,
            owner.privateKey)

        d.showSuccess("Success: " + selectedAccountData.name + " transferred " + c.toStringDec(amountToSend) + "\u{24c3} to " + toAccName)

        internalReflectTransfer(selectedAccountData.name, toAccName, amountToSend)

        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }
}


//----------------------
function stakeClicked() {
    try {
        const info = selectedAccountData.accountInfo
        const stakeAmountBox = d.inputById("stake-amount")
        let performer = performStake //default
        let amountToStake
        if (info.unStaked>0) {
            amountToStake = info.unStaked
        }
        else {
            amountToStake = info.unStaked + info.lastBalance - 2
            if (info.type == "lock.c") amountToStake -= 34
        }

        if (info.type == "lock.c") {
            checkOwnerAccessThrows("stake")
            performer = performLockupContractStake
            stakeAmountBox.disabled = true
            stakeAmountBox.classList.add("bg-lightblue")
        }
        else {
            stakeAmountBox.disabled = false
            stakeAmountBox.classList.remove("bg-lightblue")
        }

        if (amountToStake < 0) amountToStake=0;

        fullAccessSubPage("account-selected-stake", performer)
        d.inputById("stake-with-staking-pool").value = selectedAccountData.accountInfo.stakingPool || ""
        d.byId("max-stake-amount").innerText = c.toStringDec(amountToStake)
        stakeAmountBox.value = c.toStringDec(amountToStake)

    } catch (ex) {
        d.showErr(ex.message)
    }


}

//----------------------
async function performStake() {
    //normal accounts
    disableOKCancel();
    d.showWait()
    try {

        const newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
        if (!near.isValidAccountID(newStakingPool)) throw Error("Staking pool Account Id is invalid");

        if (!selectedAccountData.accountInfo.privateKey) throw Error("you need full access on " + selectedAccountData.name);

        //const amountToStake = info.lastBalance - info.staked - 36
        const amountToStake = c.toNum(d.inputById("stake-amount").value);
        if (!near.isValidAmount(amountToStake)) throw Error("Amount should be a positive integer");
        if (amountToStake < 5) throw Error("Stake at least 5 Near");

        //refresh status
        refreshSelectedAccount()

        let actualSP = selectedAccountData.accountInfo.stakingPool

        let poolAccInfo = { //empty info
            account_id: '',
            unstaked_balance: '0',
            staked_balance: '0',
            can_withdraw: false
        };

        if (actualSP) { //there's a selected SP

            //ask the actual SP how much is staked
            poolAccInfo = await near.getStakingPoolAccInfo(selectedAccountData.name, actualSP)

            if (actualSP != newStakingPool) { //requesting a change of SP

                if (poolAccInfo.unstaked_balance != "0" || poolAccInfo.staked_balance != "0") {
                    const staked = c.yton(poolAccInfo.staked_balance)
                    const inThePool = c.yton(poolAccInfo.unstaked_balance) + staked
                    throw Error(`Already staking with ${actualSP}. Unstake & withdraw first. In the pool:${inThePool}, staked: ${c.toStringDec(staked)}`);
                    //----------------------
                }

                //if ZERO in the pool, unselect current staking pool
                actualSP = ""
                selectedAccountData.accountInfo.stakingPool = ""
            }
        }

        if (!actualSP) {
            //select the new staking pool
            selectedAccountData.accountInfo.stakingPool = newStakingPool
            poolAccInfo = await near.getStakingPoolAccInfo(selectedAccountData.name, newStakingPool)
        }

        if (poolAccInfo.unstaked_balance != "0" ) { //deposited but unstaked, stake
            //just re-stake (maybe the user asked unstaking but now regrets it)
            const amountToStakeY=fixUserAmountInY(amountToStake,poolAccInfo.unstaked_balance)
            if (amountToStakeY==poolAccInfo.unstaked_balance){
                await near.call_method(newStakingPool, "stake_all", {}, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                await near.call_method(newStakingPool, "stake", {amount:amountToStakeY}, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
            }
        }
        else { //no unstaked funds
            //deposit and stake
            await near.call_method(newStakingPool, "deposit_and_stake", {},
                selectedAccountData.name,
                selectedAccountData.accountInfo.privateKey,
                near.ONE_TGAS.muln(125),
                amountToStake
            )
        }

        global.saveSecureState()
        //refresh status
        refreshSelectedAccount()

        d.showSuccess("Success")
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }
}

//----------------------
async function performLockupContractStake() {
    try {

        disableOKCancel();
        d.showWait()

        const newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
        if (!near.isValidAccountID(newStakingPool)) throw Error("Staking pool Account Id is invalid");

        const info = selectedAccountData.accountInfo
        if (!info.ownerId) throw Error("unknown ownerId");

        const owner = getAccountRecord(info.ownerId)
        if (!owner.privateKey) throw Error("you need full access on " + info.ownerId);

        //const amountToStake = info.lastBalance - info.staked - 36
        const amountToStake = c.toNum(d.inputById("stake-amount").value);
        if (!near.isValidAmount(amountToStake)) throw Error("Amount should be a positive integer");
        if (amountToStake < 5) throw Error("Stake at least 5 NEAR");

        const lc = new LockupContract(info)
        await lc.stakeWith(info.ownerId,
            newStakingPool,
            amountToStake,
            owner.privateKey)

        global.saveSecureState()
        //refresh status
        refreshSelectedAccount()

        d.showSuccess("Success")
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }

}

//-------------------------------------
async function unstakeClicked() {
    try {
        d.showWait()
        const info = selectedAccountData.accountInfo
        let performer = performUnstake//default
        const amountBox = d.inputById("unstake-amount")
        const optionWU = d.qs("#option-unstake-withdraw")
        d.byId("unstake-from-staking-pool").innerText = ""
        optionWU.hide()
        if (info.type == "lock.c") {
            //lockup - allways full amount
            d.qs("#unstake-ALL-label").show()
            checkOwnerAccessThrows("unstake")
            performer = performLockupContractUnstake
            amountBox.disabled = true
            amountBox.classList.add("bg-lightblue")
        }
        else {
            //normal account can choose amounts
            d.qs("#unstake-ALL-label").hide()
            amountBox.disabled = false
            amountBox.classList.remove("bg-lightblue")
        }
        fullAccessSubPage("account-selected-unstake", performer)
        disableOKCancel()

        //---refresh first
        await refreshSelectedAccount()

        if (!selectedAccountData.accountInfo.stakingPool) {
            showButtons()
            throw Error("No staking pool associated whit this account. Stake first")
        }


        let amountForTheField;
        const amountToWithdraw = selectedAccountData.accountInfo.unStaked
        if (amountToWithdraw > 0) {
            d.inputById("radio-withdraw").checked = true
            amountForTheField = amountToWithdraw
        }
        else {
            d.inputById("radio-unstake").checked = true
            amountForTheField = selectedAccountData.accountInfo.staked
            if (amountForTheField == 0) throw Error("No funds on the pool")
        }
        if (info.type != "lock.c") optionWU.show()


        d.byId("unstake-from-staking-pool").innerText = info.stakingPool || ""
        d.inputById("unstake-amount").value = c.toStringDec(amountForTheField)
        enableOKCancel()

    } catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel()
    }

}

//-----------------------
function fixUserAmountInY(amount/*:number*/, yoctosMax/*:string*/) /*:string*/ {

    let yoctosResult = yoctosMax //default => all 
    if (amount + 1 < c.yton(yoctosResult)) {
        yoctosResult = near.ntoy(amount) //only if it's less of what's available, we take the input amount
    }
    else if (amount > 1+c.yton(yoctosMax)) { //only if it's +1 above max
        throw Error("Max amount is " + c.toStringDec(c.yton(yoctosMax)))
        //----------------
    }
    return yoctosResult
}

async function performUnstake() {
    //normal accounts
    try {
        disableOKCancel();
        d.showWait()

        const modeWithraw = (d.inputById("radio-withdraw").checked)
        const modeUnstake = !modeWithraw

        const amount = c.toNum(d.inputById("unstake-amount").value);
        if (!near.isValidAmount(amount)) throw Error("Amount is not valid");

        if (!selectedAccountData.accountInfo.privateKey) throw Error("you need full access on " + selectedAccountData.name);

        const actualSP = selectedAccountData.accountInfo.stakingPool
        if (!actualSP) throw Error("No staking pool selected in this account");

        //check if it's staked or just in the pool but unstaked
        const poolAccInfo = await near.getStakingPoolAccInfo(selectedAccountData.name, actualSP)

        if (modeWithraw) {

            if (poolAccInfo.unstaked_balance == "0") throw Error("No funds unstaked for withdraw")

            //if (!poolAccInfo.can_withdraw) throw Error("Funds are unstaked but you must wait (36-48hs) after unstaking to withdraw")

            //ok we've unstaked funds we can withdraw 
            let yoctosToWithdraw = fixUserAmountInY(amount, poolAccInfo.unstaked_balance) // round user amount
            if (yoctosToWithdraw==poolAccInfo.unstaked_balance){
                await near.call_method(actualSP, "withdraw_all", { }, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                await near.call_method(actualSP, "withdraw", { amount: yoctosToWithdraw }, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
            }
            d.showSuccess(c.toStringDec(c.yton(yoctosToWithdraw)) + " withdrew from the pool")
            //----------------
        }

        else { //mode unstake
        //here we've staked balance in the pool, call unstake

            if (poolAccInfo.staked_balance == "0") throw Error("No funds staked to unstake")

            let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance) // round user amount
            if (yoctosToUnstake==poolAccInfo.staked_balance){
                await near.call_method(actualSP, "unstake_all", {}, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                await near.call_method(actualSP, "unstake", { amount: yoctosToUnstake }, selectedAccountData.name, selectedAccountData.accountInfo.privateKey, near.ONE_TGAS.muln(125))
            }
            d.showSuccess("Unstake requested, you must wait (36-48hs) for withdrawal")
    }

    //refresh status
    refreshSelectedAccount()
    global.saveSecureState()

    showButtons()

}
    catch (ex) {
    d.showErr(ex.message)
}
finally {
    d.hideWait()
    enableOKCancel();
}
}

async function performLockupContractUnstake() {
    try {

        disableOKCancel();
        d.showWait()

        const info = selectedAccountData.accountInfo
        if (!info.ownerId) throw Error("unknown ownerId");

        const owner = getAccountRecord(info.ownerId)
        if (!owner.privateKey) throw Error("you need full access on " + info.ownerId);

        const lc = new LockupContract(info)

        const message = await lc.unstakeAndWithdrawAll(info.ownerId, owner.privateKey)
        d.showSuccess(message)

        //refresh status
        refreshSelectedAccount()

        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }

}


function internalReflectTransfer(sender /*:string*/, receiver /*:string*/, amountNear /*:number*/) {
    let updated = false
    //the sender should be the selected account
    if (sender == selectedAccountData.name) {
        selectedAccountData.accountInfo.lastBalance -= amountNear
        selectedAccountData.available -= amountNear
        showAccountData(sender)
        updated = true;
    }
    //check if receiver is also in this wallet
    const receiverAccInfo = getAccountRecord(receiver)
    if (receiverAccInfo) { //receiver is also in the wallet
        receiverAccInfo.lastBalance += amountNear
        updated = true;
    }
    if (updated) global.saveSecureState();
}

async function performSend() {
    try {
        if (!selectedAccountData.accountInfo.privateKey) throw Error("Account is read-only")
        const toAccName = new d.El("#send-to-account-name").value
        const amountElem = new d.El("#send-to-account-amount")
        const amountToSend = c.toNum(amountElem.value)
        if (!near.isValidAccountID(toAccName)) throw Error("Receiver Account Id is invalid");
        if (!near.isValidAmount(amountToSend)) throw Error("Amount should be a positive integer");

        disableOKCancel()
        d.showWait()

        await near.send(selectedAccountData.name, toAccName, amountToSend, selectedAccountData.accountInfo.privateKey)

        amountElem.value = ""
        showButtons()

        //TODO transaction history per network
        //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
        //global.state.transactions[Network.current].push(transactionInfo)

        d.showSuccess("Success: " + selectedAccountData.name + " transferred " + c.toStringDec(amountToSend) + "\u{24c3} to " + toAccName)

        internalReflectTransfer(selectedAccountData.name, toAccName, amountToSend)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel()
    }

}


function exploreButtonClicked() {
    chrome.windows.create({
        url: Network.currentInfo().explorerUrl + "accounts/" + selectedAccountData.name,
        state: "maximized"
    });
}

//---------------------------------------------
/*+
type PoolInfo = {
      name:string;
      slashed: string;
      stake: string;
      stakeY: string;
      uptime: number;
      fee?: number;
}
+*/
//---------------------------------------------
export async function searchThePools(exAccData/*:ExtendedAccountData*/) {

    const doingDiv = d.showMsg("Searching Pools...", "info", -1)
    d.showWait()
    try {

        let checked/*:Record<string,boolean>*/ = {}
        let lastAmountFound = 0

        const validators = await near.getValidators()
        const allOfThem = validators.current_validators.concat(validators.next_validators, validators.prev_epoch_kickout, validators.current_proposals)


        for (let pool of allOfThem) {
            if (!checked[pool.account_id]) {
                doingDiv.innerText = "Pool " + pool.account_id;
                let isStakingPool = true
                let poolAccInfo;
                try {
                    poolAccInfo = await near.getStakingPoolAccInfo(exAccData.name, pool.account_id)
                } catch (ex) {
                    if (ex.message.indexOf("cannot find contract code for account") != -1) {
                        //validator is not a staking pool - ignore
                        isStakingPool = false
                    }
                    else throw (ex)
                }
                checked[pool.account_id] = true
                if (isStakingPool && poolAccInfo) {
                    const amount = c.yton(poolAccInfo.unstaked_balance) + c.yton(poolAccInfo.staked_balance)
                    if (amount > 0) {
                        d.showSuccess(`Found! ${c.toStringDec(amount)} on ${pool.account_id}`)
                        if (amount > lastAmountFound) { //save only one
                            exAccData.accountInfo.stakingPool = pool.account_id;
                            exAccData.accountInfo.staked = near.yton(poolAccInfo.staked_balance)
                            exAccData.accountInfo.unStaked = near.yton(poolAccInfo.unstaked_balance)
                            exAccData.inThePool = exAccData.accountInfo.staked + exAccData.accountInfo.unStaked
                            exAccData.accountInfo.stakingPoolPct = await near.getStakingPoolFee(pool.account_id)
                            global.saveSecureState()
                            lastAmountFound = amount
                        }
                    }
                }
            }
        }
        if (lastAmountFound > 0) {
            refreshSelectedAccount()
        }
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        doingDiv.remove()
        d.hideWait()
    }

}

async function searchPoolsButtonClicked() {
    searchThePools(selectedAccountData)
}

//---------------------------------------
function showPublicKeyClicked() {
    d.hideErr()

    if (!selectedAccountData.accountInfo.privateKey) {
        d.showErr("Account is read only")
        d.showSubPage("account-selected-make-full-access")
        showOKCancel(makeFullAccessOKClicked)
    }
    else { //normal acc priv key
        d.showSubPage("account-selected-show-public-key")
        d.byId("account-selected-public-key").innerText = near.getPublicKey(selectedAccountData.accountInfo.privateKey)
        showOKCancel(showButtons)
    }
}

//---------------------------------------
function accessLabelClicked() {
    if (selectedAccountData.accountInfo.type == "lock.c") {
        showGotoOwner()
    }
}

//---------------------------------------
function accessStatusClicked() {
    d.hideErr()
    seedTextElem.value = ""

    if (selectedAccountData.accountInfo.privateKey) {
        d.showSubPage("account-selected-make-read-only")
        d.inputById("account-name-confirm").value = ""
        showOKCancel(makeReadOnlyOKClicked)
    }
    else { //no priv key yet
        d.showSubPage("account-selected-make-full-access")
        showOKCancel(makeFullAccessOKClicked)
    }
}

//---------------------------------------
function LockupAddPublicKey() {
    if (selectedAccountData.accountInfo.type != "lock.c") {
        d.showErr("Not a lockup contract account")
        return
    }

    d.hideErr()
    //d.inputById("add-public-key").value = ""
    d.showSubPage("account-selected-add-public-key")
    showOKCancel(AddPublicKeyToLockupOKClicked)
}

//---------------------------------------
function addNoteClicked() {
    d.hideErr()
    d.inputById("add-note").value = selectedAccountData.accountInfo.note || ""
    d.showSubPage("account-selected-add-note")
    showOKCancel(addNoteOKClicked)
}
function addNoteOKClicked() {
    d.hideErr()
    selectedAccountData.accountInfo.note = d.inputById("add-note").value.trim()
    global.saveSecureState()
    showAccountData(selectedAccountData.name)
    showButtons()
}

//---------------------------------------
async function DeleteAccount() {
    d.showWait()
    d.hideErr()
    try {

        if (!selectedAccountData.accountInfo.privateKey) throw Error("Account is Read-Only")

        await refreshSelectedAccount() //refresh account to have updated balance

        d.showSubPage("account-selected-delete")
        d.inputById("send-balance-to-account-name").value = selectedAccountData.accountInfo.ownerId || ""

        showOKCancel(AccountDeleteOKClicked)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}

//-----------------------------------
async function AccountDeleteOKClicked() {
    if (!selectedAccountData || !selectedAccountData.accountInfo) return;
    try {

        d.showWait()

        const privateKey = selectedAccountData.accountInfo.privateKey;
        if (!privateKey) throw Error("Account is Read-Only")

        const toDeleteAccName = d.inputById("delete-account-name-confirm").value
        if (toDeleteAccName != selectedAccountData.name) throw Error("The account name to delete don't match")

        const beneficiary = d.inputById("send-balance-to-account-name").value
        if (!beneficiary) throw Error("Enter the beneficiary account")

        const result = await near.delete_account(toDeleteAccName, privateKey, beneficiary)

        d.showSuccess("Account Deleted")

        internalReflectTransfer(selectedAccountData.name, beneficiary, selectedAccountData.accountInfo.lastBalance)

        showButtons()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}

//-----------------------------------
async function AddPublicKeyToLockupOKClicked() {
    if (!selectedAccountData || !selectedAccountData.accountInfo) return;
    try {
        d.showWait()
        //const newPubKey = d.inputById("add-public-key").value
        //if (!newPubKey) throw Error("Enter the public key to add")
        const owner = selectedAccountData.accountInfo.ownerId;
        if (!owner) throw Error("Lockup account owner unknown")
        const ownerAcc = getAccountRecord(owner)
        const privateKey = ownerAcc.privateKey;
        if (!privateKey) throw Error("Owner Account is Read-Only")

        try {
            const pingTransfer = await near.call_method(selectedAccountData.name, "check_transfers_vote", {}, owner, privateKey, near.ONE_TGAS.muln(75))
        } catch (ex) {
            if (ex.message.indexOf("Transfers are already enabled") != -1) {
                //ok, Transfers are enabled 
            }
            else throw ex;
        }

        const newPubKey = near.getPublicKey(privateKey)
        const result = await near.call_method(selectedAccountData.name, "add_full_access_key", { new_public_key: newPubKey }, owner, privateKey, near.ONE_TGAS.muln(50))

        d.showSuccess("Public Key added")

        //check if that's a known-key 
        for (let accName in global.SecureState.accounts[Network.current]) {
            if (accName != selectedAccountData.name) {
                const accInfo = getAccountRecord(accName)
                if (accInfo.privateKey) {
                    const thePubKey = near.getPublicKey(accInfo.privateKey)
                    if (thePubKey == newPubKey) {
                        selectedAccountData.accountInfo.privateKey = accInfo.privateKey
                        global.saveSecureState()
                        d.showSuccess("Full access added from " + accName)
                    }
                }
            }
        }
        global.saveSecureState()
        showButtons()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}

//-----------------------------------
function makeReadOnlyOKClicked() {
    const confirmAccName = d.inputById("account-name-confirm").value
    if (confirmAccName != selectedAccountData.name) {
        d.showErr("Names don't match")
    }
    else {
        selectedAccountData.accountInfo.privateKey = undefined
        global.saveSecureState()
        selectedAccountData.accessStatus = "Read Only"
        d.showMsg("Account access removed", "success")
        showAccountData(selectedAccountData.name)
        showButtons()
    }
}

//----------------------------------
async function makeFullAccessOKClicked() {

    const words = seedTextElem.value

    let err = seedPhraseUtil.check(words)
    if (err) {
        d.showErr(err)
        return;
    }

    disableOKCancel()
    d.showWait()
    try {
        let { seedPhrase, secretKey, publicKey } = seedPhraseUtil.parseSeedPhrase(words)
        let keyFound = await near.access_key(selectedAccountData.name, publicKey)
        if (keyFound.error) {
            let err = keyFound.error
            if (err.indexOf("does not exists") != 0) err = "Seed phrase was incorrect or is not the seed phrase for this account key"
            d.showErr(err)
        }
        else {
            //if key found correctly
            selectedAccountData.accountInfo.privateKey = secretKey
            seedTextElem.value = ""
            global.saveSecureState()
            d.showMsg("Seed Phrase is correct. Access granted", "success")
            showAccountData(selectedAccountData.name)
            showButtons()
        }
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel()
    }
}



function confirmClicked(ev/*:Event*/) {
    try {
        if (confirmFunction) confirmFunction(ev);
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
    }
}

function showButtons() {
    d.showSubPage("account-selected-buttons")
    okCancelRow.hide()
    if (showingMore()) moreLessClicked()
}

function cancelClicked() {
    showButtons()
    okCancelRow.hide()
}


function removeAccountClicked(ev /*:Event*/) {
    try{
        ev.preventDefault();

        if (selectedAccountData.accountInfo.privateKey){
            //has full access - remove access first
            accessStatusClicked()
            return;
        }

        //remove
        delete global.SecureState.accounts[Network.current][selectedAccountData.name];
        //persist
        global.saveSecureState()
        //return to main page
        Pages.showMain()
    }
    catch(ex){
        d.showErr(ex.message)
    }
}

async function refreshSelectedAccount() {
    await nearAccounts.asyncRefreshAccountInfo(selectedAccountData.name, selectedAccountData.accountInfo)
    global.saveAccount(selectedAccountData.name, selectedAccountData.accountInfo);
    showAccountData(selectedAccountData.name);
}

async function refreshClicked(ev /*:Event*/) {

    d.showWait()
    try {
        await refreshSelectedAccount()
        d.showSuccess("Account data refreshed")
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}
