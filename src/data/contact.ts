export class GContact {
  accountId: string = "";
  note: string = "";

  constructor(name: string, note: string) {
    this.accountId = name;
    this.note = note;
  }
}
