import * as d from "../common+ts.js"

function createWalletClicked(ev /*:Event*/) {
  window.location.href=chrome.runtime.getURL('setup/create.html'); //navigate to create wallet page
}

function importWalletClicked(ev /*:Event*/) {
  window.location.href=chrome.runtime.getURL('setup/import.html'); //navigate to import wallet page
}

// on document load
document.addEventListener('DOMContentLoaded', () => {
  
  d.byId(d.CREATE).addEventListener(d.CLICK, createWalletClicked);
  d.byId(d.IMPORT).addEventListener(d.CLICK, importWalletClicked);

});
