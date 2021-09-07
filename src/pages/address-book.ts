const ADDRESS_BOOK = "addressbook";
import {
  askBackground,
  askBackgroundAddContact,
  askBackgroundAllAddressContact,
} from "../background/askBackground.js";
import { GContact } from "../data/Contact.js";
import { saveSecureState } from "../data/global.js";
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

export let addressContacts: GContact[] = [];
let selectedContactIndex: number = NaN;

export function contactExists(address: string): boolean {
  let name = address.trim()
  for (let contact of addressContacts) {
    if (contact.accountId == name) {
      return true;
    }
  };
  return false
}

export async function show() {
  addressContacts = [];
  d.onClickId("add-contact", showAddContactPage);
  d.onClickId("remove-contact", deleteContact);
  d.onClickId("edit-contact", editContact);
  d.onClickId("back-to-addressbook", backToAddressBook);
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
  d.showPage("add-addressbook");
  showOKCancel(addOKClicked, showInitial);
}

function showInitial() {
  d.clearContainer("address-list");
  d.populateUL("address-list", "address-item-template", addressContacts);
  document.querySelectorAll("#address-list .address-item").forEach((item) => {
    item.addEventListener("click", showAddressDetails);
  });
  d.onClickId("address-back-to-account", backToAccountsClicked);
  d.showPage(ADDRESS_BOOK);
  d.showSubPage("main-contact");
}

function backToAccountsClicked() {
  if (selectedAccountData.name != "") {
    AccountSelectedPage_show(selectedAccountData.name, undefined);
  } else {
    d.clearContainer("address-list");
    d.showPage("account-list-main");
    d.showSubPage("assets");
    hideOkCancel();
  }
}

async function addOKClicked() {
  try {
    const addressToSave = new d.El("#add-addresbook-id").value.trim();

    // check if the account exists on the current network
    let existAccount = await checkIfAccountExists(addressToSave);
    if (!existAccount) {
      throw Error("Account ID does not exists on the network");
    }
    const noteToSave = new d.El("#add-addresbook-note").value;

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
  if (contactExists(name)) {
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
      d.appendTemplateLI(
        "selected-contact",
        "selected-contact-template",
        contact
      );
      selectedContactIndex = index;
    }
  }
  d.byId("bottombar-addressbook").classList.remove("hidden");
  d.showPage("addressbook-details");
}

function deleteContact() {
  if (isNaN(selectedContactIndex)) return;
  d.byId("bottombar-addressbook").classList.add("hidden");
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
  d.byId("bottombar-addressbook").classList.add("hidden");
  d.showSubPage("contact-edit-selected");
  d.inputById("edit-note-contact").value =
    addressContacts[selectedContactIndex].note || "";
  showOKCancel(addNoteOKClicked, showInitial);
}

async function addNoteOKClicked() {
  addressContacts[selectedContactIndex].note = d
    .inputById("edit-note-contact")
    .value.trim();

  //Guardo
  await askBackground({
    code: "set-address-book",
    accountId: addressContacts[selectedContactIndex].accountId,
    contact: addressContacts[selectedContactIndex],
  });
  showInitial();
  hideOkCancel();
}
