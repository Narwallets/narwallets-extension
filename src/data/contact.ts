export class GContact {
  accountId: string = "";
  note: string = "";

  constructor(name: string, note: string) {
    this.accountId = name;
    this.note = note;
  }
}

// separated and not as a method so it can be used on a POJO
// all items are POJOs once deserialized with JSON.parse
export function contactPlusNote(c: GContact) {
  if (!c.note) return c.accountId;
  return c.accountId + " (" + c.note + ")";
}