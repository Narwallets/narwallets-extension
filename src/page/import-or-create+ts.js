import * as d from "../common+ts.js"

const IMPORT_ACCOUNT ="import-account"

function createAccountClicked(ev /*:Event*/) {
  //d.showPage(CREATE_ACCOUNT)
}

function importAccountClicked(ev /*:Event*/) {
  d.showPage(IMPORT_ACCOUNT)
}

// on document load
export function addListeners() {
  
  
  d.onClick("option-import", importAccountClicked);
  d.onClick("option-create", createAccountClicked);

}
