import { askBackground, askBackgroundGetState } from "../background/askBackground.js";
import * as d from "../util/document.js";
const EMAIL = "email";
const PASS = "pass";
const PASS_CONFIRM = "pass-confirm";
const AGREE_CHECK = "agree-check";
const CREATE_USER = "create-user";
const IMPORT_OR_CREATE = "import-or-create";
function agreeCheckboxClicked(ev) {
    //enable create button when terms accepted
    //const chkBox = ev.target as HTMLInputElement
    //d.inputById(CREATE_USER).disabled = !chkBox.checked;
}
async function createClicked(ev) {
    try {
        ev.preventDefault();
        const email = d.inputById(EMAIL).value;
        const password = d.inputById(PASS).value;
        const confirm = d.inputById(PASS_CONFIRM).value;
        const agree = d.inputById(AGREE_CHECK);
        const state = await askBackgroundGetState();
        if (!confirm || confirm != password) {
            throw Error("passwords don't match");
        }
        else if (!agree.checked) {
            throw Error("Please agree to the Terms of Use");
        }
        //validate email,pwd,duplicates & Create SecureState store hashedPass
        await askBackground({ code: "create-user", email: email, password: password });
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
