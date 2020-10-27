import * as d from "../util/document.js"

const IMPORT_ACCOUNT ="import-account"

function createAccountClicked(ev /*:Event*/) {
  //d.showPage(CREATE_ACCOUNT)
}

function importAccountClicked(ev /*:Event*/) {
  d.showPage(IMPORT_ACCOUNT)
}

// on document load
export function addListeners() {
  
  
  d.onClickId("option-import", importAccountClicked);
  d.onClickId("option-create", createAccountClicked);

}
