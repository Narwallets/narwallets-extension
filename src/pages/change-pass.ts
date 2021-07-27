import { askBackground, askBackgroundGetState } from "../background/askBackground.js"
import * as d from "../util/document.js"
import { show as UnlockPage_show } from "./unlock.js";

const CURRENT_PASS = "current-pass";
const PASS = "new-pass"
const PASS_CONFIRM = "new-pass-confirm"
const CHANGE_PASS = "confirm-change-password"
const UNLOCK = "unlock";

async function changeClicked(ev :Event) {
  try {
    ev.preventDefault();


    const currentPassword = d.inputById(CURRENT_PASS).value;
    const password = d.inputById(PASS).value;
    const confirm = d.inputById(PASS_CONFIRM).value;
    
    const state = await askBackgroundGetState()
    try {
        await askBackground({
          code: "unlockSecureState",
          email: state.currentUser,
          password: currentPassword,
        });
      } catch (error) {
        d.showErr(error);
        return;
      }
    if (!confirm || confirm != password) {
      throw Error("passwords don't match")
    }
    
    //validate email,pwd,duplicates & Create SecureState store hashedPass
    await askBackground({code:"change-password", email: state.currentUser, password:password}) 
    d.showSuccess("Password changed succesfully");
    UnlockPage_show();

  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

// on document load
export function addListeners() {

  d.onClickId(CHANGE_PASS, changeClicked);

}