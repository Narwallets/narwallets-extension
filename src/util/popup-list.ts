import { getKnownNEP141Contracts, tokenPopupListItemClicked } from "../pages/account-selected.js";
import * as d from "./document.js";

const POPUP_LIST_APPFACE = "popup-list-appface"
const POPUP_LIST = "popup-list"
let popupItemList: PopupItem[];
let originalList: PopupItem[];

let searchString = "";

export type PopupItem = { text: string, value: string }

export function initPopupHandlers() {
    d.onClickId(POPUP_LIST_APPFACE, closePopupList)
}

let popupClickHandler: Function;
let popupEscapeHandler: Function|undefined;

export let popupOpened: boolean = false;

export async function populatePopupList(items: PopupItem[]) {

    if (!popupClickHandler) throw Error("!popupClickHandler");

    var options = "";
    if (items.length == 0) {
        options = `<option value="">-- no data --</option>`
    }
    else for (let item of items) {
        const value = item.value
        const text = item.text.length < 48 ? item.text : item.text.slice(0, 22) + "..." + item.text.slice(-22)
        options += `<option value="${value}">${text}</option>`;
    }

    const selectionBox = d.byId(POPUP_LIST);
    selectionBox.innerHTML = options;

    // connect items with click handler and select one
    if (popupSelectedIndex > items.length - 1) popupSelectedIndex = Math.max(items.length - 1, 0);
    selectionBox.querySelectorAll("option").forEach((option: Element, index: number) => {
        option.addEventListener(d.CLICK, (ev: Event) => {
            let target = ev.target as HTMLOptionElement
            popupClickHandler(target.innerHTML, target.value)
            closePopupList()
        });
        if (index == popupSelectedIndex) {

            option.classList.add("selected")
        }
    });

    document.addEventListener("keydown", onPopupKeyDown);
}

export function closePopupList() {
    const selectionBox = d.byId(POPUP_LIST);
    selectionBox.classList.remove(d.OPEN); //hides
    d.byId(POPUP_LIST_APPFACE).classList.remove(d.OPEN); //hides
    searchString = "";
    d.byId("list-filter").classList.add('hidden')
    document.removeEventListener("keydown", onPopupKeyDown);
    popupOpened = false;
}

function markItemAsSelected() {
    const selectionBox = d.byId(POPUP_LIST);
    const nodeList = selectionBox.querySelectorAll("option")
    nodeList.forEach((option: Element, index: number) => {
        if (index == popupSelectedIndex) option.classList.add("selected"); else option.classList.remove("selected");
    })
}

function onPopupKeyDown(event: KeyboardEvent) {

    // console.log("onPopupKeyDown",popupOpened,JSON.stringify(event))
    event.cancelBubble = true;
    if (event.stopPropagation) event.stopPropagation();
    event.preventDefault();

    //If ESC key, close the popup
    if (event.key === "Escape") {
        closePopupList();
        popupEscapeHandler && popupEscapeHandler()
        return;
    }

    //If Enter key, same as click on selected
    if (event.key === "Enter") {
        const selectionBox = d.byId(POPUP_LIST);
        const target = selectionBox.querySelectorAll("option").item(popupSelectedIndex) as HTMLOptionElement
        popupClickHandler(target.innerHTML, target.value)
        closePopupList()
        return;
    }

    // only backspace or A-Z a-z 0-9 _-.
    if (!(
        event.code == 'Backspace' ||
        event.code == 'ArrowDown' ||
        event.code == 'ArrowUp' ||
        (event.key.length == 1 && /[A-Za-z0-9\_\-\.]/.test(event.key))
    )) {
        return;
    }

    // If backspace, delete last char. Else, add a char 
    if (event.code == 'Backspace') {
        searchString = searchString.slice(0, searchString.length - 1);
        if (searchString.length == 0) {
            d.byId("list-filter").classList.add('hidden');
        }
    }
    else if (event.code == 'ArrowDown') {
        popupSelectedIndex += 1
        if (popupSelectedIndex >= popupItemList.length) popupSelectedIndex = popupItemList.length - 1;
        markItemAsSelected()
    }
    else if (event.code == 'ArrowUp') {
        popupSelectedIndex -= 1
        if (popupSelectedIndex < 0) popupSelectedIndex = 0;
        markItemAsSelected()
    }
    else {
        searchString = searchString + event.key;
        d.byId("list-filter").classList.remove('hidden');
    }

    var foundmatch = [];
    //Search in the itemList a match, and add to foundmatch
    for (let i = 0; i < popupItemList.length; i++) {
        if (popupItemList[i].value.match(searchString.toLowerCase())) {
            foundmatch.push(popupItemList[i]);
        }
    }
    //Edit div with searchstring
    d.byId("list-filter").innerHTML = searchString;

    // re-populate the popup
    if (searchString) {
        populatePopupList(foundmatch);
    }
    else {
        populatePopupList(popupItemList);
    }
}

export let popupSelectedIndex: number = 0;
export function popupListOpen(items: PopupItem[], clickHandler: Function, escapeHandler?:Function) {

    // initial populate list
    popupClickHandler = clickHandler
    popupEscapeHandler = escapeHandler
    populatePopupList(items);
    // open full body semi-transparent background
    const popupFace = d.byId(POPUP_LIST_APPFACE);
    popupFace.classList.add(d.OPEN);
    // open select box
    const selectionBox = d.byId(POPUP_LIST);
    selectionBox.classList.add(d.OPEN);

    popupItemList = items;
    popupOpened = true;
}

/* configure a input + drop-down button */
export function popupComboConfigure(inputId: string, dropDownId: string, dropDownHandler: (ev: Event) => void) {

    if (inputId) {
        d.byId(inputId).addEventListener("keydown", (event: KeyboardEvent) => {
            // console.log("input keyup",popupOpened,JSON.stringify(event))
            if (!popupOpened && (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter")) dropDownHandler(event);
        });
    }
    if (dropDownId) d.onClickId(dropDownId, dropDownHandler)
}