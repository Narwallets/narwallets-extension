import * as d from "../util/document.js"
import * as Network from "../data/Network.js"


const IMPORT_ACCOUNT ="import-account"

function createAccountClicked(ev /*:Event*/) {
    chrome.windows.create({
        url: Network.currentInfo().NearWebWalletUrl,
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
