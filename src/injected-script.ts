import { FinalExecutionOutcome } from "./lib/near-api-lite/near-types";
import { Action } from "./lib/near-api-lite/transaction";
import { Account } from "./structs/account-info";


interface NarwalletsWallet {
    id: string
    initialized: boolean
    connected: Function
    network: Network
    accounts: Account[]
    accountsWithPlainPK: Account[]
    signIn: Function
    signOut: Function
    getAccountId: Function
    callSignAndSendTransaction: Function
    callSignAndSendTransactions: Function
}

interface Network {
    networkId: string
    nodeUrl: string
}

declare global {
    interface Window {
        narwallets: NarwalletsWallet;
    }
}

async function script() {
    window.narwallets = {
        id: "Narwallets",
        initialized: false,
        connected: isSignedIn,
        network: {
            networkId: "uninitialized",
            nodeUrl: ""
        },
        accounts: [],
        accountsWithPlainPK: [],
        signIn,
        signOut,
        getAccountId,
        callSignAndSendTransaction,
        callSignAndSendTransactions
    }

    await initialize()
}

type Resolve =
    | string
    | boolean
    | FinalExecutionOutcome
    | Array<FinalExecutionOutcome>
    | NarwalletsError
    | Network;
type NarwalletsFunctionParams =
    | undefined
    | boolean
    | SignAndSendTransactionParams
    | Array<SignAndSendTransactionParams>;

interface SignAndSendTransactionParams {
    signerId?: string;
    receiverId?: string;
    actions: Array<Action>;
}

interface NarwalletsParams {
    iconUrl?: string;
    deprecated?: boolean;
}

interface NarwalletsError {
    error: string | { type: string };
}

interface PendingPromises {
    id_wallet_selector: number;
    code: string;
    resolve: (value: Resolve) => void;
    reject: (reason?: string) => void;
    timeout?: NodeJS.Timeout;
}

const NARWALLETS_CODES = {
    SIGN_IN: "sign-in",
    IS_INSTALLED: "is-installed",
    IS_SIGNED_IN: "is-signed-in",
    SIGN_OUT: "sign-out",
    GET_ACCOUNT_ID: "get-account-id",
    SIGN_AND_SEND_TRANSACTION: "sign-and-send-transaction",
    SIGN_AND_SEND_TRANSACTIONS: "sign-and-send-transactions",
    GET_NETWORK: "get-network",
};

let id = 0;
const pendingPromises: Array<PendingPromises> = [];

const sendToNarwallets = (
    code: string,
    withTimeout = false,
    params?: NarwalletsFunctionParams
): Promise<Resolve> => {
    const promise = new Promise<Resolve>((resolve, reject) => {
        id++;
        let promiseTimeout;
        if (withTimeout) {
            promiseTimeout = setTimeout(() => {
                return reject(Error("timeout"));
            }, 2000);
        }
        pendingPromises.push({
            id_wallet_selector: id,
            code,
            resolve,
            reject,
            timeout: promiseTimeout,
        });

        window.postMessage({
            id,
            src: "page",
            type: "nw",
            code,
            dest: "ext",
            params,
        });
    });
    return promise;
};

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setNetwork(): Promise<void> {
    let network: Network = await sendToNarwallets(
        NARWALLETS_CODES.GET_NETWORK,
        false
    ) as Network;
    window.narwallets.network = network
}

async function signIn() {
    const isUserSignedIn = await isSignedIn();
    console.log("Is signed in", isUserSignedIn)
    let code;
    if (!isUserSignedIn) {
        code = NARWALLETS_CODES.SIGN_IN;
    } else {
        code = NARWALLETS_CODES.GET_ACCOUNT_ID;
    }
    const response = (await sendToNarwallets(code)) as string;
    return [{ accountId: response }];
}

const isSignedIn = (): Promise<Resolve> => {
    return sendToNarwallets(NARWALLETS_CODES.IS_SIGNED_IN, true);
};

const getAccountId = (): Promise<Resolve> => {
    return sendToNarwallets(NARWALLETS_CODES.GET_ACCOUNT_ID, false);
};

const callSignAndSendTransaction = (
    params: SignAndSendTransactionParams
): Promise<Resolve> => {
    return sendToNarwallets(
        NARWALLETS_CODES.SIGN_AND_SEND_TRANSACTION,
        false,
        params
    );
};

const callSignAndSendTransactions = (
    params: Array<SignAndSendTransactionParams>
): Promise<Resolve> => {
    return sendToNarwallets(
        NARWALLETS_CODES.SIGN_AND_SEND_TRANSACTIONS,
        false,
        params
    );
};

const findPendingPromiseById = (
    promiseId: number
): PendingPromises | undefined => {
    return pendingPromises.filter((c) => c.id_wallet_selector === promiseId)[0];
};

const removePendingPromise = (callback: PendingPromises) => {
    const index = pendingPromises.indexOf(callback);
    if (index > -1) {
        // only splice array when item is found
        pendingPromises.splice(index, 1); // 2nd parameter means remove one item only
    }
};

const signOut = async () => {
    if (!(await isSignedIn())) {
        return;
    }

    const res: Resolve = await sendToNarwallets("sign-out");
    // const res = await _state.wallet.signOut();
    if (res === true) {
        return;
    }

    const errorObject: NarwalletsError = res as NarwalletsError;

    const error = new Error(
        typeof errorObject.error === "string"
            ? errorObject.error
            : errorObject.error.type
    );

    // Prevent signing out by throwing.
    if (error.message === "User reject") {
        throw error;
    }

};

window.addEventListener("message", (event) => {
    if (event.source !== window) {
        return;
    }
    const { data } = event;
    // msg should be directed to the page (response from the extension, relayed from the content script)
    if (!data || data.dest !== "page") {
        return;
    }

    if (data.id && data.type === "nw") {
        const pendingPromise = findPendingPromiseById(data.id);
        if (pendingPromise) {
            removePendingPromise(pendingPromise);
            if (pendingPromise.timeout) {
                clearTimeout(pendingPromise.timeout);
            }
            if (!data.result) {
                pendingPromise.reject("result is empty");
            } else if (data.result.err) {
                pendingPromise.reject(data.result.err);
            } else {
                pendingPromise.resolve(data.result.data);
            }
        }
    }
});

async function initialize() {
    await setNetwork()
    window.narwallets.initialized = true

}

console.log("Inj");
script();



