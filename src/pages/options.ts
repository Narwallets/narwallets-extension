const OPTIONS = "options";
import {
  askBackground,
} from "../background/askBackground.js";
import * as Pages from "./main.js";
import { GContact } from "../data/Contact.js";
import * as d from "../util/document.js";

export let addressContacts: GContact[] = [];
let selectedContactIndex: number = NaN;

export async function show() {
  
  d.onClickId("save-settings", saveSecurityOptions);
  d.onClickId("cancel-security-settings", Pages.show);  

  await showInitial();
}
async function saveSecurityOptions(ev: Event) {
    try {
      ev.preventDefault();
      const aulSecs = Number(d.inputById("autolock-seconds-input").value);
      if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds");
  
      await askBackground({
        code: "set-options",
        autoUnlockSeconds: aulSecs,
      });
  
      Pages.show();
      d.showSuccess("Options saved");
    } catch (ex) {
      d.showErr(ex.message);
    }
  }


async function showInitial() {
  d.showPage(OPTIONS);
  const data = await askBackground({ code: "get-options" });
  d.inputById("autolock-seconds-input").value = data.autoUnlockSeconds.toString();
}
