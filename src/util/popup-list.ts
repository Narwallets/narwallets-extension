import * as d from "./document.js";

const POPUP_LIST_APPFACE = "popup-list-appface"
const POPUP_LIST = "popup-list"

d.onClickId(POPUP_LIST_APPFACE, closePopupList)

export type PopupItem = { text: string, value: string }

export async function populatePopupList(items: PopupItem[]) {
    var options = "";
    if (items.length == 0) {
        options = `<option value="">-- no data --</option>`
    }
    else for (let item of items) {
        const value = item.value
        const text = item.text.length < 42 ? item.text : item.text.slice(0, 19) + "..." + item.text.slice(-19)
        options += `<option value="${value}">${text}</option>`;
    }
    d.byId(POPUP_LIST).innerHTML = options;
}

export function closePopupList() {
    d.byId(POPUP_LIST).classList.remove(d.OPEN); //hides
    d.byId(POPUP_LIST_APPFACE).classList.remove(d.OPEN); //hides
}

export function popupListOpen(items: PopupItem[], clickHandler: Function) {
    // populate list
    populatePopupList(items);
    // open full body semi-transparent background
    const popupFace = d.byId(POPUP_LIST_APPFACE);
    popupFace.classList.add(d.OPEN);
    // open select box
    const selectionBox = d.byId(POPUP_LIST);
    selectionBox.classList.add(d.OPEN);
    // connect items with click handler
    selectionBox.querySelectorAll("option").forEach((option: Element) => {
        option.addEventListener(d.CLICK, (ev: Event) => {
            let target = ev.target as HTMLOptionElement
            clickHandler(target.innerHTML, target.value)
            closePopupList()
        });
    });
}


