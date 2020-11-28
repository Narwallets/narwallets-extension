//----------------------
//-- BatchTransaction --
//----------------------
// this classes exists to facilitate the creation of a BatchTransaction
// a BatchTransaction is a series of actions *to be executed on a fixed receiver*
// by having this classes we can make typescript help with type-checking and code suggestions
export class BatchTransaction {
    items: BatchAction[] = []
    constructor(
        public receiver:string,
    ){}

    addItem(item:BatchAction){
        this.items.push(item)
    }

    // asPOJO():Record<string,any>{
    //     let result=[]
    //     for(let item of this.items){
    //         result.push(item.asPOJO())
    //     }
    //     return result;
    // }
}

export class BatchAction {
    constructor(
        public action: string,
        public attachedNear: number = 0,
    ){}
}

export class FunctionCall extends BatchAction{
    constructor(
        public method:string,
        public args: Record<string,any>,
        public Tgas: number = 50,
        attachedNear: number
    ){
        super("call",attachedNear)
    }

    // asPOJO(){
    //     return {action:"call", 
    //     contract:this.contract,
    //     method:this.method, 
    //     args:this.args, 
    //     Tgas:this.Tgas, 
    //     attachedNear: this.attachedNear}
    // }
}
export class Transfer extends BatchAction{
    constructor(
        attachedNear:number
    ){
        super("transfer",attachedNear)
    }

    // asPOJO(){
    //     return {action:"transfer", 
    //     receiver:this.receiver, 
    //     attachedNear: this.attachedNear}
    // }
}


