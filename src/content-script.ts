
// interface CreateAccountAction {
//   type: "CreateAccount";
// }

// interface DeployContractAction {
//   type: "DeployContract";
//   params: {
//     code: Uint8Array;
//   };
// }

// interface FunctionCallAction {
//   type: "FunctionCall";
//   params: {
//     methodName: string;
//     args: object;
//     gas: string;
//     deposit: string;
//   };
// }

// interface TransferAction {
//   type: "Transfer";
//   params: {
//     deposit: string;
//   };
// }

// interface StakeAction {
//   type: "Stake";
//   params: {
//     stake: string;
//     publicKey: string;
//   };
// }

// type AddKeyPermission =
//   | "FullAccess"
//   | {
//       receiverId: string;
//       allowance?: string;
//       methodNames?: Array<string>;
//     };

// interface AddKeyAction {
//   type: "AddKey";
//   params: {
//     publicKey: string;
//     accessKey: {
//       nonce?: number;
//       permission: AddKeyPermission;
//     };
//   };
// }

// interface DeleteKeyAction {
//   type: "DeleteKey";
//   params: {
//     publicKey: string;
//   };
// }

// interface DeleteAccountAction {
//   type: "DeleteAccount";
//   params: {
//     beneficiaryId: string;
//   };
// }

// type Action =
//   | CreateAccountAction
//   | DeployContractAction
//   | FunctionCallAction
//   | TransferAction
//   | StakeAction
//   | AddKeyAction
//   | DeleteKeyAction
//   | DeleteAccountAction;

// type ActionType = Action["type"];

// interface Transaction {
//   signerId: string;
//   receiverId: string;
//   actions: Array<Action>;
// }


// Received message from wallet selector
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source != window) {
    return;
  }

  if (event.data.type && (event.data.type == "nw") && event.data.dest == "ext") {
    console.log("Content script received for ext: " + JSON.stringify(event.data));
    // Sending message to narwallets extension
    return chrome.runtime.sendMessage(event.data, function (response) {
      console.log("Posting message for page with response ", response)
      // Send response to wallet-selector on callback
      window.postMessage(
        {
          type: "nw",
          dest: "page",
          result: response
        }
      )
    });
  } 
}, true);
