const ADDRESS_BOOK = "addressBook";
import {
  askBackground,
  askBackgroundAddContact,
  askBackgroundAllAddressContact,
  askBackgroundAllNetworkAccounts,
} from "../askBackground.js";
import { contactPlusNote, GContact } from "../data/contact.js";

import { D } from "../lib/tweetnacl/core/core.js";
import * as d from "../util/document.js";
import {
  disableOKCancel,
  enableOKCancel,
  hideOkCancel,
  OkCancelInit,
  showOKCancel,
} from "../util/okCancel.js";
import {
  selectedAccountData,
  show as AccountSelectedPage_show,
} from "./account-selected.js";
import { checkIfAccountExists } from "../util/search-accounts.js";
import type { PopupItem } from "../util/popup-list.js";
import {show as Main_show} from "./main.js";

export let addressContacts: GContact[] = [];
let selectedContactIndex: number = NaN;

export async function getAccountsForPopupList(except?: string, added?: Record<string, boolean>): Promise<PopupItem[]> {
  // add all wallet accounts
  const walletAccounts = await askBackgroundAllNetworkAccounts();
  let items = []
  for (let key in walletAccounts) {
    if ((added && added[key]) || (except && key == except)) continue;
    let title = key
    if (walletAccounts[key].note) title += " (" + walletAccounts[key].note + ")"
    items.push({ text: title, value: key, order: walletAccounts[key].order })
  }
  return items
}

export async function getAddressesForPopupList(except?: string): Promise<PopupItem[]> {
  if (addressContacts.length == 0) await initAddressArr();
  let items = []
  let added: Record<string, boolean> = {}
  for (let item of addressContacts) {
    if (!except || item.accountId != except) {
      items.push({ text: contactPlusNote(item), value: item.accountId })
      added[item.accountId] = true
    }
  }
  // add also all wallet accounts
  const walletAccounts = await getAccountsForPopupList(except, added);
  return items.concat(walletAccounts)
}

export async function show() {
  addressContacts = [];
  d.onClickId("add-contact", showAddContactPage);
  d.onClickId("remove-contact", deleteContact);
  d.onClickId("edit-contact", editContact);
  d.onClickId("back-to-addressBook", backToAddressBook);
  OkCancelInit();
  hideOkCancel();
  d.clearContainer("address-list");

  await initAddressArr();

  showInitial();
}
export async function initAddressArr() {
  const addressRecord = await askBackgroundAllAddressContact();
  for (let key in addressRecord) {
    addressContacts.push(new GContact(key, addressRecord[key].note));
  }
}

function backToAddressBook() {
  showInitial();
}

function showAddContactPage() {
  d.showPage("add-addressBook");
  showOKCancel(addOKClicked, showInitial);
}

function showInitial() {
  d.clearContainer("address-list");
  const TEMPLATE = `
    <div class="address-item" id="{key}">
    <div class="accountlistitem">
      <div class="addresslistname">{accountId}</div>
      <div class="addresslistcomment">{note}</div>
    </div>
  </div>
  `;
  d.populateUL("address-list", TEMPLATE, addressContacts);
  document.querySelectorAll("#address-list .address-item").forEach((item) => {
    item.addEventListener("click", showAddressDetails);
  });
  d.onClickId("address-back-to-account", backToAccountsClicked);
  d.showPage(ADDRESS_BOOK);
  d.showSubPage("main-contact");
}

function backToAccountsClicked() {
  if (selectedAccountData && selectedAccountData.name != "") {
    AccountSelectedPage_show(selectedAccountData.name, undefined);
  } else {
    hideOkCancel();
    Main_show();
  }
}

async function addOKClicked() {
  try {
    const addressToSave = new d.El("#add-addressBook-id").value.trim();

    // check if the account exists on the current network
    let existAccount = await checkIfAccountExists(addressToSave);
    if (!existAccount) {
      throw Error("Account ID does not exists on the network");
    }
    const noteToSave = new d.El("#add-addressBook-note").value;

    const contactToSave: GContact = {
      accountId: addressToSave,
      note: noteToSave,
    };

    await saveContactOnBook(addressToSave, contactToSave);

    hideOkCancel();
    showInitial();
  } catch (ex) {
    d.showErr(ex);
  }
}

export async function saveContactOnBook(
  name: string,
  contact: GContact
): Promise<any> {
  if (contactInAddressBook(name)) {
    throw Error("Address already saved");
  }
  addressContacts.push(contact);
  return askBackgroundAddContact(name, contact);
}

function showAddressDetails(ev: Event) {
  d.clearContainer("selected-contact");
  if (ev.target && ev.target instanceof HTMLElement) {
    const li = ev.target.closest("li");
    if (li) {
      const index = Number(li.id);
      if (isNaN(index)) return;
      let contact: GContact = addressContacts[index];
      const TEMPLATE = `
      <div id="selected-contact-template" class="addressBook">
			  <h1>{accountId}<h1>
					<h3>{note}<h3>
		  </div>
      `;
      d.appendTemplateLI(
        "selected-contact",
        TEMPLATE,
        contact
      );
      selectedContactIndex = index;
    }
  }
  d.byId("bottomBar-addressBook").classList.remove("hidden");
  d.showPage("addressBook-details");
}

function deleteContact() {
  if (isNaN(selectedContactIndex)) return;
  d.byId("bottomBar-addressBook").classList.add("hidden");
  d.showSubPage("contact-remove-selected");
  showOKCancel(okDeleteContact, showInitial);
}

async function okDeleteContact() {
  await askBackground({
    code: "remove-address",
    accountId: addressContacts[selectedContactIndex].accountId,
  });
  addressContacts.splice(selectedContactIndex, 1);
  showInitial();
  hideOkCancel();
}

function editContact() {
  d.byId("bottomBar-addressBook").classList.add("hidden");
  d.showSubPage("contact-edit-selected");
  d.inputById("edit-note-contact").value =
    addressContacts[selectedContactIndex].note || "";
  showOKCancel(addNoteOKClicked, showInitial);
}

async function addNoteOKClicked() {
  addressContacts[selectedContactIndex].note = d
    .inputById("edit-note-contact")
    .value.trim();

  // Save
  await askBackground({
    code: "set-address-book",
    accountId: addressContacts[selectedContactIndex].accountId,
    contact: addressContacts[selectedContactIndex],
  });
  showInitial();
  hideOkCancel();
}

export function contactInAddressBook(address: string): boolean {
  let name = address.trim()
  for (let contact of addressContacts) {
    if (contact.accountId == name) {
      return true;
    }
  };
  return false;
}

export async function contactExists(address: string): Promise<boolean> {
  if (contactInAddressBook(address)) return true;
  // check in the wallet
  const networkAccounts = await askBackgroundAllNetworkAccounts();
  if (!networkAccounts) return false;
  if (!networkAccounts[address.trim()]) return false;
  return true;
}
