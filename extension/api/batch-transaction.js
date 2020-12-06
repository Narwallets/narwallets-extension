//----------------------
//-- BatchTransaction --
//----------------------
// this classes exists to facilitate the creation of a BatchTransactions
// a BatchTransaction is a series of actions *to be executed on a fixed receiver*
// by having this classes we can make typescript help with type-checking and code suggestions
//
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
    constructor(action, attachedNear = 0) {
        this.action = action;
        this.attachedNear = attachedNear;
    }
}
export class FunctionCall extends BatchAction {
    constructor(method, args, Tgas = 50, attachedNear) {
        super("call", attachedNear);
        this.method = method;
        this.args = args;
        this.Tgas = Tgas;
    }
}
export class Transfer extends BatchAction {
    constructor(attachedNear) {
        super("transfer", attachedNear);
    }
}
export class DeleteAccountToBeneficiary extends BatchAction {
    constructor(beneficiaryAccountId) {
        super("delete");
        this.beneficiaryAccountId = beneficiaryAccountId;
    }
}
//# sourceMappingURL=batch-transaction.js.map