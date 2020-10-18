import * as d from "../common+ts.js"
import * as global from "../global+ts.js"

const AGREE_CHECK="agree-check"
const PASS = "pass"
const PASS_CONFIRM = "pass-confirm"
const CREATE_USER ="create-user"
const ADD_ACCOUNT="add-account"

function agreeCheckboxClicked(ev /*:Event*/) {
  //enable create button when terms accepted
  const chkBox = ev.target /*+as HTMLInputElement+*/
  d.textById(d.CREATE).disabled=!chkBox.checked;
}

function createClicked(ev /*:Event*/) {
  ev.preventDefault();
  const password=d.textById(PASS).value;
  const confirm=d.textById(PASS_CONFIRM).value;
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
  d.showPage(ADD_ACCOUNT);
  //showPage(WELCOME_NEW_USER_PAGE)
}

// on document load
export function addListeners() {
  
  d.onClick(AGREE_CHECK, agreeCheckboxClicked);
  d.onClick(CREATE_USER, createClicked);

}
