import * as d from "../util/document.js"
import { askBackground, askBackgroundGetAccessKey, askBackgroundGetState } from "../askBackground.js"
import { isValidEmail } from "../lib/near-api-lite/utils/valid.js"
import { show as MainPage_show } from "./main.js"
import { SINGLE_USER_EMAIL } from "../index.js"
import { showPassword } from "../data/local-storage.js"

async function unlockClicked(ev: Event) {
  console.log("Unlock clicked")
  //const emailEl = d.inputById("unlock-email")
  const passEl = d.inputById("unlock-pass")
  const email = SINGLE_USER_EMAIL; //emailEl.value
  // if (!isValidEmail(email)) {
  //   d.showErr("Invalid email");
  //   return;
  // }

  const password = passEl.value.trim();
  if (!password) return;
  passEl.value = ""

  try {
    await askBackground({ code: "unlockSecureState", email: email, password: password })
    const numAccounts = await askBackground({ code: "getNetworkAccountsCount" })
    console.log("Accounts: ", numAccounts)
    if (numAccounts == 0) {
      d.showPage("import-or-create"); //auto-add account after unlock      
    } else {
      const wasCalled = await askBackground({ code: "callGlobalSendResponse" })
      if (!wasCalled) {
        await MainPage_show()
      } else {
        window.close()
      }
    }
  }
  catch (ex) {
    d.showErr(ex.message);
  }

}

export async function show() {
  console.log("Showing unlock page")
  d.onClickId("unlock", unlockClicked);

  d.onEnterKey("unlock-pass", unlockClicked)

  d.showPage("unlock"); //show & clear fields

  const state = await askBackgroundGetState()

  d.onClickId("show-password-login", showPassword);
  //d.inputById("unlock-email").value = state.currentUser;

}
