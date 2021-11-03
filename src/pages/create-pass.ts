import { askBackground, askBackgroundGetState } from "../background/askBackground.js"
import { SINGLE_USER_EMAIL } from "../index.js"
import * as d from "../util/document.js"

const PASS = "pass"
const PASS_CONFIRM = "pass-confirm"
const AGREE_CHECK = "agree-check"
const CREATE_USER = "create-user"
const IMPORT_OR_CREATE = "import-or-create"

function agreeCheckboxClicked(ev: Event) {
  //enable create button when terms accepted
  //const chkBox = ev.target as HTMLInputElement
  //d.inputById(CREATE_USER).disabled = !chkBox.checked;
}

async function createClicked(ev: Event) {
  try {
    ev.preventDefault();

    // commented: remove functionality for more than one user per wallet, does not make sense. 
    // users are handled at the OS level
    const email = SINGLE_USER_EMAIL; //d.inputById("email").value;
    const password = d.inputById(PASS).value;
    const confirm = d.inputById(PASS_CONFIRM).value;
    const agree = d.inputById(AGREE_CHECK);
    if (!confirm || confirm != password) {
      throw Error("Passwords don't match")
    }
    else if (!agree.checked) {
      throw Error("Please agree to the Terms of Use")
    }

    //validate email,pwd,duplicates & Create SecureState store hashedPass
    const state = await askBackgroundGetState()
    await askBackground({ code: "create-user", email: email, password: password })

    d.showPage(IMPORT_OR_CREATE);

  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

// on document load
export function addListeners() {

  d.onClickId(AGREE_CHECK, agreeCheckboxClicked);
  d.onClickId(CREATE_USER, createClicked);

}
