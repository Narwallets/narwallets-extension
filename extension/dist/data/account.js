//user NEAR accounts info type
export var AssetTypes;
(function (AssetTypes) {
    AssetTypes["StakingPool"] = "stakingPool";
    AssetTypes["OtherPool"] = "other";
})(AssetTypes || (AssetTypes = {}));
export function assetIsStakingPool(asset) {
    return asset.type === AssetTypes.StakingPool;
}
export class StakingPoolAsset {
    constructor() {
        this.staked = 0; // in the pool & staked
        this.unstaked = 0; // in the pool & unstaked (maybe can withdraw)
        this.rewards = 0; //Stakingpool rewards (initial staking - (staked+unstaked))
        this.type = AssetTypes.StakingPool;
    }
    get contractName() {
        return this.stakingPool
            ? `${this.stakingPool} (${this.stakingPoolPct}%)`
            : "unnamed staking pool";
    }
    get balance() {
        return this.staked + this.unstaked;
    }
}
export class OtherAsset {
    constructor() {
        this.type = AssetTypes.OtherPool;
        this.contractName = "unnamed other asset";
        this.balance = 0;
    }
}
export class Account {
    constructor() {
        this.order = 0;
        this.type = "acc";
        this.note = "";
        this.lastBalance = 0; // native balance from rpc:query/account & near state
        this.lockedOther = 0; //locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}
        this.assets = [];
    }
    get totalInThePool() {
        return this.assets.reduce((acc, asset) => asset.balance + acc, 0);
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
        this.type = this.accountInfo.type;
        this.typeFull = typeFullTranslation[this.accountInfo.type];
        if (this.accountInfo.note) {
            const formattedNote = " (" + this.accountInfo.note + ")";
            this.type += formattedNote;
            this.typeFull += formattedNote;
        }
        this.accessStatus = this.isReadOnly ? "Read Only" : "Full Access";
        this.inThePool = 0;
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
    }
    get isReadOnly() {
        return !this.accountInfo.privateKey;
    }
    get isFullAccess() {
        return !this.isReadOnly;
    }
}
//# sourceMappingURL=account.js.map