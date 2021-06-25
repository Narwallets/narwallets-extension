const ADDRESS_BOOK = "addressbook";
import {
  askBackgroundAddContact,
  askBackgroundAllAddressContact,
} from "../background/askBackground.js";
import { GContact } from "../data/Contact.js";
import { D } from "../lib/tweetnacl/core/core.js";
import * as d from "../util/document.js";
import {
  disableOKCancel,
  enableOKCancel,
  hideOkCancel,
  OkCancelInit,
  showOKCancel,
} from "../util/okCancel.js";

let addressContacts: GContact[] = [];
let selectedContactIndex: number = NaN;

export async function show() {
  addressContacts = [];
  d.onClickId("add-contact", showAddContactPage);
  d.onClickId("addressbook", showAddressDetails);
  d.onClickId("remove-contact", deleteContact);
  d.onClickId("edit-contact", editContact);
  OkCancelInit();
  d.clearContainer("address-list");

  const addressRecord = await askBackgroundAllAddressContact();

  for (let key in addressRecord) {
    addressContacts.push(new GContact(key, addressRecord[key].note));
  }

  showInitial();
}

function showAddContactPage() {
  d.showPage("add-addressbook");
  showOKCancel(addOKClicked, showInitial);
}

function showInitial() {
  d.clearContainer("address-list");
  d.populateUL("address-list", "address-item-template", addressContacts);

  d.showPage(ADDRESS_BOOK);
  d.showSubPage("main-contact");
}

async function addOKClicked() {
  try {
    console.log(addressContacts);

    const addressToSave = new d.El("#add-addresbook-id").value;
    const noteToSave = new d.El("#add-addresbook-note").value;

    const contactToSave: GContact = {
      accountId: addressToSave,
      note: noteToSave,
    };

    addressContacts.forEach((address) => {
      if (address.accountId == addressToSave) {
        throw Error("Address already saved");
      }
    });
    addressContacts.push(contactToSave);
    await saveContactOnBook(addressToSave, contactToSave);

    hideOkCancel();
    showInitial();
    d.showSuccess("Contact added correctly");
  } catch (ex) {
    d.showErr(ex);
  }
}

async function saveContactOnBook(
  name: string,
  contact: GContact
): Promise<any> {
  return askBackgroundAddContact(name, contact);
}

function showAddressDetails(ev: Event) {
  d.showPage("addressbook-details");
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
}

function deleteContact() {
  if (isNaN(selectedContactIndex)) return;
  d.showSubPage("contact-remove-selected");
  showOKCancel(okDeleteContact, showInitial);
}

function okDeleteContact() {
  addressContacts.splice(selectedContactIndex, 1);

  //Guardo
  //TODO
  showInitial();
  hideOkCancel();
}

function editContact() {
  d.showSubPage("contact-edit-selected");
  d.inputById("edit-note-contact").value =
    addressContacts[selectedContactIndex].note || "";
  showOKCancel(addNoteOKClicked, showInitial);
}

function addNoteOKClicked() {
  addressContacts[selectedContactIndex].note = d
    .inputById("edit-note-contact")
    .value.trim();

  //Guardo
  //TODO
  showInitial();
  hideOkCancel();
}
