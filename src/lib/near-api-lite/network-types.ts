export type NetworkConfig = {
  name: string;
  rootAccount: string;
  displayName: string;
  color: string;
  rpcUrls: string[];
  explorerUrl: string;
  NearWebWalletUrl: string;
  liquidStakingContract: string;
  liquidStakingGovToken: string,
}

export type NetworkNameAndRpcIndex = {
  name: string,
  rpcIndex?: number
}

export const defaultNetwork = "mainnet"

export const NetworkList: NetworkConfig[] = [

  {
    name: "mainnet",
    rootAccount: "near",
    displayName: "NEAR Mainnet",
    color: "green",
    rpcUrls: ["https://free.rpc.fastnear.com",
      "https://rpc.mainnet.near.org",
      "https://near.lava.build"
    ],
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
    explorerUrl: "http://127.0..0.1/explorer/", NearWebWalletUrl: "http://127.0..0.1/wallet/",
    liquidStakingContract: "meta.pool.local", liquidStakingGovToken: "token.meta.pool.local",
  },
];

export function getNetworkConfig(name: string): NetworkConfig {
  for (let i = 0; i < NetworkList.length; i++) if (NetworkList[i].name == name) return NetworkList[i];
  throw new Error("invalid network name: " + name);
}

export function getNetworkRpcUrl(args: NetworkNameAndRpcIndex): string {
  let config = getNetworkConfig(args.name);
  const index = (args.rpcIndex && args.rpcIndex >= 0 && args.rpcIndex < config.rpcUrls.length) ? args.rpcIndex : 0
  return config.rpcUrls[index]
}
