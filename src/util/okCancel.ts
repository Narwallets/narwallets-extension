import * as d from "./document.js";

export let confirmFunction: (ev: Event) => void = function (ev) {};
export let cancelFunction: (ev: Event) => void = function (ev) {};

let okCancelRow: d.El;
let confirmBtn: d.El;
let cancelBtn: d.El;

export function OkCancelInit() {
  confirmBtn = new d.El("#account-selected-action-confirm");
  cancelBtn = new d.El("#account-selected-action-cancel");
  okCancelRow = new d.El("#ok-cancel-row");

  confirmBtn.onClick(confirmClicked);
  cancelBtn.onClick(cancelClicked);
}

//Aca no ocultamos automaticamente por si hay error.
export function confirmClicked(ev: Event) {
  try {
    if (confirmFunction) confirmFunction(ev);
  } catch (ex) {
    d.showErr(ex.message);
  } finally {
  }
}

export function cancelClicked(ev: Event) {
  try {
    hideOkCancel();
    if (cancelFunction) cancelFunction(ev);
  } catch (ex) {
    unHideOKCancel();
    d.showErr(ex.message);
  } finally {
  }
}

export function showOKCancel(
  OKHandler: d.ClickHandler,
  CancelHandler: d.ClickHandler
) {
  //normalizo funcionalidad
  d.onGlobalKeyPress(OKHandler, d.ENTER);
  cancelBtn.innerText = "Cancel";
  confirmBtn.hidden = false;

  //isMoreOptionsOpen = false;
  confirmFunction = OKHandler;
  cancelFunction = CancelHandler;
  console.log("showOkCancel")
  okCancelRow.show();
  enableOKCancel();
  if (OKHandler === CancelHandler) {
    singleButton();
  }
}

export function disableOKCancel() {
  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
  d.removeGlobalKeyPress();
}
export function enableOKCancel() {
  confirmBtn.disabled = false;
  cancelBtn.disabled = false;
  cancelBtn.hidden = false;
  d.onGlobalKeyPress(confirmFunction, d.ENTER);
}

export function singleButton() {
  cancelBtn.innerText = "Close";
  confirmBtn.hidden = true;
}

export function unHideOKCancel() {
  console.log("unHideOkCancel")
  okCancelRow.hidden = false;
}

export function hideOkCancel() {
  okCancelRow.hidden = true;
  d.removeGlobalKeyPress();
}
