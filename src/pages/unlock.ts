import * as d from "../util/document.js"
import { askBackground, askBackgroundGetAccessKey, askBackgroundGetState } from "../background/askBackground.js"
import { isValidEmail } from "../lib/near-api-lite/utils/valid.js"
import {show as MainPage_show} from "./main.js"

async function unlockClicked(ev :Event) {

  const emailEl = d.inputById("unlock-email")
  const passEl = d.inputById("unlock-pass")

  const email = emailEl.value
  if (!isValidEmail(email)) {
    d.showErr("Invalid email");
    return;
  }

  const password = passEl.value.trim();
  if (!password) return;
  passEl.value = ""

  try {
    await askBackground({code:"unlockSecureState",email:email, password:password})
    const numAccounts=await askBackground({code:"getNetworkAccountsCount"})
    if (numAccounts == 0) {
      d.showPage("import-or-create"); //auto-add account after unlock
    }
    else {
      await MainPage_show()
    }
  }
  catch (ex) {
    d.showErr(ex.message);
  }

}

export async function show() {
  
  d.onClickId("unlock", unlockClicked);

  d.onEnterKey("unlock-pass", unlockClicked)

  d.showPage("unlock"); //show & clear fields

  const state = await askBackgroundGetState()
  d.inputById("unlock-email").value = state.currentUser;

}
