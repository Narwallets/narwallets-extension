const ADDRESS_BOOK = "addressbook";
import {
  askBackgroundAddContact,
  askBackgroundAllAddressContact,
} from "../background/askBackground.js";
import { GContact } from "../data/Contact.js";
import * as d from "../util/document.js";
import {
  disableOKCancel,
  enableOKCancel,
  hideOkCancel,
  OkCancelInit,
  showOKCancel,
} from "../util/okCancel.js";

let addressContacts: GContact[] = [];

export async function show() {
  addressContacts = [];
  d.onClickId("add-contact", showAddContactPage);
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
