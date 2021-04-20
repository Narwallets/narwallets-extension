//----------------------
//-- BatchTransaction --
//----------------------
// this classes exists to facilitate the creation of a BatchTransactions
// a BatchTransaction is a series of actions *to be executed on a fixed receiver*
// by having this classes we can make typescript help with type-checking and code suggestions
//
const DEFAULT_GAS = "200" + "0".repeat(12);
export class BatchTransaction {
    constructor(receiver) {
        this.receiver = receiver;
        this.items = [];
    }
    addItem(item) {
        this.items.push(item);
    }
}
export class BatchAction {
    constructor(action, attached = "0") {
        this.action = action;
        this.attached = attached;
    }
}
export class FunctionCall extends BatchAction {
    constructor(method, args, gas, attached) {
        super("call", attached);
        this.method = method;
        this.args = args;
        this.gas = gas || DEFAULT_GAS;
    }
}
export class Transfer extends BatchAction {
    constructor(attached) {
        super("transfer", attached);
    }
}
export class DeleteAccountToBeneficiary extends BatchAction {
    constructor(beneficiaryAccountId) {
        super("delete");
        this.beneficiaryAccountId = beneficiaryAccountId;
    }
}
