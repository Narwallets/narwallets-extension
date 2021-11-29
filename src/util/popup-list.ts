import { getKnownNEP141Contracts, tokenPopupListItemClicked } from "../pages/account-selected.js";
import * as d from "./document.js";

const POPUP_LIST_APPFACE = "popup-list-appface"
const POPUP_LIST = "popup-list"
let itemList :PopupItem[];
let originalList :PopupItem[];

let searchString = "";

d.onClickId(POPUP_LIST_APPFACE, closePopupList)

export type PopupItem = { text: string, value: string }

export async function populatePopupList(items: PopupItem[]) {
    var options = "";
    if (items.length == 0) {
        options = `<option value="">-- no data --</option>`
    }
    else for (let item of items) {
        const value = item.value
        const text = item.text.length < 48 ? item.text : item.text.slice(0, 22) + "..." + item.text.slice(-22)
        options += `<option value="${value}">${text}</option>`;
    }
    d.byId(POPUP_LIST).innerHTML = options;
}

export function closePopupList() {
    d.byId(POPUP_LIST).classList.remove(d.OPEN); //hides
    d.byId(POPUP_LIST_APPFACE).classList.remove(d.OPEN); //hides
    searchString = "";
    d.byId("list-filter").classList.add('hidden')
    document.removeEventListener("keydown", callback);
}

const callback = function filterList(event: KeyboardEvent){

    //If ESC key, close the popup
    if (event.key === "Escape") {
        closePopupList();
        event.preventDefault();
        return;
    }

    //If special keys, do nothing
    if(event.key =='Control' || event.key == 'Alt' ||event.key == 'Shift' || event.key == 'Enter' || event.key == 'CapsLock' || event.key == 'Tab')
        return;
    
    
    var foundmatch = [];

    //If backspace, delete last char. Else, add a char 
    if(event.code == 'Backspace'){
    searchString = searchString.slice(0,searchString.length-1);
        if(searchString.length == 0){
            d.byId("list-filter").classList.add('hidden');

        }
    }else{
        searchString = searchString + event.key;
        d.byId("list-filter").classList.remove('hidden');
    }

    //Search in the itemList a match, and add to foundmatch
    for(let i=0; i < itemList.length; i++){
        if(itemList[i].value.match(searchString.toLowerCase())){
         foundmatch.push(itemList[i]);
     }
    }
    //Edit div with searchstring
    d.byId("list-filter").innerHTML = searchString;

    //remove event to prevent duplicated
    document.removeEventListener("keydown", callback);
    
    //populate and relaunch the popup
    if(searchString){
        popupListOpen(itemList, tokenPopupListItemClicked, foundmatch);
    }else{
        popupListOpen(itemList, tokenPopupListItemClicked);

    }
}

export function popupListOpen(items: PopupItem[], clickHandler: Function, filtredItems?: PopupItem[]) {
    
    // populate list
    
    populatePopupList(filtredItems ? filtredItems : items);
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
    itemList = items;
   
    document.addEventListener("keydown", callback);
 
}
