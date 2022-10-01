import * as c from "../util/conversions.js";
import * as global from "../data/global.js";
import { log, logEnabled } from "../lib/log.js";

import * as Network from "../lib/near-api-lite/network.js";
import * as nearAccounts from "../util/search-accounts.js";

import * as near from "../lib/near-api-lite/near-rpc.js";
import { jsonRpc, setRpcUrl } from "../lib/near-api-lite/utils/json-rpc.js";
import { localStorageSet, localStorageGet } from "../data/util.js";
import * as TX from "../lib/near-api-lite/transaction.js";

import { isValidEmail } from "../lib/near-api-lite/utils/valid.js";

import {
  FunctionCall,
  DeleteAccountToBeneficiary,
  Transfer,
  BatchAction,
  BatchTransaction,
} from "../lib/near-api-lite/batch-transaction.js";
import type { ResolvedMessage } from "../data/state-type.js";
import { Asset, assetAddHistory, assetAmount, setAssetBalanceYoctos, findAsset, History, Account } from "../data/account.js";
import { box_nonceLength } from "../lib/naclfast-secret-box/nacl-fast.js";
import { accountHasPrivateKey, selectedAccountData } from "../pages/account-selected.js";
import { META_SVG } from "../util/svg_const.js";

export let globalSendResponse: Function | undefined = undefined

//version: major+minor+version, 3 digits each
function semver(major: number, minor: number, version: number): number {
  return major * 1e6 + minor * 1e3 + version;
}
const WALLET_VERSION = semver(2, 0, 0);

//---------- working data
let _connectedTabs: Record<number, ConnectedTabInfo> = {};
let _bgDataRecovered: boolean;

//----------------------------------------
//-- LISTEN to "chrome.runtime.message" from own POPUPs or from content-scripts
//-- msg path is popup->here->action->sendResponse(err,data)
//-- msg path is tab->cs->here->action
//----------------------------------------
//https://developer.chrome.com/extensions/background_pages
chrome.runtime.onMessage.addListener(runtimeMessageHandler);

function runtimeMessageHandler(
  msg: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: Function
) {
  //check if it comes from the web-page or from this extension
  const url = sender.url ? sender.url : "";
  const fromPage = !url.startsWith(
    "chrome-extension://" + chrome.runtime.id + "/"
  );
  const fromWs = msg.src? msg.src == "ws" : false

  //console.log("runtimeMessage received ",sender, url)
  // log(
  //   "runtimeMessage received " +
  //   (fromPage ? "FROM PAGE " : "from popup ") +
  //   JSON.stringify(msg)
  // );
  if (msg.dest != "ext") {
    sendResponse({ err: "msg.dest must be 'ext'" });
  } else if(fromWs) {
    resolveFromWalletSelector(msg, sendResponse)
  } else if (fromPage) {
    // from web-app/tab -> content-script
    // process separated from internal requests for security
    msg.url = url; //add source
    msg.tabId = sender.tab ? sender.tab.id : -1; //add tab.id
    // setTimeout(() => {
    //   processMessageFromWebPage(msg);
    // }, 100); //execute async
  } else {
    //from internal pages like popup
    //other codes resolved by promises
    getActionPromise(msg)
      .then((data) => {
        //promise resolved OK
        reflectTransfer(msg); // add history entries, move amounts if accounts are in the wallet
        sendResponse({ data: data });
      })
      .catch((ex) => {
        sendResponse({ err: ex.message });
      });
    //sendResponse will be called async .- always return true
    //returning void cancels all pending callbacks
  }
  return true; //a prev callback could be pending.- always return true
}

async function resolveFromWalletSelector(msg: Record<string, any>, sendResponse: Function) {
  let signerId = await localStorageGet("currentAccountId")
  let accInfo: Account
  let actions: TX.Action[] = []
  let resolvedMsg: ResolvedMessage = {
    dest: "page",
    code: "request-resolved",
    tabId: msg.tabId,
    requestId: msg.requestId,
  };
  console.log(`Message received with code ${msg.code}`)
  switch(msg.code) {
    case "is-installed":
      sendResponse({id: msg.id, code: msg.code, data: true})
      break
    case "is-signed-in":
      sendResponse({id: msg.id, code: msg.code, data: !global.isLocked() })
      break
    case "sign-out":
      // await disconnectFromWebPage()
      sendResponse({id: msg.id, code: msg.code, data: true })
      // ctinfo.acceptedConnection = false;
      break
    case "sign-in":
    case "get-account-id":
      if(global.isLocked()) {
        const width = 500;
        const height = 540;
        
        chrome.windows.create({
          url: "index.html",
          type: "popup",
          left: screen.width / 2 - width / 2,
          top: screen.height / 2 - height / 2,
          width: width,
          height: height,
          focused: true,
        });
        console.log("Setting global send response")
        globalSendResponse = function() {
          localStorageGet("currentAccountId").then(accName => sendResponse({id: msg.id, code: msg.code, data: accName}))
          globalSendResponse = undefined
        }
        console.log("Global send response set: ", globalSendResponse)
        // setTimeout(() => {
        //   sendResponse({accountId: "", error: "Wallet is locked"})
        //   globalSendResponse = undefined
        // }, 5000)
      } else {
        
        localStorageGet("currentAccountId").then(accName => {
          console.log(`Getting account ID ${accName}`)
          sendResponse({id: msg.id, code: msg.code, data: accName})
        })
      }
      break
      case "sign-and-send-transaction":
      case "sign-and-send-transactions":
        try {
          prepareAndOpenApprovePopup(msg, signerId)

          globalSendResponse = async function(cancel?: boolean) {
            try {
              if(cancel) {
                sendResponse({id: msg.id, code: msg.code, error: "Rejected by user"})
                return
              }
              if(msg.code == "sign-and-send-transaction") {
                let accInfo = global.getAccount(signerId);
                mapAndCommitActions(msg.params, signerId, accInfo).then(res => {
                  console.log("Res: ", res)
                  sendResponse({id: msg.id, code: msg.code, data: res})
                })
              } else if(msg.code == "sign-and-send-transactions") {
                let responses: Promise<any>[] = []
                for(let i = 0; i < msg.params.length; i++) {
                  responses.push(mapAndCommitActions(msg.params[i], signerId, accInfo))
                }
                sendResponse({id: msg.id, code: msg.code, data: await Promise.all(responses)})
              }
            } catch(err) {
              console.error(err)
            } finally {
              globalSendResponse = undefined
            }            
          }
        } catch (ex) {
          console.log("Error signing transaction", ex)
          //@ts-ignore
          window.pendingApprovalMsg = undefined;
          resolvedMsg.err = ex.message; //if error, also send msg to content-script->tab
          sendResponse({id: msg.id, code: msg.code, error: `Error signing transaction`})
        }
        break;
      default:
        sendResponse({id: msg.id, code: msg.code, error: `Code ${msg.code} not found`})
  }
}

function prepareAndOpenApprovePopup(msg: Record<string, any>, signerId: string) {
  const accInfo = global.getAccount(signerId);
    if (!accInfo.privateKey) {
      throw Error(`Narwallets: account ${signerId} is read-only`);
    }

    msg.dest = "approve"; //send msg to the approval popup
    msg.signerId = signerId
    msg.network = Network.current;
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      msg.url = tabs[0].url;
    });
    console.log("Message", msg)
    if(msg.code == "sign-and-send-transaction") {
      let batchTransaction: BatchTransaction = new BatchTransaction(msg.params.receiverId) 
      msg.params.actions.forEach((action: any) => {
        const functioncall: FunctionCall = new FunctionCall(action.methodName, action.args)
        batchTransaction.addItem(functioncall)
      });
      msg.tx = batchTransaction
    } else if(msg.code == "sign-and-send-transactions") {
      msg.txs = []
      msg.params.forEach((transaction: any) => {
        let batchTransaction: BatchTransaction = new BatchTransaction(transaction.receiverId) 
        transaction.actions.forEach((action: any) => {
          const functioncall: FunctionCall = new FunctionCall(action.methodName, action.args)
          batchTransaction.addItem(functioncall)
        });
        msg.txs.push(batchTransaction)
      });
      
    } else {
      throw new Error(`Approve popup shouldn't be open with code ${msg.code}`)
    }


    //pass message via chrome.extension.getBackgroundPage() common window
    //@ts-ignore
    window.pendingApprovalMsg = msg;
    console.log("Opening approve popup")
    //load popup window for the user to approve
    const width = 500;
    const height = 540;
    chrome.windows.create({
      url: "popups/approve/approve.html",
      type: "popup",
      left: screen.width / 2 - width / 2,
      top: screen.height / 2 - height / 2,
      width: width,
      height: height,
      focused: true,
    });
}

async function mapAndCommitActions(params: any, signerId: string, accInfo: Account): Promise<any> {
  const actions: TX.Action[] = params.actions.map((action: any) => {
    return createCorrespondingAction(action)
  })
  console.log("Gas", actions[0].functionCall.gas)
  return await near.broadcast_tx_commit_actions(
    actions,
    signerId,
    params.receiverId,
    accInfo.privateKey || ""
  )
}

function createCorrespondingAction(action: any): TX.Action {
  console.log("Action", action)
  if(action.methodName) {
    // action.gas = "1000000000"
    return TX.functionCall(action.methodName, action.args, BigInt(action.gas), BigInt(action.deposit))
  } else if(action.beneficiaryAccountId) {
    return TX.deleteAccount(action.beneficiaryAccountId)
  } else if(action.attached) {
    return TX.transfer(BigInt(action.attached))
  }
  throw new Error(`There is no action that matches input: ${action}`)
}

function reflectReception(receiver: string, amount: number, sender: string) {
  const accounts = global.SecureState.accounts[Network.current];
  // is the dest-account also in this wallet?
  const destAccount = accounts[receiver];
  if (destAccount == undefined) return;
  destAccount.lastBalance += amount
  destAccount.history.unshift(new History("received", amount, sender))
}

//-- reflect transfer in wallet accounts
// no async
function reflectTransfer(msg: any) {
  let modified = false;
  try {
    switch (msg.code) {
      case "apply": {
        // apply transaction request from popup
        // {code:"apply", signerId:<account>, tx:BatchTransaction}
        // when resolved, send msg to content-script->page
        const accounts = global.SecureState.accounts[Network.current];
        if (accounts == undefined) return;
        const signerId = msg.signerId || "...";
        for (let item of msg.tx.items) {
          //convert action
          switch (item.action) {
            case "call":
              const f = item as FunctionCall;
              if (f.method == "ft_transfer" || f.method == "ft_transfer_call") {
                const contract = msg.tx.receiver;
                const sender = signerId;
                const receiver = f.args.receiver_id
                const amountY = f.args.amount;

                const sourceAccount = accounts[sender];
                if (sourceAccount == undefined) break;
                // search the asset in the source-account
                const sourceAsset = findAsset(sourceAccount, contract)
                if (sourceAsset && sourceAsset.balance!=undefined) {
                  // if found, subtract amount from balance
                  sourceAsset.balance -= assetAmount(sourceAsset, amountY);
                  if (sourceAsset.balance < 0) sourceAsset.balance = 0;
                  assetAddHistory(sourceAsset, "send", assetAmount(sourceAsset, amountY), receiver)
                }

                // is the dest-account also in this wallet?
                const destAccount = accounts[receiver];
                if (destAccount == undefined) break;
                // search the asset in the dest-account
                let destAsset = findAsset(destAccount, contract);
                if (destAsset != undefined && destAsset.balance!=undefined) {
                  // if found, add amount to balance
                  destAsset.balance += assetAmount(destAsset, amountY);
                  //assetAddHistory(destAsset)
                }
                else if (sourceAsset != undefined) {
                  // if not found, clone from sourceAsset
                  destAsset = Asset.newFrom(sourceAsset)
                  setAssetBalanceYoctos(destAsset, amountY);
                  destAccount.assets.push(destAsset)
                }
                if (destAsset != undefined) {
                  assetAddHistory(destAsset, "received", assetAmount(destAsset, amountY), sender)
                }
                modified = true;
              }
              break;

            case "transfer": { // NEAR native
              const sender = signerId;
              const receiver = msg.tx.receiver;
              const amountY = item.attached;

              const sourceAccount = accounts[sender];
              if (sourceAccount == undefined) break;
              sourceAccount.lastBalance -= c.yton(amountY)
              modified = true;
              if (sourceAccount.lastBalance < 0) sourceAccount.lastBalance = 0;
              sourceAccount.history.unshift(new History("send", c.yton(amountY), receiver))

              reflectReception(receiver, c.yton(amountY), sender);
            }
              break;

            // commented: amount can not be determined precisely
            // case "delete": {
            //   const d = item as DeleteAccountToBeneficiary;
            //   const sender = signerId;
            //   const sourceAccount = accounts[sender];
            //   if (sourceAccount == undefined) break;
            //   reflectReception(d.beneficiaryAccountId,c.yton(amountY),signerId);
            //   actions.push(TX.deleteAccount());
            // }
            // break;

            default:
            // other item.action
          }
        }
      }
      default: {
        //throw Error(`invalid msg.code ${JSON.stringify(msg)}`);
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  if (modified) {
    global.saveSecureState();
  }
}

//create a promise to resolve the action requested by the popup
function getActionPromise(msg: Record<string, any>): Promise<any> {
  try {
    switch (msg.code) {
      case "callGlobalSendResponse":
        if(!globalSendResponse) {
          return Promise.resolve(false)
        }
        globalSendResponse(msg.cancel)
        return Promise.resolve(true)
      case "get-account-id": {
        return Promise.resolve(selectedAccountData.name)
      }
      case "set-network": {
        Network.setCurrent(msg.network);
        localStorageSet({ selectedNetwork: Network.current });
        return Promise.resolve(Network.currentInfo());
      }
      case "get-network-info": {
        return Promise.resolve(Network.currentInfo());
      }
      case "get-state": {
        return Promise.resolve(global.State);
      }
      case "lock": {
        global.lock(JSON.stringify(msg));
        return Promise.resolve();
      }
      case "is-locked": {
        return Promise.resolve(global.isLocked());
      }
      case "unlockSecureState": {
        return global.unlockSecureStateAsync(msg.email, msg.password);
      }
      case "create-user": {
        return global.createUserAsync(msg.email, msg.password);
      }
      case "change-password": {
        return global.changePasswordAsync(msg.email, msg.password)
      }
      case "set-options": {
        global.SecureState.advancedMode = msg.advancedMode;
        global.SecureState.autoUnlockSeconds = msg.autoUnlockSeconds;
        global.saveSecureState();
        return Promise.resolve();
      }
      case "get-options": {
        return Promise.resolve({
          advancedMode: global.SecureState.advancedMode,
          autoUnlockSeconds: global.SecureState.autoUnlockSeconds,
        });
      }
      case "get-account": {
        if (!global.SecureState.accounts[Network.current]) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(
          global.SecureState.accounts[Network.current][msg.accountId]
        );
      }
      case "set-account": {
        if (!msg.accountId) return Promise.reject(Error("!msg.accountId"));
        if (!msg.accInfo) return Promise.reject(Error("!msg.accInfo"));
        if (!msg.accInfo.network) {
          console.log("Account without network. ", JSON.stringify(msg.accInfo))
        } else {
          if (!global.SecureState.accounts[msg.accInfo.network]) {
            global.SecureState.accounts[msg.accInfo.network] = {};
          }
          global.SecureState.accounts[msg.accInfo.network][msg.accountId] = msg.accInfo;
          global.saveSecureState();
        }
        return Promise.resolve();
      }
      case "add-contact": {
        if (!msg.name) return Promise.reject(Error("!msg.name"));
        if (!global.SecureState.contacts) global.SecureState.contacts = {};
        if (!global.SecureState.contacts[Network.current]) {
          global.SecureState.contacts[Network.current] = {};
        }
        global.SecureState.contacts[Network.current][msg.name] = msg.contact;
        global.saveSecureState();
        return Promise.resolve();
      }
      case "set-account-order": {
        //whe the user reorders the account list
        try {
          let accInfo = global.getAccount(msg.accountId);
          accInfo.order = msg.order;
          global.saveSecureState();
          return Promise.resolve();
        } catch (ex) {
          return Promise.reject(ex);
        }
      }
      case "remove-account": {
        if (msg.accountId) {
          delete global.SecureState.accounts[Network.current][msg.accountId];
        }
        //persist
        global.saveSecureState();
        return Promise.resolve();
      }
      case "getNetworkAccountsCount": {
        return Promise.resolve(global.getNetworkAccountsCount());
      }
      case "all-address-contacts": {
        let result;
        if (!global.SecureState.contacts) {
          result = {};
        } else {
          result = global.SecureState.contacts[Network.current];
        }
        return Promise.resolve(result || {});
      }
      case "all-network-accounts": {
        const result = global.SecureState.accounts[Network.current];
        return Promise.resolve(result || {});
      }
      // case "connect": {
      //   if (!msg.network) msg.network = Network.current;
      //   return connectToWebPage(msg.accountId, msg.network);
      // }
      
      case "disconnect": {
        return disconnectFromWebPage();
      }
      case "isConnected": {
        return isConnected();
      }
      case "get-validators": {
        //view-call request
        return near.getValidators();
      }
      case "access-key": {
        //check access-key exists and get nonce
        return near.access_key(msg.accountId, msg.publicKey);
      }
      case "query-near-account": {
        //check access-key exists and get nonce
        return near.queryAccount(msg.accountId);
      }
      case "view": {
        //view-call request
        return near.view(msg.contract, msg.method, msg.args);
      }
      case "set-address-book": {
        if (!msg.accountId) return Promise.reject(Error("!msg.accountId"));
        if (!global.SecureState.contacts[Network.current]) global.SecureState.contacts[Network.current] = {};
        global.SecureState.contacts[Network.current][msg.accountId] = msg.contact;
        global.saveSecureState();
        return Promise.resolve();
      }
      case "remove-address": {
        delete global.SecureState.contacts[Network.current][msg.accountId];
        //persist
        global.saveSecureState();
        return Promise.resolve();
      }
      case "apply": {
        //apply transaction request from popup
        //{code:"apply", signerId:<account>, tx:BatchTransaction}
        //when resolved, send msg to content-script->page
        const signerId = msg.signerId || "...";
        const accInfo = global.getAccount(signerId);
        if (!accInfo.privateKey) throw Error(`Narwallets: account ${signerId} is read-only`);
        //convert wallet-api actions to near.TX.Action
        const actions: TX.Action[] = [];
        for (let item of msg.tx.items) {
          //convert action
          switch (item.action) {
            case "call":
              const f = item as FunctionCall;
              actions.push(
                TX.functionCall(
                  f.method,
                  f.args,
                  BigInt(f.gas),
                  BigInt(f.attached)
                )
              );
              break;
            case "transfer":
              actions.push(TX.transfer(BigInt(item.attached)));
              break;
            case "delete":
              const d = item as DeleteAccountToBeneficiary;
              actions.push(TX.deleteAccount(d.beneficiaryAccountId));
              break;
            default:
              throw Error("batchTx UNKNOWN item.action=" + item.action);
          }
        }
        //returns the Promise required to complete this action
        return near.broadcast_tx_commit_actions(
          actions,
          signerId,
          msg.tx.receiver,
          accInfo.privateKey || ""
        );
      }
      default: {
        throw Error(`invalid msg.code ${JSON.stringify(msg)}`);
      }
    }
  } catch (ex) {
    return Promise.reject(ex);
  }
}
/*
    selectedAccountData.accountInfo.history.unshift(
  new History("send", amountToSend, toAccName)
);
 
*/


//---------------------------------------------------
//process msgs from web-page->content-script->here
//---------------------------------------------------
async function processMessageFromWebPage(msg: any) {
  log(`enter processMessageFromWebPage _bgDataRecovered ${_bgDataRecovered}`);

  if (!msg.tabId) {
    log("msg.tabId is ", msg.tabId);
    return;
  }

  if (!_bgDataRecovered) await retrieveBgInfoFromStorage();

  //when resolved, send msg to content-script->page
  let resolvedMsg: ResolvedMessage = {
    dest: "page",
    code: "request-resolved",
    tabId: msg.tabId,
    requestId: msg.requestId,
  };
  log(JSON.stringify(resolvedMsg));
  log("_connectedTabs[msg.tabId]", JSON.stringify(_connectedTabs[msg.tabId]));

  if (!_connectedTabs[msg.tabId]) {
    resolvedMsg.err = `chrome-tab ${msg.tabId} is not connected to Narwallets`; //if error also send msg to content-script->tab
    chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
    return;
  }

  const ctinfo = _connectedTabs[msg.tabId];
  log(
    `processMessageFromWebPage _bgDataRecovered ${_bgDataRecovered}`,
    JSON.stringify(msg)
  );

  switch (msg.code) {
    case "sign-in": {
      //load popup window for the user to approve
      // if(await accountHasPrivateKey()) {
      //   console.log("Private key", selectedAccountData)
      // }
      // console.log("Signing in", selectedAccountData)
      // const width = 500;
      // const height = 540;
      // chrome.windows.create({
      //   url: "index.html",
      //   type: "popup",
      //   left: screen.width / 2 - width / 2,
      //   top: screen.height / 2 - height / 2,
      //   width: width,
      //   height: height,
      //   focused: true,
      // });
      // if(global.isLocked()) {
      //   const width = 500;
      //   const height = 540;
      //   chrome.windows.create({
      //     url: "index.html",
      //     type: "popup",
      //     left: screen.width / 2 - width / 2,
      //     top: screen.height / 2 - height / 2,
      //     width: width,
      //     height: height,
      //     focused: true,
      //   });
      // } else {
      //   resolvedMsg.data = {accessKey: "", error: undefined}
      //   chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
      // }
    }
    case "connected":
      ctinfo.acceptedConnection = !msg.err;
      ctinfo.connectedResponse = msg;
      break;

    case "disconnect":
      ctinfo.acceptedConnection = false;
      break;

    case "get-account-balance":
      near
        .queryAccount(msg.accountId)
        .then((data) => {
          resolvedMsg.data = data.amount; //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch((ex) => {
          resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        });
      break;

    case "get-account-state":
      near
        .queryAccount(msg.accountId)
        .then((data) => {
          resolvedMsg.data = data; //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch((ex) => {
          resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        });
      break;

    case "view":
      //view-call request
      near
        .view(msg.contract, msg.method, msg.args)
        .then((data) => {
          resolvedMsg.data = data; //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch((ex) => {
          resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        });
      break;

    case "apply":
      //tx apply, change call request, requires user approval
      try {
        if (!ctinfo.connectedAccountId) {
          throw Error("connectedAccountId is null"); //if error also send msg to content-script->tab
        }

        //verify account exists and is full-access
        const signerId = ctinfo.connectedAccountId;
        const accInfo = global.getAccount(signerId);
        if (!accInfo.privateKey) {
          throw Error(`Narwallets: account ${signerId} is read-only`);
        }

        msg.dest = "approve"; //send msg to the approval popup
        msg.signerId = ctinfo.connectedAccountId;
        msg.network = Network.current;

        //pass message via chrome.extension.getBackgroundPage() common window
        //@ts-ignore
        window.pendingApprovalMsg = msg;

        //load popup window for the user to approve
        const width = 500;
        const height = 540;
        chrome.windows.create({
          url: "popups/approve/approve.html",
          type: "popup",
          left: screen.width / 2 - width / 2,
          top: screen.height / 2 - height / 2,
          width: width,
          height: height,
          focused: true,
        });
      } catch (ex) {
        //@ts-ignore
        window.pendingApprovalMsg = undefined;
        resolvedMsg.err = ex.message; //if error, also send msg to content-script->tab
        chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
      }
      break;

    case "json-rpc":
      //low-level query
      jsonRpc(msg.method, msg.args)
        .then((data) => {
          resolvedMsg.data = data; //if resolved ok, send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        })
        .catch((ex) => {
          resolvedMsg.err = ex.message; //if error ok, also send msg to content-script->tab
          chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
        });
      break;

    default:
      log("unk msg.code", JSON.stringify(msg));
      resolvedMsg.err = "invalid code: " + msg.code; //if error ok, also send msg to content-script->tab
      chrome.tabs.sendMessage(resolvedMsg.tabId, resolvedMsg);
  }
}

//------------------------
//on extension installed
//------------------------
chrome.runtime.onInstalled.addListener(function (details) {
  log("onInstalled");

  if (details.reason == "install") {
    //call a function to handle a first install
  } else if (details.reason == "update") {
    //call a function to handle an update
  }
});

/**
 * Tries to connect to web page. (CPS style)
 * There are several steps involved
 * 1. inject proxy-content-script
 * 2. wait for injected-proxy to open the contentScriptPort
 * 3. send "connect"
 * 4. check response from the page
 */

//Continuation-Passing style data
type CPSDATA = {
  accountId: string;
  network: string;
  activeTabId: number;
  url: string | undefined;
  ctinfo: ConnectedTabInfo;
  resolve: Function;
  reject: Function;
};

// chrome.tabs.onCreated.addListener(function(tabId) {
//   connectToWebPage("silkking.testnet", "testnet")
// })

// chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
//   console.log("pepe")
//   if (changeInfo.status == 'complete') {
//     connectToWebPage("silkking.testnet", "testnet")
//   }
// })

// function connectToWebPage(accountId: string, network: string): Promise<any> {
//   log("connectToWebPage start");

//   return new Promise((resolve, reject) => {
//     chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
//       if (chrome.runtime.lastError)
//         return reject(Error(chrome.runtime.lastError.message));

//       const activeTabId = (tabs[0] ? tabs[0].id : -1) || -1;
//       if (activeTabId == -1) return reject(Error("no activeTabId"));

//       if (!_connectedTabs) _connectedTabs = {};
//       if (!_connectedTabs[activeTabId]) _connectedTabs[activeTabId] = {};

//       const cpsData: CPSDATA = {
//         accountId: accountId,
//         network: network,
//         activeTabId: activeTabId,
//         url: tabs[0].url,
//         ctinfo: _connectedTabs[activeTabId],
//         resolve: resolve,
//         reject: reject,
//       };
//       log("activeTabId", cpsData);
//       cpsData.ctinfo = _connectedTabs[cpsData.activeTabId];
//       cpsData.ctinfo.acceptedConnection = false; //we're connecting another
//       cpsData.ctinfo.connectedResponse = {};

//       //check if it responds (if it is already injected)
//       try {
//         if (chrome.runtime.lastError) throw Error(chrome.runtime.lastError);
//         if (!tabs || !tabs[0]) throw Error("can access chrome tabs");

//         chrome.tabs.sendMessage(
//           cpsData.activeTabId,
//           { code: "ping" },
//           function (response) {
//             if (chrome.runtime.lastError) {
//               response = undefined;
//             }
//             if (!response) {
//               //not responding, set injected status to false
//               cpsData.ctinfo.injected = false;
//               //console.error(JSON.stringify(chrome.runtime.lastError));
//             } else {
//               //responded set injected status
//               cpsData.ctinfo.injected = true;
//             }
//             //CPS
//             return continueCWP_2(cpsData);
//           }
//         );
//       } catch (ex) {
//         //err trying to talk to the page, set injected status
//         cpsData.ctinfo.injected = false;
//         log(ex);
//         //CPS
//         return continueCWP_2(cpsData);
//       }
//     });
//   });
// }


///inject if necessary
// function continueCWP_2(cpsData: CPSDATA) {
//   if (cpsData.ctinfo.injected) {
//     //if responded, it was injected, continue
//     return continueCWP_3(cpsData);
//   }
//   //not injected yet. Inject/execute contentScript on activeTab
//   //contentScript replies with a chrome.runtime.sendMessage
//   //it also listens to page messages and relays via chrome.runtime.sendMessage
//   //basically contentScript.js acts as a proxy to pass messages from ext<->tab
//   log("injecting");
//   try {
//     chrome.tabs.executeScript(
//       { file: "dist/background/contentScript.js" },
//       function () {
//         if (chrome.runtime.lastError) {
//           log(JSON.stringify(chrome.runtime.lastError));
//           return cpsData.reject(chrome.runtime.lastError);
//         } else {
//           //injected ok
//           cpsData.ctinfo.injected = true;
//           //CPS
//           return continueCWP_3(cpsData);
//         }
//       }
//     );
//   } catch (ex) {
//     return cpsData.reject(ex);
//   }
// }

///send connect order
// function continueCWP_3(cpsData: CPSDATA) {
//   cpsData.ctinfo.connectedResponse = { err: undefined };
//   log("chrome.tabs.sendMessage to", cpsData.activeTabId, cpsData.url);
//   //send connect order via content script. a response will be received later
//   chrome.tabs.sendMessage(cpsData.activeTabId, {
//     dest: "page",
//     code: "connect",
//     data: {
//       accountId: cpsData.accountId,
//       network: cpsData.network,
//       version: WALLET_VERSION,
//     },
//   });
//   //wait 250 for response
//   setTimeout(() => {
//     if (cpsData.ctinfo.acceptedConnection) {
//       //page responded with connection info
//       cpsData.ctinfo.connectedAccountId = cpsData.accountId; //register connected account
//       return cpsData.resolve();
//     } else {
//       let errMsg =
//         cpsData.ctinfo.connectedResponse.err ||
//         "not responding / Not a Narwallets-compatible Web App";
//       return cpsData.reject(Error(cpsData.url + ": " + errMsg));
//     }
//   }, 250);
// }

type ConnectedTabInfo = {
  injected?: boolean;
  acceptedConnection?: boolean;
  connectedAccountId?: string;
  connectedResponse?: any;
};

function disconnectFromWebPage(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError)
        throw Error(chrome.runtime.lastError.message);
      if (!tabs || !tabs[0]) reject(Error("can access chrome tabs"));
      const activeTabId = tabs[0].id || -1;
      if (
        _connectedTabs[activeTabId] &&
        _connectedTabs[activeTabId].acceptedConnection
      ) {
        _connectedTabs[activeTabId].acceptedConnection = false;
        chrome.tabs.sendMessage(activeTabId, {
          dest: "page",
          code: "disconnect",
        });
        return resolve();
      } else {
        return reject(Error("active web page is not connected"));
      }
    });
  });
}

function isConnected(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!_connectedTabs) return resolve(false);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError)
        return reject(chrome.runtime.lastError.message);
      if (!tabs || tabs.length == 0 || !tabs[0]) return resolve(false);
      const activeTabId = tabs[0].id;
      if (!activeTabId) return resolve(false);
      return resolve(
        !!(
          _connectedTabs[activeTabId] &&
          _connectedTabs[activeTabId].acceptedConnection
        )
      );
    });
  });
}

function saveWorkingData() {
  localStorageSet({ _ct: _connectedTabs, _us: global.workingData.unlockSHA });
  // if (!global.isLocked()) {
  //   localStorageSet({ _unlock:  })
  // }
}
//recover working data if it was suspended
async function recoverWorkingData(): Promise<void> {
  _connectedTabs = await localStorageGet("_ct");
  log("RECOVERED _connectedTabs", _connectedTabs);
  global.workingData.unlockSHA = await localStorageGet("_us");
  log("RECOVERED SHA", global.workingData.unlockSHA);
  //@ts-ignore
  //_connectedTabs = await localStorageGet("_ct");
}

//------------------------
//on bg page suspended
//------------------------
chrome.runtime.onSuspend.addListener(function () {
  //save working data
  saveWorkingData();
  log("onSuspend.");
  chrome.browserAction.setBadgeText({ text: "" });
});

//------------------------
//----- expire auto-unlock
//------------------------
const UNLOCK_EXPIRED = "unlock-expired";

//------------------------
//expire alarm
//------------------------
chrome.alarms.onAlarm.addListener(function (alarm: any) {
  //log("chrome.alarms.onAlarm fired ", alarm);
  if (alarm.name == UNLOCK_EXPIRED) {
    chrome.alarms.clearAll();
    global.lock("chrome.alarms.onAlarm " + JSON.stringify(alarm));
    //window.close()//unload this background page
    //chrome.storage.local.remove(["uk", "exp"]) //clear unlock sha
  }
});

var lockTimeout: any;
var unlockExpire: any;
//only to receive "popupLoading"|"popupUnloading" events
window.addEventListener(
  "message",
  async function (event) {
    if (event.data.code == "popupUnloading") {
      if (!global.isLocked()) {
        const autoUnlockSeconds = global.getAutoUnlockSeconds();
        unlockExpire = Date.now() + autoUnlockSeconds * 1000;
        chrome.alarms.create(UNLOCK_EXPIRED, { when: unlockExpire });
        log(UNLOCK_EXPIRED, autoUnlockSeconds);
        if (autoUnlockSeconds < 60 * 5) {
          //also setTimeout to Lock, because alarms fire only once per minute
          if (lockTimeout) clearTimeout(lockTimeout);
          lockTimeout = setTimeout(global.lock, autoUnlockSeconds * 1000);
        }
      }
      return;
    } else if (event.data.code == "popupLoading") {
      log("popupLoading");
      await retrieveBgInfoFromStorage();
      chrome.runtime.sendMessage({ dest: "popup", code: "can-init-popup" });
    }
  },
  false
);

// called on popupLoading to consider the possibility the user added accounts to the wallet on another tab
async function retrieveBgInfoFromStorage() {
  if (unlockExpire && Date.now() > unlockExpire)
    global.lock("retrieveBgInfoFromStorage");
  if (lockTimeout) clearTimeout(lockTimeout);
  //To manage the possibility that the user has added/removed accounts ON ANOTHER TAB
  //we reload state & secureState from storage when the popup opens
  await global.recoverState();
  if (!global.State.dataVersion) {
    global.clearState();
  }
  if (global.State.currentUser && global.workingData.unlockSHA) {
    //try to recover secure state
    try {
      await global.unlockSecureStateSHA(
        global.State.currentUser,
        global.workingData.unlockSHA
      );
    } catch (ex) {
      log("recovering secure state on retrieveBgInfoFromStorage", ex.message);
    }
  }
  _bgDataRecovered = true;
  const nw = (await localStorageGet("selectedNetwork")) as string;
  if (nw) Network.setCurrent(nw);
  log("NETWORK=", nw);
}

//returns true if loaded-unpacked, developer mode
//false if installed from the chrome store
function isDeveloperMode() {
  return !("update_url" in chrome.runtime.getManifest());
}


document.addEventListener("DOMContentLoaded", onLoad);
async function onLoad() {
  //WARNING:: if the background page wakes-up because a tx-apply
  //chrome will process "MessageFromPage" ASAP, meaning BEFORE the 2nd await.
  //solution: MessageFromPage is on a setTimeout to execute async
  //logEnabled(isDeveloperMode());
  //logEnabled(true);
  await recoverWorkingData();
  if (!_bgDataRecovered) await retrieveBgInfoFromStorage();
}
