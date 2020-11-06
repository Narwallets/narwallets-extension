import * as d from "../util/document.js"
import * as global from "../data/global.js"
import { isValidEmail } from "../util/email.js"

const EMAIL = "email"
const PASS = "pass"
const PASS_CONFIRM = "pass-confirm"
const AGREE_CHECK = "agree-check"
const CREATE_USER = "create-user"
const IMPORT_OR_CREATE = "import-or-create"

function agreeCheckboxClicked(ev /*:Event*/) {
  //enable create button when terms accepted
  //const chkBox = ev.target /*+as HTMLInputElement+*/
  //d.inputById(CREATE_USER).disabled = !chkBox.checked;
}

function createClicked(ev /*:Event*/) {
  try{
  ev.preventDefault();

  const email = d.inputById(EMAIL).value;
  const password = d.inputById(PASS).value;
  const confirm = d.inputById(PASS_CONFIRM).value;
  const agree = d.inputById(AGREE_CHECK);

  let err;
  if (!isValidEmail(email)) {
    err = "Invalid email";
  }
  else if (!password || password.length < 8) {
    err = "password must be at least 8 characters long"
  }
  else if (!confirm || confirm != password) {
    err = "passwords don't match"
  }
  else if (!agree.checked) {
    err = "Please agree to the Terms of Use"
  }
  else if (global.State.usersList.includes(email)){
    err ="User already exists"
  }
  if (err) {
    d.showErr(err);
    return;
  }


  //Create SecureState store hashedPass
  global.State.currentUser=email;
  global.createSecureState(password);

  //save new user in usersList
  global.State.usersList.push(email);
  global.saveState()

  d.showPage(IMPORT_OR_CREATE);

  }
  catch(ex){
    d.showErr(ex.message);
  }
}

// on document load
export function addListeners() {

  d.onClickId(AGREE_CHECK, agreeCheckboxClicked);
  d.onClickId(CREATE_USER, createClicked);

}
