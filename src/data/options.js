import { recoverFromSyncStorage,saveToSyncStorage } from "./util.js";

/*+
//data that's not encrypted
type OptionsStruc= {
  dataVersion: string;
  advanced: boolean; //enables advanced options for user who know what they're doing
}

+*/

const DATA_VERSION="0.1"

export const EmptyOptions/*:OptionsStruc*/ = {
    dataVersion: DATA_VERSION,
    advanced: false,
  };
  
export var options = Object.assign({},EmptyOptions);

export async function recoverOptions(){
    options = await recoverFromSyncStorage("options","opt",EmptyOptions)
}

export function saveOptions(){
    saveToSyncStorage("options","opt",options)
}
