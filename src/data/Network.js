/*+
export type NetworkInfo = {
    name: string;
    rootAccount: string;
    displayName: string;
    color: string;
    rpc: string;
  }
+*/
  
  import { setRpcUrl } from "../api/utils/json-rpc.js";
 
  export const List/*:NetworkInfo[]*/=[
    {name:"mainnet", rootAccount:"near", displayName:"NEAR Mainnet", color:"green", rpc:"https://rpc.mainnet.near.org/"},
    {name:"guildnet", rootAccount:"guildnet", displayName:"OSA Guildnet", color:"cyan", rpc:"https://rpc.guildnet.near.org/" },
    {name:"testnet", rootAccount:"testnet", displayName:"NEAR Testnet", color:"yellow", rpc:"https://rpc.testnet.near.org/"},
    {name:"betanet", rootAccount:"betanet", displayName:"NEAR Betanet", color: "violet", rpc:"https://rpc.betanet.near.org/"},
    {name:"local", rootAccount:"local", displayName:"Local Network", color: "red", rpc:"http://127.0.0.1/"},
  ];
  
  export const defaultName = "testnet"; //default testnet
  export let current = defaultName;

  export let changeListeners/*:Record<string,(info:NetworkInfo)=>void>*/ = {};

  export function setCurrent(name/*:string*/)/*:void*/{
    const info = getInfo(name); //get & check
    current=name
    setRpcUrl(info.rpc)
    for(const key in changeListeners){
      try{
      changeListeners[key](info); //call all listeners
      } catch(ex){
        console.error(ex);
      }
    };
  };

  export function getInfo(name/*:string*/) /*:NetworkInfo*/ {
    for(let i=0;i<List.length;i++) if (List[i].name==name) return List[i];
    throw new Error("invalid network name: "+name);
  }

  export function currentInfo() /*:NetworkInfo*/ { return getInfo(current) };
  

