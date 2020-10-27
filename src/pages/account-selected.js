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

/*+
import type { AnyElement } from "../util/document.js"
+*/

const THIS_PAGE = "account-selected";

let selectedAccountData/*:ExtendedAccountData*/

let accountInfoName /*:d.El*/;
let accountBalance /*:d.El*/;
let sendButton /*:d.El*/;
let removeButton /*:d.El*/;
let refreshButton /*:d.El*/;

let seedTextElem /*:d.El*/;

export function show(accName/*:string*/) {
    initPage();
    showAccountData(accName);
    d.showPage(THIS_PAGE)
}

// page init
let confirmBtn/*:d.El*/
let cancelBtn/*:d.El*/

function initPage() {

    //accountAmount.onInput(amountInput);

    sendButton = new d.El("button#send");
    removeButton = new d.El("button#remove");
    refreshButton = new d.El("button#refresh");

    confirmBtn = new d.El("#account-selected-action-confirm")
    cancelBtn = new d.El("#account-selected-action-cancel")


    seedTextElem = new d.El("#seed-phrase")

    const backLink = new d.El("#account-selected.page .back-link");
    backLink.onClick(Pages.showMain);

    sendButton.onClick(sendClicked);
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
        if (this.accountInfo.type=="lock.c" && !this.accountInfo.privateKey){
            if (this.accountInfo.ownerId && getAccountRecord(this.accountInfo.ownerId)){
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

    if (selectedAccountData.accountInfo.ownerId){
        const oiLine=new d.El(".selected-account-info #owner-id-info-line");
        oiLine.show()
    }
    if (selectedAccountData.accountInfo.stakingPool){
        const spLine=new d.El(".selected-account-info #staking-pool-info-line");
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

let confirmFunction/*:d.ClickHandler*/ = function () { }

function showOKCancel(OKHandler/*:d.ClickHandler*/) {
    confirmFunction = OKHandler
    confirmBtn.show()
    cancelBtn.show()
    enableOKCancel()
}
function disableOKCancel() {
    confirmBtn.disabled=true
    cancelBtn.disabled=true
}
function enableOKCancel() {
    confirmBtn.disabled=false
    cancelBtn.disabled=false
}

function checkAccountIsFullAccess() {
    if (selectedAccountData.accountInfo.privateKey) return true;
    throw Error("Account access is Read-Only. You can't perform this action")
}

function sendClicked(ev /*:Event*/) {
    try {
        d.hideErr()
        checkAccountIsFullAccess()
        d.showSubPage("account-selected-send")
        showOKCancel(performSend)
    }
    catch (ex) {
        d.showErr(ex.message)
    }
}

function internalReflectTransfer(sender /*:string*/, receiver /*:string*/, amountNear /*:number*/) {
    let updated=false
    //the sender should be the selected account
    if(sender==selectedAccountData.name){
        selectedAccountData.accountInfo.lastBalance-=amountNear
        selectedAccountData.available-=amountNear
        showAccountData(sender)
        updated=true;
    }
    //check if receiver is also in this wallet
    const receiverData = getAccountRecord(receiver)
    if (receiverData) { //receiver is also in the wallet
        receiverData.lastBalance-=amountNear
        updated=true;
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

        amountElem.value=""
        showButtons()
        
        //TODO transaction history per network
        //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
        //global.state.transactions[Network.current].push(transactionInfo)

        d.showSuccess("Success: "+selectedAccountData.name+" transferred "+c.toStringDec(amountToSend)+"\u{24c3} to "+toAccName)

        internalReflectTransfer(selectedAccountData.name, toAccName, amountToSend)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        //d.hideWait()
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
    confirmBtn.hide()
    cancelBtn.hide()
}

function cancelClicked() {
    showButtons()
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
