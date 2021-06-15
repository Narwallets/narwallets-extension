import * as d from "./document.js";
export let confirmFunction = function (ev) { };
export let cancelFunction = function (ev) { };
let okCancelRow;
let confirmBtn;
let cancelBtn;
export function OkCancelInit() {
    confirmBtn = new d.El("#account-selected-action-confirm");
    cancelBtn = new d.El("#account-selected-action-cancel");
    okCancelRow = new d.El("#ok-cancel-row");
    confirmBtn.onClick(confirmClicked);
    cancelBtn.onClick(cancelClicked);
}
export function confirmClicked(ev) {
    try {
        if (confirmFunction)
            confirmFunction(ev);
        hideOkCancel();
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
    }
}
export function cancelClicked(ev) {
    try {
        if (cancelFunction)
            cancelFunction(ev);
        hideOkCancel();
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
    }
}
export function showOKCancel(OKHandler, CancelHandler) {
    //normalizo funcionalidad
    cancelBtn.innerText = "Cancel";
    confirmBtn.hidden = false;
    //isMoreOptionsOpen = false;
    confirmFunction = OKHandler;
    cancelFunction = CancelHandler;
    okCancelRow.show();
    enableOKCancel();
    if (OKHandler === CancelHandler) {
        singleButton();
    }
}
export function disableOKCancel() {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
}
export function enableOKCancel() {
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    cancelBtn.hidden = false;
}
export function singleButton() {
    cancelBtn.innerText = "Close";
    confirmBtn.hidden = true;
}
export function hideOkCancel() {
    okCancelRow.hidden = true;
}
//# sourceMappingURL=okCancel.js.map