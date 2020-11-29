//----------------------
//-- BatchTransaction --
//----------------------
// this classes exists to facilitate the creation of a BatchTransactions
// a BatchTransaction is a series of actions *to be executed on a fixed receiver*
// by having this classes we can make typescript help with type-checking and code suggestions
//
export class BatchTransaction {
    items: BatchAction[] = []
    constructor(
        public receiver:string,
    ){}

    addItem(item:BatchAction){
        this.items.push(item)
    }
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
}

export class Transfer extends BatchAction{
    constructor(
        attachedNear:number
    ){
        super("transfer",attachedNear)
    }
}

export class DeleteAccountToBeneficiary extends BatchAction{
    constructor(
        beneficiaryAccountId:string
    ){
        super("delete")
    }
}

