require("../global.ts")

const AGREE_CHECK="agree-check"
const PASSW_INPUT = "passw"
const PASSW_CONFIRM = "passw-confirm"

function agreeCheckboxClicked(ev /*:Event*/) {
  //enable create button when terms accepted
  //@ts-ignore
  byId(CREATE).disabled=!ev.target.checked;
}

function createClicked(ev /*:Event*/) {
  ev.preventDefault();
  const password=textById(PASSW_INPUT).value;
  const confirm=textById(PASSW_CONFIRM).value;
  let err;
  if (!password || password.length<6 ) {
    err="password must be at least 6 characters long"
  }
  else if (!confirm || confirm!=password ) {
    err="passwords don't match"
  }
  if (err) {
    showErr(err);
    return;
  }
  //Create SecureState store passHash
  createSecureState(password);
  window.location.href=chrome.runtime.getURL('popup/popup.html'); //navigate to main page
  //showPage(WELCOME_NEW_USER_PAGE)
}

// on document load
document.addEventListener('DOMContentLoaded', () => {
  
  byId(AGREE_CHECK).addEventListener(CLICK, agreeCheckboxClicked);
  byId(CREATE).addEventListener(CLICK, createClicked);

});
