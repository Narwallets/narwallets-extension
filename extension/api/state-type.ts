//data that's not encrypted
export type StateStruct= {
    dataVersion: string;
    usersList: string[];
    currentUser:string;
    unlocked:boolean;
  }
  
  export type SecureOptions= {
    autoUnlockSeconds: number;
    advancedMode: boolean;
  }

  export type ResolvedMessage = {
    dest:"page";
    code:"request-resolved";
    tabId:number;
    requestId:number;
    err?:string
    data?:any
  }
