import * as JsonRPC from "./utils/json-rpc.js";

export type NetworkInfo = {
  name: string;
  rootAccount: string;
  displayName: string;
  color: string;
  rpcUrls: string[];
  currentRpcIndex: number;
  explorerUrl: string;
  NearWebWalletUrl: string;
  liquidStakingContract: string;
  liquidStakingGovToken: string,

}

export const NetworkList: NetworkInfo[] = [

  {
    name: "mainnet",
    rootAccount: "near",
    displayName: "NEAR Mainnet",
    color: "green",
    rpcUrls: ["https://free.rpc.fastnear.com",
      "https://rpc.mainnet.near.org",
      "https://near.lava.build"
    ],
    currentRpcIndex: 0,
    explorerUrl: "https://nearblocks.io/",
    NearWebWalletUrl: "https://app.mynearwallet.com/",
    liquidStakingContract: "meta-pool.near",
    liquidStakingGovToken: "meta-token.near",
  },

  // { name: "guildnet", rootAccount: "guildnet", displayName: "OSA Guildnet", color: "cyan", 
  //     rpc: "https://rpc.openshards.io/", explorerUrl: "https://explorer.guildnet.near.org/", NearWebWalletUrl:"https://wallet.openshards.io/",
  //     liquidStakingContract: "meta.pool.guildnet", liquidStakingGovToken: "token.meta.pool.guildnet",
  // },

  {
    name: "testnet", rootAccount: "testnet", displayName: "NEAR Testnet", color: "yellow",
    rpcUrls: ["https://rpc.testnet.near.org"],
    currentRpcIndex: 0,
    explorerUrl: "https://testnet.nearblocks.io/", NearWebWalletUrl: "https://wallet.testnet.near.org/",
    liquidStakingContract: "meta-v2.pool.testnet", liquidStakingGovToken: "token.meta.pool.testnet",
  },

  // { name: "betanet", rootAccount: "betanet", displayName: "NEAR Betanet", color: "violet", 
  //   rpc: "https://rpc.betanet.near.org/", explorerUrl: "https://explorer.betanet.near.org/", NearWebWalletUrl:"https://wallet.betanet.near.org/",  
  //   liquidStakingContract:"meta.pool.betanet", liquidStakingGovToken: "token.meta.pool.betanet",
  // },

  {
    name: "local", rootAccount: "local", displayName: "Local Network", color: "red",
    rpcUrls: ["http://127.0.0.1/rpc"],
    currentRpcIndex: 0,
    explorerUrl: "http://127.0..0.1/explorer/", NearWebWalletUrl: "http://127.0..0.1/wallet/",
    liquidStakingContract: "meta.pool.local", liquidStakingGovToken: "token.meta.pool.local",
  },
];

export type SetNetworkArgs = {
  networkName: string,
  rpcIndex: number
}

export function getSelectedRpcUrl(info: NetworkInfo): string {
  let index = info.currentRpcIndex
  if (index < 0 || index > info.rpcUrls.length - 1) index = 0;
  return info.rpcUrls[index]
}

export const defaultName = "mainnet"; //default network
export let currentNetworkName = defaultName;

export function setCurrent(data: SetNetworkArgs): void {
  let info
  try {
    info = getInfo(data.networkName); // get & check
  } catch (ex) {
    info = NetworkList[0]
  }
  info.currentRpcIndex = data.rpcIndex || 0
  JsonRPC.setRpcUrl(getSelectedRpcUrl(info))
  currentNetworkName = info.name
  //COMMENTED: this is called from processMsgFromPage-- better not broadcast changes
  //chrome.runtime.sendMessage({ code: "network-changed", network:current, networkInfo:info });
};

export function getInfo(name: string): NetworkInfo {
  for (let i = 0; i < NetworkList.length; i++) if (NetworkList[i].name == name) return NetworkList[i];
  throw new Error("invalid network name: " + name);
}

export function currentInfo(): NetworkInfo { return getInfo(currentNetworkName) };

