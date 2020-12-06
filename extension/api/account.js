//user NEAR accounts info type
export class Account {
    constructor() {
        this.order = 0;
        this.type = "acc";
        this.note = "";
        this.lastBalance = 0; // native balance from rpc:query/account & near state
        this.staked = 0; // in the pool & staked
        this.unStaked = 0; // in the pool & unstaked (maybe can withdraw)
        this.rewards = 0; //Stakingpool rewards (initial staking - (staked+unstaked))
        this.lockedOther = 0; //locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}
    }
    get totalInThePool() {
        return this.staked + this.unStaked;
    }
}
export class ExtendedAccountData {
    constructor(name, accountInfo) {
        this.name = name;
        this.accountInfo = accountInfo;
        const typeFullTranslation = {
            acc: "Account",
            "lock.c": "Lockup Contract"
        };
        this.type = this.accountInfo.type;
        this.typeFull = typeFullTranslation[this.accountInfo.type];
        if (this.accountInfo.note) {
            const formattedNote = ' (' + this.accountInfo.note + ')';
            this.type += formattedNote;
            this.typeFull += formattedNote;
        }
        this.accessStatus = this.isReadOnly ? "Read Only" : "Full Access";
        if (!this.accountInfo.staked)
            this.accountInfo.staked = 0;
        if (!this.accountInfo.unStaked)
            this.accountInfo.unStaked = 0;
        this.inThePool = this.accountInfo.staked + this.accountInfo.unStaked;
        if (!this.accountInfo.lockedOther)
            this.accountInfo.lockedOther = 0;
        this.unlockedOther = this.accountInfo.lastBalance + this.inThePool - this.accountInfo.lockedOther;
        this.available = this.accountInfo.lastBalance - this.accountInfo.lockedOther;
        if (this.accountInfo.type == "lock.c") {
            this.available = Math.max(0, this.available - 36);
            if (!this.isReadOnly)
                this.accessStatus = "owner";
        }
        this.total = this.accountInfo.lastBalance + this.inThePool;
    }
    get isReadOnly() { return !this.accountInfo.privateKey; }
    get isFullAccess() { return !this.isReadOnly; }
}
//# sourceMappingURL=account.js.map