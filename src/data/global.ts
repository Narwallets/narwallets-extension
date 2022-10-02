import * as secret from "../lib/naclfast-secret-box/nacl-fast.js";
import { sha256Async } from "../lib/crypto-lite/crypto-primitives-browser.js";
import * as Network from "../lib/near-api-lite/network.js";
import {
  localStorageRemove,
  recoverFromLocalStorage,
  localStorageSave,
  localStorageSet,
  localStorageGet,
} from "./util.js";
//import { showErr } from "../util/document.js";
import { Account } from "./account.js"; //required for SecureState declaration
//import { askBackground, askBackgroundViewMethod } from "../background/askBackground.js";
import { log } from "../lib/log.js";

import * as clite from "../lib/crypto-lite/crypto-primitives-browser.js";
import {
  encodeBase64,
  decodeBase64,
  stringFromUint8Array,
  Uint8ArrayFromString,
} from "../lib/crypto-lite/encode.js";

const DATA_VERSION = "0.1";

const INVALID_USER_OR_PASS = "Invalid Password";

import type { NetworkInfo } from "../lib/near-api-lite/network.js";
import type { StateStruct } from "./state-type.js";
import { isValidEmail } from "../lib/near-api-lite/utils/valid.js";
import { GContact } from "./contact.js";
//import { activeNetworkInfo } from "../index.js";
import { yton } from "../util/conversions.js";

//---- GLOBAL STATE ----

export const EmptyState: StateStruct = {
  dataVersion: DATA_VERSION,
  usersList: [],
  currentUser: "",
};

export var State = Object.assign({}, EmptyState);

//export var workingData = { unlockSHA: "" };

type NetworkNameType = string;
type AccountIdType = string;

//data that's stored *encrypted* in local storage
// for each-user
type NarwalletSecureData = {
  dataVersion: string;
  hashedPass?: string;
  autoUnlockSeconds: number;
  advancedMode: boolean;
  accounts: Record<NetworkNameType, Record<AccountIdType, Account>>;
  contacts: Record<NetworkNameType, Record<AccountIdType, GContact>>;
};

// SecureState.accounts => { network { accountId { ...info

const EmptySecureState: NarwalletSecureData = {
  dataVersion: DATA_VERSION,
  hashedPass: undefined,
  autoUnlockSeconds: 1800,
  advancedMode: false,
  accounts: {},
  contacts: {},
};

export var SecureState: NarwalletSecureData = Object.assign(
  {},
  EmptySecureState
);

export function clearState() {
  State = Object.assign({}, EmptyState);
}

export function saveState() {
  localStorageSave("State", "S", State);
}

type callbackERR = (err: string) => void;

export async function recoverState(): Promise<void> {
  State = await recoverFromLocalStorage("State", "S", EmptyState);
  //console.log("Recover state", State)
}

export async function sha256PwdBase64Async(password: string): Promise<string> {
  const hash = await clite.sha256Async(Uint8ArrayFromString(password));
  return encodeBase64(new Uint8Array(hash));
}


export function saveUnlockSHA(unlockSHA:string) {
  localStorageSet({ _us: unlockSHA });
}
export async function getUnlockSHA() {
  return localStorageGet("_us")
}
export function clearUnlockSHA() {
  localStorageRemove("_us");
}

export function isLocked() {
  //DEBUG
  // if (!SecureState) log("isLocked()? yes, !SecureState");
  // else if (!SecureState.hashedPass)
  //   log("isLocked()? yes, !SecureState.hashedPass");
  return !SecureState || !SecureState.hashedPass;
}
export function lock(source: string) {
  clearUnlockSHA()
  // clear SecureState && SecureState.hashedPass
  SecureState = Object.assign({}, EmptySecureState);
  log("LOCKED from:" + source);
  log("LOCKED call stack:" + JSON.stringify(new Error().stack));
}

export async function changePasswordAsync(
  email: string,
  password: string
): Promise<void> {
  if (!password || password.length < 8) {
    throw Error("password must be at least 8 characters long");
  }

  State.currentUser = email;
  SecureState.hashedPass = await sha256PwdBase64Async(password);
  saveSecureState();

  lock("changePasswordAsync"); //log out current user
}

export async function createUserAsync(
  email: string,
  password: string
): Promise<void> {
  if (!isValidEmail(email)) {
    throw Error("Invalid email");
  } else if (State.usersList.includes(email)) {
    throw Error("User already exists");
  } else if (!password || password.length < 8) {
    throw Error("password must be at least 8 characters long");
  }
  lock("createUserAsync"); //log out current user

  State.currentUser = email;
  await createSecureStateAsync(password);
  //save new user in usersList
  State.usersList.push(email);
  saveState();
}

export async function createSecureStateAsync(password: string) {
  SecureState.hashedPass = await sha256PwdBase64Async(password);
  SecureState.accounts = {};
  saveSecureState();
  saveUnlockSHA(SecureState.hashedPass)
}

export function saveSecureState() {
  if (!SecureState.hashedPass) {
    throw new Error("Invalid/locked SecureState");
  }

  const keyPair = secret.sign_keyPair_fromSeed(
    decodeBase64(SecureState.hashedPass)
  );
  const keyUint8Array = keyPair.publicKey;

  const nonce = secret.randomBytes(secret.secretbox_nonceLength);
  const messageUint8 = Uint8ArrayFromString(JSON.stringify(SecureState));
  const box = secret.secretbox(messageUint8, nonce, keyUint8Array);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  const base64FullMessage = encodeBase64(fullMessage);

  //localStorage.setItem("SS", base64FullMessage)
  localStorageSave("Secure State", State.currentUser, base64FullMessage);
}

export function setCurrentUser(user: string) {
  if (State.currentUser != user) {
    //remember last user
    try {
      State.currentUser = user;
      saveState();
    } catch { }
  }
}

function decryptIntoJson(
  hashedPassBase64: string,
  encryptedMsg: string
): NarwalletSecureData {
  if (!encryptedMsg) throw new Error("encryptedState is empty");

  const keyPair = secret.sign_keyPair_fromSeed(decodeBase64(hashedPassBase64));
  const keyUint8Array = keyPair.publicKey;

  const messageWithNonceAsUint8Array = decodeBase64(encryptedMsg);
  const nonce = messageWithNonceAsUint8Array.slice(
    0,
    secret.secretbox_nonceLength
  );
  const message = messageWithNonceAsUint8Array.slice(
    secret.secretbox_nonceLength,
    encryptedMsg.length
  );

  const decrypted = secret.secretbox_open(message, nonce, keyUint8Array);

  if (decrypted == null || !decrypted) throw Error(INVALID_USER_OR_PASS);

  const decryptedAsString = stringFromUint8Array(decrypted as Uint8Array);
  return JSON.parse(decryptedAsString);
}

export async function unlockSecureStateAsync(
  email: string,
  password: string
): Promise<void> {
  const hash = await sha256PwdBase64Async(password);
  return unlockSecureStateSHA(email, hash);
}

//recover with PASSWORD_HASH or throws
export async function unlockSecureStateSHA(
  email: string,
  hashedPassBase64: string
): Promise<void> {
  //const encryptedState = localStorage.getItem("SS")
  if (!email) throw new Error("email is null");
  const encryptedState = await localStorageGet(email);
  if (!encryptedState) throw Error(INVALID_USER_OR_PASS);
  const decrypted = decryptIntoJson(hashedPassBase64, encryptedState);
  SecureState = decrypted;
  saveUnlockSHA(hashedPassBase64)
  setCurrentUser(email); // set & save State.currentUser
}

//------------------
// get existing account on Network.current or throw
export function getAccount(accName: string): Account {
  log("getAccount", accName);
  if (isLocked()) throw Error(`Narwallets: Wallet is locked`);
  const network = Network.current;
  if (!network)
    throw Error(`Narwallets: No network selected. Unlock the wallet`);
  const accounts = SecureState.accounts[network];
  if (!accounts)
    throw Error(`Narwallets: No info on ${network}. Unlock the wallet`);
  const accInfo = accounts[accName];
  if (!accInfo)
    throw Error(
      `Narwallets: account ${accName} NOT FOUND on wallet. Network:${network}`
    );
  return accInfo;
}
//------------------
export function saveAccount(accName: string, accountInfo: Account) {
  if (!accName || !accountInfo || !accountInfo.network) {
    log("saveAccount called but no data");
    return;
  }

  let accountsForCurrentNetwork = SecureState.accounts[accountInfo.network];
  if (accountsForCurrentNetwork == undefined) {
    //no accounts yet
    accountsForCurrentNetwork = {}; //create empty object
    SecureState.accounts[accountInfo.network] = accountsForCurrentNetwork;
  }

  accountsForCurrentNetwork[accName] = accountInfo;

  saveSecureState();
}

export function getNetworkAccountsCount() {
  const accounts = SecureState.accounts[Network.current];
  if (!accounts) return 0;
  return Object.keys(accounts).length;
}

export function getAutoUnlockSeconds() {
  let aul = SecureState.autoUnlockSeconds;
  if (aul == undefined) aul = 30;
  return aul;
}

//--LightColor page

type BackgroundPage = {
  backgroundFunction(msg: string): void;
};

export let nearDollarPrice: number = 0;
export async function calculateDollarValue() {
  try {
    let result = await fetch("https://api.diadata.org/v1/quotation/NEAR");
    let response = await result.json();
    nearDollarPrice = response.Price;

    document.querySelector("#usd-price-link")?.dispatchEvent(
      new CustomEvent("usdPriceReady", {
        detail: "Dollar price",
      })
    );
  } catch (ex) {
    console.log(ex);
  }
}

export type NarwalletsMetrics = {
  env_epoch_height: number;
  prev_epoch_duration_ms: number;
  contract_account_balance: number;
  total_available: number; total_for_staking: number;
  tvl: number;
  total_actually_staked: number;
  epoch_stake_orders: number;
  epoch_unstake_orders: number;
  total_unstake_claims: number;
  total_stake_shares: number;
  total_unstaked_and_waiting: number;
  reserve_for_unstake_claims: number;
  total_meta: number;
  st_near_price: number;
  st_near_price_usd: number;
  st_near_30_day_apy: number;
  nslp_liquidity: number;
  nslp_stnear_balance: number;
  nslp_target: number;
  nslp_share_price: number;
  nslp_total_shares: number;
  lp_3_day_apy: number;
  lp_7_day_apy: number;
  lp_15_day_apy: number;
  lp_30_day_apy: number;
  nslp_current_discount: number;
  nslp_min_discount: number;
  nslp_max_discount: number;
  accounts_count: number;
  staking_pools_count: number;
  staked_pools_count: number;
  min_deposit_amount: number;
  near_usd_price: number;
  operator_balance_near: number;
  ref_meta_price: number;
  ref_meta_price_usd: number;
  meta_token_supply: number;
  ref_meta_st_near_apr: number;
  ref_wnear_st_near_stable_apr: number;
  aurora_st_near_price: number;
  validator_seat_price: number;
  validator_next_seat_price: number;
}

export let narwalletsMetrics: NarwalletsMetrics | undefined;
const FETCH_INTERVAL_MS = 10 * 1000 * 60; // 10 minutes in milliseconds
const RETRY_INTERVAL_MS = 10 * 1000; // 10 seconds in milliseconds
let lastFetched = new Date().getTime() - FETCH_INTERVAL_MS;
export async function getNarwalletsMetrics() {
  const elapsed = new Date().getTime() - lastFetched
  if (elapsed >= FETCH_INTERVAL_MS || (!narwalletsMetrics && elapsed >= RETRY_INTERVAL_MS)) {
    try {
      let data = await fetch("https://validators.narwallets.com/metrics_json")
      narwalletsMetrics = await data.json()
      lastFetched = new Date().getTime()
      // const metapool = activeNetworkInfo.liquidStakingContract;
      // let data = await askBackgroundViewMethod(
      //   metapool,
      //   "get_contract_state",
      //   {});
      // stNEARPrice = yton(data.st_near_price)
    } catch (ex) {
      console.log(ex);
    }
  }
}

export const ASSET_HISTORY_TEMPLATE = `
  <div id="{key}">
    <div class="history-line">
      <div class="history-icon">{icon}</div>
      <div class="history-type">{type}&nbsp;
        <span class="history-contract-id">{destination}</span>
      </div>
      <div class="history-date">{date}</div>
      <div class="history-amount">{amount}</div>
      <div class="history-fiat"></div>
    </div>
  </div>
`;

