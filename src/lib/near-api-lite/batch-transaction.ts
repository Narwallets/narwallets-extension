//----------------------
//-- BatchTransaction --
//----------------------
// this classes exists to facilitate the creation of a BatchTransactions
// a BatchTransaction is a series of actions *to be executed on a fixed receiver*
// by having this classes we can make typescript help with type-checking and code suggestions
//

const DEFAULT_GAS="200"+"0".repeat(12);

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
        public attached: string="0",
    ){}
}

export class FunctionCall extends BatchAction{
    public gas:string;
    constructor(
        public method:string,
        public args: Record<string,any>,
        gas?: string,
        attached?: string
    ){
        super("call",attached)
        this.gas = gas||DEFAULT_GAS;
    }
}

export class Transfer extends BatchAction{
    constructor(attached:string){
        super("transfer",attached
        )
    }
}

export class DeleteAccountToBeneficiary extends BatchAction{
    constructor(
        public beneficiaryAccountId:string
    ){
        super("delete")
    }
}

