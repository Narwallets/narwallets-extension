import { askBackground } from "./askBackground.js";
// always return StakingPoolAccountInfoResult. A empty one if the pool can't find the account. See: core-contracts/staking-pool
export async function getAccInfo(accountName, stakingPool) {
    return askBackground({ code: "view", contract: stakingPool, method: "get_account", args: { account_id: accountName } });
}
export async function getFee(stakingPool) {
    const rewardFeeFraction = await askBackground({ code: "view", contract: stakingPool, method: "get_reward_fee_fraction" });
    return rewardFeeFraction.numerator * 100 / rewardFeeFraction.denominator;
}
;
//# sourceMappingURL=staking-pool.js.map