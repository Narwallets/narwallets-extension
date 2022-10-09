import { askBackground, askBackgroundSetAccount, askBackgroundViewMethod } from "../askBackground.js";
import * as c from "../util/conversions.js";
import { TOKEN_DEFAULT_SVG } from "../util/svg_const.js";
import * as StakingPool from "../contracts/staking-pool.js"
import { Asset, setAssetBalanceYoctos } from "../structs/account-info.js";

export async function assetUpdateBalance(asset: Asset, accountId: string): Promise<void> {

    if (asset.type == "stake" || asset.type == "unstake") {
        if (asset.symbol == "UNSTAKED" || asset.symbol == "STAKED") {
            let poolAccInfo = await StakingPool.getAccInfo(
                accountId,
                asset.contractId
            );
            if (asset.symbol == "UNSTAKED") {
                setAssetBalanceYoctos(asset, poolAccInfo.unstaked_balance);
            } else if (asset.symbol == "STAKED") {
                setAssetBalanceYoctos(asset, poolAccInfo.staked_balance);
            }
        }
    }
    else if (asset.type == "ft") {
        if (asset.decimals == undefined) await assetUpdateMetadata(asset);

        let balanceYoctos = await askBackgroundViewMethod(
            asset.contractId, "ft_balance_of", { account_id: accountId }
        );
        setAssetBalanceYoctos(asset, balanceYoctos);
    }

}

export function updateTokenAssetFromMetadata(item: Asset, metaData: any) {
    item.symbol = metaData.symbol;
    item.decimals = metaData.decimals;
    if (metaData.icon?.startsWith("<svg")) {
        item.icon = metaData.icon;
    } else if (metaData.icon?.startsWith("data:image")) {
        item.icon = `<img src="${metaData.icon}">`;
    } else {
        item.icon = TOKEN_DEFAULT_SVG;
    }
    item.url = metaData.reference;
    item.spec = metaData.spec;
}

export async function assetUpdateMetadata(item: Asset): Promise<Asset> {
    let metaData = await askBackgroundViewMethod(item.contractId, "ft_metadata", {});
    updateTokenAssetFromMetadata(item, metaData)
    return item
}

export async function newTokenFromMetadata(contractId: string): Promise<Asset> {
    let item = new Asset(contractId, "ft");
    let metaData = await askBackgroundViewMethod(contractId, "ft_metadata", {});
    updateTokenAssetFromMetadata(item, metaData)
    return item
}


