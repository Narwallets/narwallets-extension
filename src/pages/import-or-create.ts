import * as d from "../util/document.js"
import { askBackgroundGetNetworkInfo, askBackgroundSetAccount } from "../api/askBackground.js";
import { KeyPairEd25519 } from "../api/utils/key-pair.js";
import { base_encode, base_decode } from '../api/utils/serialize.js';
import { show as AccountPage_show, showPrivateKeyClicked } from "./account-selected.js";
import { bufferToHex } from "../api/near-rpc.js";
import { Account } from "../api/account.js";

import { generateSeedPhraseAsync } from "../api/utils/seed-phrase.js";
import type { SeedPhraseResult } from "../api/utils/seed-phrase.js";
import { backToAccountsList } from "./main.js";


const IMPORT_ACCOUNT = "import-account"

async function createAccountClicked(ev :Event) {
  const netInfo = await askBackgroundGetNetworkInfo()
  chrome.windows.create({
    url: netInfo.NearWebWalletUrl + "create",
    state: "maximized"
  });
}

function importAccountClicked(ev :Event) {
  d.showPage(IMPORT_ACCOUNT)
}

let seedResult:SeedPhraseResult;
let seedWordAskIndex:number;

async function createImplicitAccountClicked(ev :Event) {
  try {
    seedResult = await generateSeedPhraseAsync();
    createImplicitAccount_Step1();
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

async function createImplicitAccount_Step1() {
  try {
    d.showPage("display-seed-phrase");
    d.byId("seed-phrase-show-box").innerText = seedResult.seedPhrase.join(" ");
    d.onClickId("seed-phrase-continue",createImplicitAccount_Step2);
    d.onClickId("seed-phrase-cancel",backToAccountsList);
    //showOKCancel(createImplicitAccount_Step2, );

    // d.showSubPage("account-selected-show-private-key")
    // d.byId("account-selected-private-key").innerText = selectedAccountData.accountInfo.privateKey||""
    // showOKCancel(showButtons)
    // cancelBtn.hidden = true

    // const newKeyPair = KeyPairEd25519.fromString(seedResult.secretKey);
    // const accountId = bufferToHex(newKeyPair.getPublicKey().data)
    // const accInfo = new Account()
    // accInfo.privateKey= base_encode(newKeyPair.getSecretKey())
    // await askBackgroundSetAccount(accountId,accInfo)
    // await AccountPage_show(accountId);
    // d.showSuccess("Account "+accountId+" created")
    // showPrivateKeyClicked()
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

async function createImplicitAccount_Step2() {
  try {
    d.showPage("seed-phrase-step-2");
    seedWordAskIndex = Math.trunc(Math.random()*12);
    d.byId("seed-phrase-word-number").innerText = `${seedWordAskIndex+1}`;
    d.onClickId("seed-word-continue",createImplicitAccount_Step3);
    d.onClickId("seed-word-cancel",createImplicitAccount_Step1);
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

async function createImplicitAccount_Step3() {
  try {
    const entered = d.inputById("seed-word").value.toLowerCase().trim();
    const findIt = seedResult.seedPhrase.indexOf(entered);
    if (findIt!=seedWordAskIndex) throw Error("Incorrect Word");
    
    //success!!!
    d.hideErr() 
    const newKeyPair = KeyPairEd25519.fromString(seedResult.secretKey);
    const accountId = bufferToHex(newKeyPair.getPublicKey().data)
    const accInfo = new Account()
    accInfo.privateKey= base_encode(newKeyPair.getSecretKey())
    await askBackgroundSetAccount(accountId,accInfo)
    await AccountPage_show(accountId);
    d.showSuccess("Account "+accountId+" created")

  }
  catch (ex) {
    d.showErr(ex.message)
  }
}


// on document load
export function addListeners() {


  d.onClickId("option-import", importAccountClicked);
  d.onClickId("option-create", createAccountClicked);
  d.onClickId("option-create-implicit", createImplicitAccountClicked);

}
