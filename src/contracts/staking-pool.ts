import { askBackground } from "../askBackground.js";

export type StakingPoolAccountInfoResult = {
    account_id: string; // '90027aec7944e8e70cf1f86fa255ac18866bb043.lockup.guildnet',
    unstaked_balance: string; //'1166437895078907168093622181',
    staked_balance: string; //'0',
    can_withdraw: boolean; //true
}

// always return StakingPoolAccountInfoResult. A empty one if the pool can't find the account. See: core-contracts/staking-pool
export async function getAccInfo(accountName: string, stakingPool: string): Promise<StakingPoolAccountInfoResult> {
    return askBackground({code:"view", contract:stakingPool, method:"get_account", args:{account_id:accountName}}) as Promise<StakingPoolAccountInfoResult>
}

export async function getFee(stakingPool: string): Promise<number> {
    const rewardFeeFraction = await askBackground({code:"view", contract:stakingPool, method:"get_reward_fee_fraction"})
    return rewardFeeFraction.numerator * 100 / rewardFeeFraction.denominator;
};

