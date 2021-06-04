//user NEAR accounts info type
export class Account {
    constructor() {
        this.order = 0;
        this.type = "acc";
        this.note = "";
        this.lastBalance = 0; // native balance from rpc:query/account & near state
        this.staked = 0; // in the pool & staked
        this.unstaked = 0; // in the pool & unstaked (maybe can withdraw)
        this.rewards = 0; //Stakingpool rewards (initial staking - (staked+unstaked))
        this.lockedOther = 0; //locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}
        this.assets = []; //assets
        this.history = []; //history
    }
    get totalInThePool() {
        return this.staked + this.unstaked;
    }
}
export class Asset {
    constructor() {
        this.spec = "";
        this.url = "";
        this.contractId = "";
        this.balance = 0;
        this.type = "ft";
        this.symbol = "";
        this.history = [];
        this.icon = "";
    }
}
export class History {
    constructor() {
        this.date = new Date();
        this.type = "send";
        this.ammount = "";
    }
}
export class ExtendedAccountData {
    constructor(name, accountInfo) {
        this.name = name;
        this.accountInfo = accountInfo;
        const typeFullTranslation = {
            acc: "Account",
            "lock.c": "Lockup Contract",
        };
        this.accountInfo.assets = accountInfo.assets;
        this.type = this.accountInfo.type;
        this.typeFull = typeFullTranslation[this.accountInfo.type];
        if (this.accountInfo.note) {
            const formattedNote = " (" + this.accountInfo.note + ")";
            this.type += formattedNote;
            this.typeFull += formattedNote;
        }
        this.accessStatus = this.isReadOnly ? "Read Only" : "Full Access";
        if (!this.accountInfo.assets)
            this.accountInfo.assets = [];
        if (!this.accountInfo.staked)
            this.accountInfo.staked = 0;
        if (!this.accountInfo.unstaked)
            this.accountInfo.unstaked = 0;
        this.inThePool = this.accountInfo.staked + this.accountInfo.unstaked;
        if (!this.accountInfo.lockedOther)
            this.accountInfo.lockedOther = 0;
        this.unlockedOther =
            this.accountInfo.lastBalance +
                this.inThePool -
                this.accountInfo.lockedOther;
        this.available =
            this.accountInfo.lastBalance - this.accountInfo.lockedOther;
        if (this.accountInfo.type == "lock.c") {
            this.available = Math.max(0, this.available - 36);
        }
        this.total = this.accountInfo.lastBalance + this.inThePool;
        this.totalUSD = this.total * 4.7;
    }
    get isReadOnly() {
        return !this.accountInfo.privateKey;
    }
    get isFullAccess() {
        return !this.isReadOnly;
    }
}
//# sourceMappingURL=account.js.map