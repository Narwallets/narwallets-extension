import * as d from "../util/document.js";
import { askBackgroundGetNetworkInfo, askBackgroundSetAccount } from "../api/askBackground.js";
import { KeyPairEd25519 } from "../api/utils/key-pair.js";
import { show as AccountPage_show, showPrivateKeyClicked } from "./account-selected.js";
import { bufferToHex } from "../api/near-rpc.js";
import { Account } from "../api/account.js";
const IMPORT_ACCOUNT = "import-account";
async function createAccountClicked(ev) {
    const netInfo = await askBackgroundGetNetworkInfo();
    chrome.windows.create({
        url: netInfo.NearWebWalletUrl + "create",
        state: "maximized"
    });
}
function importAccountClicked(ev) {
    d.showPage(IMPORT_ACCOUNT);
}
async function createImplicitAccountClicked(ev) {
    try {
        const newKey = KeyPairEd25519.fromRandom();
        const accountId = bufferToHex(newKey.getPublicKey().data);
        const accInfo = new Account();
        accInfo.privateKey = newKey.secretKey;
        await askBackgroundSetAccount(accountId, accInfo);
        await AccountPage_show(accountId);
        d.showSuccess("Account " + accountId + " created");
        showPrivateKeyClicked();
    }
    catch (ex) {
        d.showErr(ex.message);
    }
}
// on document load
export function addListeners() {
    d.onClickId("option-import", importAccountClicked);
    d.onClickId("option-create", createAccountClicked);
    d.onClickId("option-create-implicit", createImplicitAccountClicked);
}
//# sourceMappingURL=import-or-create.js.map