import * as d from "../util/document.js"
import { askBackgroundGetNetworkInfo } from "../api/askBackground.js";


const IMPORT_ACCOUNT ="import-account"

async function createAccountClicked(ev /*:Event*/) {
  const netInfo = await askBackgroundGetNetworkInfo()
  chrome.windows.create({
        url: netInfo.NearWebWalletUrl,
        state: "maximized"
    });
}

function importAccountClicked(ev /*:Event*/) {
  d.showPage(IMPORT_ACCOUNT)
}

// on document load
export function addListeners() {
  
  
  d.onClickId("option-import", importAccountClicked);
  d.onClickId("option-create", createAccountClicked);

}
