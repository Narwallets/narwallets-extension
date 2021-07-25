import { askBackground, askBackgroundCallMethod } from "../background/askBackground.js";

export const DEFAULT_GAS="200"+"0".repeat(12);

export type U64String = string;
export type U128String = string;

//-----------------------------
// Base smart-contract proxy class
// provides constructor, view & call methods
// derive your specific contract proxy from this class
//-----------------------------
export class SmartContract {

    constructor( 
        public contractId:string, 
        public signerId: string,
    )
    {
        
    }

    view(method:string, args?:any) : Promise<any> {
        return askBackground({code:"view", contract:this.contractId, method:method, args:args}) as Promise<Object>
    }

    call(method:string, args:any, gas?:U64String, attachedYoctos?:U128String) : Promise<any> {
        return askBackgroundCallMethod(this.contractId, method, args, this.signerId, gas, attachedYoctos) as Promise<Object>
    }
}

