import * as sha256 from './sha256.js';

import type {BN} from '../bundled-types/BN';

import { Enum, Assignable } from './utils/enums.js';
import { serialize, deserialize } from './utils/serialize.js';
import { KeyType, CurveAndArrayKey } from './utils/key-pair.js';
import { KeyPair } from './utils/key-pair.js';
//import { Signer } from './signer';

export class FunctionCallPermission extends Assignable {
    allowance?: BN;
    receiverId!: string;
    methodNames!: String[];
}

export class FullAccessPermission extends Assignable {}

export class AccessKeyPermission extends Enum {
    functionCall!: FunctionCallPermission
    fullAccess!: FullAccessPermission
}

export class AccessKey extends Assignable {
    nonce!: number
    permission!: AccessKeyPermission
    
}

export function fullAccessKey(): AccessKey {
    return new AccessKey({ nonce: 0, permission: new AccessKeyPermission({fullAccess: new FullAccessPermission({})}) });
}

export function functionCallAccessKey(receiverId: string, methodNames: String[], allowance?: BN): AccessKey {
    return new AccessKey({ nonce: 0, permission: new AccessKeyPermission({functionCall: new FunctionCallPermission({receiverId, allowance, methodNames})})});
}

export class IAction extends Assignable {}

class CreateAccount extends IAction {}
class DeployContract extends IAction { code!: Uint8Array; }
class FunctionCall extends IAction { methodName!: string; args!: Uint8Array; gas!: BN; deposit!: BN; }
class Transfer extends IAction { deposit!: BN; }
class Stake extends IAction { stake!: BN; publicKey!: CurveAndArrayKey; }
class AddKey extends IAction { publicKey!: CurveAndArrayKey; accessKey!: AccessKey; }
class DeleteKey extends IAction { publicKey!: CurveAndArrayKey; }
class DeleteAccount extends IAction { beneficiaryId!: string; }

export function createAccount(): Action {
    return new Action({createAccount: new CreateAccount({}) });
}

export function deployContract(code: Uint8Array): Action {
    return new Action({ deployContract: new DeployContract({code}) });
}

/**
 * Constructs {@link Action} instance representing contract method call.
 *
 * @param methodName the name of the method to call
 * @param args arguments to pass to method. Can be either plain JS object which gets serialized as JSON automatically
 *  or `Uint8Array` instance which represents bytes passed as is.
 * @param gas max amount of gas that method call can use
 * @param deposit amount of NEAR (in yoctoNEAR) to send together with the call
 */
export function functionCall(methodName: string, args: Uint8Array | object, gas: BN, deposit: BN): Action {
    const anyArgs = args as any;
    const isUint8Array = anyArgs.byteLength !== undefined && anyArgs.byteLength === anyArgs.length;
    const serializedArgs = isUint8Array ? args : Buffer.from(JSON.stringify(args));
    return new Action({functionCall: new FunctionCall({methodName, args: serializedArgs, gas, deposit }) });
}

export function transfer(deposit: BN): Action {
    return new Action({transfer: new Transfer({ deposit }) });
}

export function stake(stake: BN, publicKey: CurveAndArrayKey): Action {
    return new Action({stake: new Stake({ stake, publicKey }) });
}

export function addKey(publicKey: CurveAndArrayKey, accessKey: AccessKey): Action {
    return new Action({addKey: new AddKey({ publicKey, accessKey}) });
}

export function deleteKey(publicKey: CurveAndArrayKey): Action {
    return new Action({deleteKey: new DeleteKey({ publicKey }) });
}

export function deleteAccount(beneficiaryId: string): Action {
    return new Action({deleteAccount: new DeleteAccount({ beneficiaryId }) });
}

export class Signature extends Assignable {
    keyType!: KeyType;
    data!: Uint8Array;
}

export class Transaction extends Assignable {
    signerId!: string;
    publicKey!: CurveAndArrayKey;
    nonce!: number;
    receiverId!: string;
    actions!: Action[];
    blockHash!: Uint8Array;

    encode(): Uint8Array {
        return serialize(SCHEMA, this);
    }

    static decode(bytes: Buffer): Transaction {
        return deserialize(SCHEMA, Transaction, bytes);
    }
}

export class SignedTransaction extends Assignable {
    transaction!: Transaction;
    signature!: Signature;

    encode(): Uint8Array {
        return serialize(SCHEMA, this);
    }

    static decode(bytes: Buffer): SignedTransaction {
        return deserialize(SCHEMA, SignedTransaction, bytes);
    }
}

/**
 * Contains a list of the valid transaction Actions available with this API
 */
export class Action extends Enum {
    createAccount!: CreateAccount;
    deployContract!: DeployContract;
    functionCall!: FunctionCall;
    transfer!: Transfer;
    stake!: Stake;
    addKey!: AddKey;
    deleteKey!: DeleteKey;
    deleteAccount!: DeleteAccount;
}

export const SCHEMA = new Map<Function, any>([
    [Signature, {kind: 'struct', fields: [
        ['keyType', 'u8'],
        ['data', [64]]
    ]}],
    [SignedTransaction, {kind: 'struct', fields: [
        ['transaction', Transaction],
        ['signature', Signature]
    ]}],
    [Transaction, { kind: 'struct', fields: [
        ['signerId', 'string'],
        ['publicKey', CurveAndArrayKey],
        ['nonce', 'u64'],
        ['receiverId', 'string'],
        ['blockHash', [32]],
        ['actions', [Action]]
    ]}],
    [CurveAndArrayKey, { kind: 'struct', fields: [
        ['keyType', 'u8'],
        ['data', [32]]
    ]}],
    [AccessKey, { kind: 'struct', fields: [
        ['nonce', 'u64'],
        ['permission', AccessKeyPermission],
    ]}],
    [AccessKeyPermission, {kind: 'enum', field: 'enum', values: [
        ['functionCall', FunctionCallPermission],
        ['fullAccess', FullAccessPermission],
    ]}],
    [FunctionCallPermission, {kind: 'struct', fields: [
        ['allowance', {kind: 'option', type: 'u128'}],
        ['receiverId', 'string'],
        ['methodNames', ['string']],
    ]}],
    [FullAccessPermission, {kind: 'struct', fields: []}],
    [Action, {kind: 'enum', field: 'enum', values: [
        ['createAccount', CreateAccount],
        ['deployContract', DeployContract],
        ['functionCall', FunctionCall],
        ['transfer', Transfer],
        ['stake', Stake],
        ['addKey', AddKey],
        ['deleteKey', DeleteKey],
        ['deleteAccount', DeleteAccount],
    ]}],
    [CreateAccount, { kind: 'struct', fields: [] }],
    [DeployContract, { kind: 'struct', fields: [
        ['code', ['u8']]
    ]}],
    [FunctionCall, { kind: 'struct', fields: [
        ['methodName', 'string'],
        ['args', ['u8']],
        ['gas', 'u64'],
        ['deposit', 'u128']
    ]}],
    [Transfer, { kind: 'struct', fields: [
        ['deposit', 'u128']
    ]}],
    [Stake, { kind: 'struct', fields: [
        ['stake', 'u128'],
        ['publicKey', CurveAndArrayKey]
    ]}],
    [AddKey, { kind: 'struct', fields: [
        ['publicKey', CurveAndArrayKey],
        ['accessKey', AccessKey]
    ]}],
    [DeleteKey, { kind: 'struct', fields: [
        ['publicKey', CurveAndArrayKey]
    ]}],
    [DeleteAccount, { kind: 'struct', fields: [
        ['beneficiaryId', 'string']
    ]}],
]);

export function createTransaction(signerId: string, publicKey: CurveAndArrayKey, receiverId: string, nonce: number, actions: Action[], blockHash: Uint8Array): Transaction {
    return new Transaction({ signerId, publicKey, nonce, receiverId, actions, blockHash });
}

export class createSignedTransactionResult{
    constructor(
        public hash:Uint8Array,
        public signedTransaction: SignedTransaction
    ){}
}
/**
 * Signs a given transaction from an account with given keys, applied to the given network
 * return HASH and the signed transaction
 * @param transaction The Transaction object to sign
 * @param keyPair The Keypair to sign the txn
 */
export function createHashAndSignedTransaction(transaction: Transaction, keyPair:KeyPair): createSignedTransactionResult {
    const message = serialize(SCHEMA, transaction);
    const hash = new Uint8Array(sha256.hash(message));
    const signature = keyPair.sign(hash) 
    const signedTx = new SignedTransaction({
        transaction,
        signature: new Signature({ keyType: transaction.publicKey.keyType, data: signature.signature })
    });
    return new createSignedTransactionResult(hash, signedTx);
}
/**
 * Signs a given transaction from an account with given keys, applied to the given network
 * @param transaction The Transaction object to sign
 * @param keyPair The Keypair to sign the txn
 */
export function createSignedTransaction(transaction: Transaction, keyPair:KeyPair): SignedTransaction {
    let result = createHashAndSignedTransaction(transaction,keyPair);
    return result.signedTransaction;
}

