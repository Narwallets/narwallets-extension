require("../global.ts");

const IMPORT = "import"

function createWalletClicked(ev /*:Event*/) {
  window.location.href=chrome.runtime.getURL('init/create.html'); //navigate to create wallet page
}

function importWalletClicked(ev /*:Event*/) {
  window.location.href=chrome.runtime.getURL('init/import.html'); //navigate to import wallet page
}

// on document load
document.addEventListener('DOMContentLoaded', () => {
  
  byId(CREATE).addEventListener(CLICK, createWalletClicked);
  byId(IMPORT).addEventListener(CLICK, importWalletClicked);

});
