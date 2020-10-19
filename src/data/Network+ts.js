/*+
export type NetworkInfo = {
    name: string;
    rootAccount: string;
    displayName: string;
    color: string;
    rpc: string;
  }
+*/  

  export const List/*:NetworkInfo[]*/=[
    {name:"mainnet", rootAccount:"near", displayName:"Mainnet", color:"green", rpc:"https://rpc.nearprotocol.com/"},
    {name:"guildnet", rootAccount:"guildnet", displayName:"OSA Guildnet", color:"cyan", rpc:"https://rpc.guildnet.near.org/" },
    {name:"testnet", rootAccount:"testnet", displayName:"Testnet", color:"yellow", rpc:"https://rpc.testnet.near.org/"},
    {name:"betanet", rootAccount:"betanet", displayName:"Betanet", color: "violet", rpc:"https://rpc.betanet.near.org/"},
    {name:"local", rootAccount:"local", displayName:"Local Network", color: "red", rpc:"http://127.0.0.1/"},
  ];
  
  export const defaultName = "testnet"; //default testnet
  export let current = defaultName;

  export function setCurrent(name/*:string*/)/*:NetworkInfo*/{
    const info = getInfo(name); //get & check
    current=name
    return info;
  };

  export function getInfo(name/*:string*/) /*:NetworkInfo*/ {
    for(let i=0;i<List.length;i++) if (List[i].name==name) return List[i];
    throw new Error("invalid network name: "+name);
  }

  export function currentInfo() /*:NetworkInfo*/ { return getInfo(current) };
  