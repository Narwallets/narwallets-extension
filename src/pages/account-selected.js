import * as c from "../util/conversions.js"
import * as d from "../util/document.js"
import * as global from "../data/global.js"
import * as Network from "../data/Network.js"
import * as nearAccounts from "../util/near-accounts.js"
import * as Pages from "../pages/main.js"

import * as near from "../api/near-rpc.js"
import * as seedPhraseUtil from "../api/utils/seed-phrase.js"
import { PublicKey } from "../api/utils/key-pair.js"
import { setRpcUrl } from "../api/utils/json-rpc.js"
import { LockupContract } from "../contracts/LockupContract.js"

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

    d.onClickId("send", () => fullAccessSubPage("account-selected-send", performSend));
    d.onClickId("stake", () => fullAccessSubPage("account-selected-stake", performLockupContractStake));
    d.onClickId("unstake", () => fullAccessSubPage("account-selected-unstake", performUnstake));
    d.onClickId("list-pools", listPoolsClicked);

    removeButton.onClick(removeClicked);
    refreshButton.onClick(refreshClicked);

    confirmBtn.onClick(confirmClicked);
    cancelBtn.onClick(cancelClicked);

    showButtons(); //2nd or third entry - always show the buttons
}

function getAccountRecord(accName/*:string*/)/*:global.AccountInfo*/ {
    return global.SecureState.accounts[Network.current][accName];
}

class ExtendedAccountData {

    name /*:string*/
    accessStatus /*:string*/
    typeFull /*:string*/
    accountInfo /*:global.AccountInfo*/
    available /*:number*/

    constructor(name/*:string*/) {
        this.name = name;
        this.accountInfo = getAccountRecord(name);
        if (!this.accountInfo) throw new Error("Account is not in this wallet: " + name)
        const typeFullTranslation/*:Record<string,string>*/ = {
            acc: "Account",
            "lock.c": "Lockup Contract"
        }
        this.typeFull = typeFullTranslation[this.accountInfo.type]
        this.accessStatus = this.accountInfo.privateKey ? "Full Access" : "Read Only"
        if (this.accountInfo.type == "lock.c" && !this.accountInfo.privateKey) {
            if (this.accountInfo.ownerId && getAccountRecord(this.accountInfo.ownerId)) {
                this.accessStatus = "Owned"
            }
        }

        if (!this.accountInfo.staked) this.accountInfo.staked = 0
        this.available = this.accountInfo.lastBalance - this.accountInfo.staked
    }

}

function showAccountData(accName/*:string*/) {

    selectedAccountData = new ExtendedAccountData(accName)

    const SELECTED_ACCOUNT = "selected-account"
    d.clearContainer(SELECTED_ACCOUNT)
    d.appendTemplateLI(SELECTED_ACCOUNT, "selected-account-template", selectedAccountData)

    accountInfoName = new d.El(".selected-account-info .name");
    accountBalance = new d.El(".selected-account-info .total.balance");

    if (selectedAccountData.accountInfo.ownerId) {
        const oiLine = new d.El(".selected-account-info #owner-id-info-line");
        oiLine.show()
    }
    if (selectedAccountData.accountInfo.stakingPool) {
        const spLine = new d.El(".selected-account-info #staking-pool-info-line");
        spLine.show()
    }

    d.onClickSelector(".selected-account-info .access-status", accessStatusClicked)
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
        url: chrome.runtime.getURL("outside/list-pools.html")
    });
}


let confirmFunction/*:d.ClickHandler*/ = function () { }

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
    throw Error("Account access is Read-Only. You can't perform this action")
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

async function performLockupContractStake() {
    try {

        const newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
        if (!near.isValidAccountID(newStakingPool)) throw Error("Staking pool Account Id is invalid");

        const lc = new LockupContract(selectedAccountData.name)

        const info = selectedAccountData.accountInfo
        if (!info.ownerId) throw Error("unknown ownerId");

        const owner=getAccountRecord(info.ownerId)
        if (!owner.privateKey) throw Error("you need full access on "+owner.privateKey);
        
        const amountToStake = info.lastBalance - info.staked - 5
        if (amountToStake<5) throw Error("Not enough available balance to stake. Balance-Staked="+c.toStringDec(info.lastBalance - info.staked));
        //c.toNum(d.inputById("stake-amount").value);
        //if (!near.isValidAmount(amountToStake)) throw Error("Amount should be a positive integer");

        disableOKCancel();
        d.showWait()
        await lc.stakeWith(info.ownerId, 
                    newStakingPool, 
                    amountToStake, 
                    owner.privateKey)

        info.stakingPool = newStakingPool
        info.staked = amountToStake
        global.saveSecureState()
        showAccountData(selectedAccountData.name)

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

function performUnstake() {
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
    const receiverData = getAccountRecord(receiver)
    if (receiverData) { //receiver is also in the wallet
        receiverData.lastBalance += amountNear
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

async function makeFullAccessOKClicked() {

    const words = seedTextElem.value

    let err = seedPhraseUtil.check(words)
    if (err) {
        d.showErr(err)
        return;
    }

    let { seedPhrase, secretKey, publicKey } = seedPhraseUtil.parseSeedPhrase(words)
    d.showWait()
    try {
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
}

function cancelClicked() {
    showButtons()
    okCancelRow.hide()
}


function removeClicked(ev /*:Event*/) {

    ev.preventDefault();

    const accName = accountInfoName.innerText;
    const network = Network.current
    if (!global.SecureState.accounts[network][accName]) {
        return d.showErr("The account is not in the wallet")
    }
    //remove
    delete global.SecureState.accounts[network][accName];
    //persist
    global.saveSecureState()
    //return to main page
    Pages.showMain()
}

async function refreshClicked(ev /*:Event*/) {

    const accName = accountInfoName.innerText;

    d.showWait()
    try {

        let searchAccountResult = await nearAccounts.searchAccount(accName)

        if (searchAccountResult.error || searchAccountResult.accountInfo == undefined) {
            d.showErr(searchAccountResult.error);
            return;
        }

        nearAccounts.saveFoundAccounts(searchAccountResult);

        showAccountData(searchAccountResult.accName);

        d.hideWait()
        d.showSuccess("Account data refreshed")

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}
