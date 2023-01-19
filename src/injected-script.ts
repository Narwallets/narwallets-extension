declare type BlockHash = string;
declare type BlockHeight = number;
declare type BlockId = BlockHash | BlockHeight;
declare type Finality = 'optimistic' | 'near-final' | 'final';
declare type BlockReference = {
    blockId: BlockId;
} | {
    finality: Finality;
} | {
    sync_checkpoint: 'genesis' | 'earliest_available';
};
declare enum ExecutionStatusBasic {
    Unknown = "Unknown",
    Pending = "Pending",
    Failure = "Failure"
}
interface ExecutionStatus {
    SuccessValue?: string;
    SuccessReceiptId?: string;
    Failure?: ExecutionError;
}
declare enum FinalExecutionStatusBasic {
    NotStarted = "NotStarted",
    Started = "Started",
    Failure = "Failure"
}
interface ExecutionError {
    error_message: string;
    error_type: string;
}
interface FinalExecutionStatus {
    SuccessValue?: string;
    Failure?: ExecutionError;
}
interface ExecutionOutcomeWithId {
    id: string;
    outcome: ExecutionOutcome;
}
interface ExecutionOutcome {
    logs: string[];
    receipt_ids: string[];
    gas_burnt: number;
    status: ExecutionStatus | ExecutionStatusBasic;
}
interface FinalExecutionOutcome {
    status: FinalExecutionStatus | FinalExecutionStatusBasic;
    transaction: any;
    transaction_outcome: ExecutionOutcomeWithId;
    receipts_outcome: ExecutionOutcomeWithId[];
}

// From https://github.com/near/NEPs/blob/master/specs/Standards/Wallets/InjectedWallets.md
/************* Start extracted from near-api-js **************/

declare class FunctionCallPermission {
    allowance?: BigInt;
    receiverId: string;
    methodNames: string[];
}
declare abstract class Enum {
    enum: string;
    constructor(properties: any);
}

declare class FunctionCall {
    methodName: string;
    args: Uint8Array;
    gas: BigInt;
    deposit: BigInt;
}
declare class Action extends Enum {
    // createAccount: CreateAccount;
    // deployContract: DeployContract;
    functionCall: FunctionCall;
    // transfer: Transfer;
    // stake: Stake;
    // addKey: AddKey;
    // deleteKey: DeleteKey;
    // deleteAccount: DeleteAccount;
}

declare class SignedTransaction {
    transaction: Transaction;
    signature: Signature;
    encode(): Uint8Array;
    static decode(bytes: any): SignedTransaction; // Bytes is supposed to be Buffer
}

declare class Transaction {
    signerId: string;
    publicKey: PublicKey;
    nonce: BigInt;
    receiverId: string;
    actions: Action[];
    blockHash: Uint8Array;
    encode(): Uint8Array;
    static decode(bytes: any): Transaction; // Bytes is supposed to be Buffer
}

declare class Signature {
    keyType: KeyType;
    data: Uint8Array;
}

declare class PublicKey {
    keyType: KeyType;
    data: Uint8Array;
    static from(value: string | PublicKey): PublicKey;
    static fromString(encodedKey: string): PublicKey;
    toString(): string;
    verify(message: Uint8Array, signature: Uint8Array): boolean;
}

/************* Finish extracted from near-api-js **************/
interface Account {
    accountId: string;
    publicKey: PublicKey;
}

interface Network {
    networkId: string;
    nodeUrl: string;
}

// Extracted from near-api-js


interface SignInParams {
    permission: FunctionCallPermission;
    accounts: Array<Account>;
}

interface SignOutParams {
    accounts: Array<Account>;
}

interface TransactionOptions {
    receiverId: string;
    actions: Array<Action>;
    signerId?: string;
}

interface SignTransactionParams {
    transaction: TransactionOptions;
}

interface SignTransactionsParams {
    transactions: Array<TransactionOptions>;
}

interface Events {
    accountsChanged: { accounts: Array<Account> };
}

interface ConnectParams {
    networkId: string;
}

type Unsubscribe = () => void;

const DEFAULT_NETWORK = {
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.near.org"
}

interface Wallet {
    id: string;
    connected: boolean;
    network: Network;
    accounts: Array<Account>;

    supportsNetwork(networkId: string): Promise<boolean>;
    connect(params: ConnectParams): Promise<Array<Account>>;
    signIn(params: SignInParams): Promise<void>;
    signOut(params: SignOutParams): Promise<void>;
    signTransaction(params: SignTransactionParams): Promise<SignedTransaction>;
    signTransactions(params: SignTransactionsParams): Promise<Array<SignedTransaction>>;
    disconnect(): Promise<void>;
    on<EventName extends keyof Events>(
        event: EventName,
        callback: (params: Events[EventName]) => void
    ): Unsubscribe;
    off<EventName extends keyof Events>(
        event: EventName,
        callback?: () => void
    ): void;
}

async function script() {
    window.narwallets = {
        id: "Narwallets",
        connected: false,
        network: DEFAULT_NETWORK,
        accounts: [],
        supportsNetwork,
        connect,
        signIn,
        signOut,
        signTransaction,
        signTransactions,
        disconnect,
        on,
        off
    }

    await initialize()
}

async function supportsNetwork(networkId: string): Promise<boolean> {
    return [
        "mainnet",
        "guildnet",
        "testnet",
        "betanet",
        "local"
    ].includes(networkId)
}

/**
 * Request visibility for one or more accounts from the wallet. This should explicitly prompt the user to select from their list of imported accounts. dApps can use the accounts property once connected to retrieve the list of visible accounts.
 * Note: Calling this method when already connected will allow users to modify their selection, triggering the 'accountsChanged' event.
 * @param params 
 * @returns An array with the selected account id (on wallet-selector they want an array in case someone wants to have more accounts to decide)
 */
async function connect(params: ConnectParams): Promise<Array<Account>> {
    const accountResponse: Account = (await sendToNarwallets(NARWALLETS_CODES.CONNECT, false, params)) as Account;
    window.narwallets.accounts.push(accountResponse)
    window.narwallets.connected = true
    return [accountResponse];
}

/**
 * Add FunctionCall access key(s) for one or more accounts. This request should require explicit approval from the user.
 * https://docs.near.org/concepts/basics/accounts/access-keys
 * @param params 
 * @returns 
 */
async function signIn(params: SignInParams): Promise<void> {
    connect({ networkId: window.narwallets.network.networkId })
}

/**
 * Delete FunctionCall access key(s) for one or more accounts. This request should require explicit approval from the user.
 * Since on Narwallets there will only be one user in accounts, it isn't needed the SignOutParams
 * @param param 
 * @returns 
 */
async function signOut(param?: SignOutParams): Promise<void> {
    if (!(await isSignedIn())) {
        return;
    }

    const res: Resolve = await sendToNarwallets("sign-out");
    // const res = await _state.wallet.signOut();
    if (res === true) {
        window.narwallets.accounts = []
        window.narwallets.connected = false
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

}

/**
 * Requests explicit approval from user to transaction
 * @param params 
 * @returns Type SignedTransaction is not properly defined yet, so FinalExecutionOutcome will be returned
 */
async function signTransaction(params: SignTransactionParams): Promise<SignedTransaction> {
    return sendToNarwallets(
        NARWALLETS_CODES.SIGN_AND_SEND_TRANSACTION,
        false,
        params
    ).then((response: Resolve) => response as SignedTransaction);
}

async function signTransactions(params: SignTransactionsParams): Promise<Array<SignedTransaction>> {
    return sendToNarwallets(
        NARWALLETS_CODES.SIGN_AND_SEND_TRANSACTIONS,
        false,
        params
    ).then((response: Resolve) => response as SignedTransaction[]);
}

async function disconnect(): Promise<void> {
    signOut()
}

/**
 * Triggered whenever accounts are updated (e.g. calling connect or disconnect).
 * Documentation only explicitly says to have an `accountsChanged` event, but it doesn't tell what it has to do
 * @param event 
 * @param callback 
 * @returns 
 */
function on<EventName extends keyof Events>(event: EventName, callback: (params: Events[EventName]) => void): Unsubscribe {
    switch (event) {
        case "accountsChanged":
            return () => { console.log("Not implemented") }
        default:
            return () => { console.log("Not implemented") }
    }

}

/**
 * Not documented at all
 * @param event 
 * @param callback 
 */
function off<EventName extends keyof Events>(event: EventName, callback?: () => void): void {

}

type Resolve =
    | string
    | boolean
    | FinalExecutionOutcome
    | Array<FinalExecutionOutcome>
    | NarwalletsError
    | Network
    | Account
    | SignedTransaction
    | SignedTransaction[];
type NarwalletsFunctionParams =
    | undefined
    | boolean
    | SignTransactionParams
    | SignTransactionsParams
    | SignAndSendTransactionParams
    | Array<SignAndSendTransactionParams>
    | ConnectParams;

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
    timeout?: number;
}

const NARWALLETS_CODES = {
    CONNECT: "connect",
    SIGN_IN: "sign-in",
    IS_INSTALLED: "is-installed",
    IS_SIGNED_IN: "is-signed-in",
    SIGN_OUT: "sign-out",
    GET_ACCOUNT_ID: "get-account-id",
    SIGN_AND_SEND_TRANSACTION: "sign-and-send-transaction",
    SIGN_AND_SEND_TRANSACTIONS: "sign-and-send-transactions",
    GET_NETWORK: "get-network",
    DISCONNECT: "disconnect",
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

async function setNetwork(): Promise<void> {
    let network: Network = await sendToNarwallets(
        NARWALLETS_CODES.GET_NETWORK,
        false
    ) as Network;
    // window.narwallets.network = network
}



const isSignedIn = (): Promise<Resolve> => {
    return sendToNarwallets(NARWALLETS_CODES.IS_SIGNED_IN, true);
};

const getAccountId = async (): Promise<Account[]> => {
    const response = (await sendToNarwallets(NARWALLETS_CODES.GET_ACCOUNT_ID, false)) as string
    return [{ accountId: response, publicKey: PublicKey.from("Add public key") }];
};

const callSignAndSendTransaction = (
    params: SignAndSendTransactionParams
): Promise<FinalExecutionOutcome> => {
    return sendToNarwallets(
        NARWALLETS_CODES.SIGN_AND_SEND_TRANSACTION,
        false,
        params
    ).then((response: Resolve) => response as FinalExecutionOutcome);
};

const callSignAndSendTransactions = (
    params: Array<SignAndSendTransactionParams>
): Promise<FinalExecutionOutcome[]> => {
    return sendToNarwallets(
        NARWALLETS_CODES.SIGN_AND_SEND_TRANSACTIONS,
        false,
        params
    ).then((response: Resolve) => response as FinalExecutionOutcome[]);
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
}

script();



