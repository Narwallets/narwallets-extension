// ONLY STRUCTS & INTERFACES, no imports, no actions

// data managed by background, but that's not encrypted
export type StateStruct = {
  dataVersion: string;
  usersList: string[];
  currentUser: string;
}

export type SecureOptions = {
  autoUnlockSeconds: number;
  advancedMode: boolean;
}

export type ResolvedMessage = {
  dest: "page";
  code: "request-resolved";
  tabId: number;
  requestId: number;
  err?: string
  data?: any
}
