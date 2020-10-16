import * as d from "../common+ts.js"
import * as global from "../global+ts.js"

const AGREE_CHECK="agree-check"
const PASSW_INPUT = "passw"
const PASSW_CONFIRM = "passw-confirm"

function agreeCheckboxClicked(ev /*:Event*/) {
  //enable create button when terms accepted
  const chkBox = ev.target /*+as HTMLInputElement+*/
  d.textById(d.CREATE).disabled=!chkBox.checked;
}

function createClicked(ev /*:Event*/) {
  ev.preventDefault();
  const password=d.textById(PASSW_INPUT).value;
  const confirm=d.textById(PASSW_CONFIRM).value;
  let err;
  if (!password || password.length<6 ) {
    err="password must be at least 6 characters long"
  }
  else if (!confirm || confirm!=password ) {
    err="passwords don't match"
  }
  if (err) {
    d.showErr(err);
    return;
  }
  //Create SecureState store passHash
  global.createSecureState(password);
  window.location.href=chrome.runtime.getURL('setup/import-or-create.html'); //navigate to add-account-page
  //showPage(WELCOME_NEW_USER_PAGE)
}

// on document load
document.addEventListener('DOMContentLoaded', () => {
  
  d.byId(AGREE_CHECK).addEventListener(d.CLICK, agreeCheckboxClicked);
  d.byId(d.CREATE).addEventListener(d.CLICK, createClicked);

});
