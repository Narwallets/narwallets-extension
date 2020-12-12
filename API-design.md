# Wallet API - DApp connection design

## Vision

Assumptions:
1) We want to support static-server SPA DApps (i.e. can be served from IPFS or siasky). Also I want to not disrupt the SPA state (not leaving the site), that's why this is a chrome/chromium extension wallet

2) Our "model-user" is not an expert. Our user doesn't want to have to acquire deep knowledge of the underlying technologies to use the application. 
For example, even if EIP712 is a huge improvement, in the eyes of our hypothetical user, the before and after of EIP721 are unreadable
![image|690x483](docs/images/EIP712-before-after.png)
<br>*([EIP712 "before and after"](https://ethereum-magicians.org/t/eip-712-eth-signtypeddata-as-a-standard-for-machine-verifiable-and-human-readable-typed-data-signing/397). To read/understand/verify the data in the image on the right, you need way more knowledge our model-users have, so both screens are unreadable to them. Amounts with that many zeroes are confusing and hard to read and they don't know what to do with a unix timestamp. Our users are not necessarilly experts)*

3) This is what we want our users to see when approving transactions: 
![image|507x500](docs/images/narwallets-approve-transaction.png)
<br>*example from DApp-diversifying-staking-pool & narwallet*
<br><br>The info here for the user is: what application is currently connected, what contract the user is going to operate on and what function exactly is going to call, with all the amounts in NEAR (no yoctos, all easy to read amounts), and finally what account is connected and will sign the transaction.


4) We want to ease-up the onboarding of ethereum users. One of the NEAR features more alien to eth users is the fact that an account can have *more than one private key*. We're hiding that functionality. In normal operations, we're asking for the seed phrase or a priv-key (full access) and then sign transactions with that, i.e. the wallet is not adding keys to the user's near account.

## Design

We're using a kind of "dependency inversion". Instead of the DApp having a "login" button or several "login" buttons, one for each supported wallet, **the connection is initiated by the wallet**.

This solves two problems:

1. Multiple extension wallets: If you have multiple wallets installed, **you choose** which wallet you want to use to "connect" to the web page. (Here's an example help page the user is directed to when tries to "login" from the DApp: https://www.narwallets.com/help/connect-to-web-app/. There could be a generic help page for DApps directing how to connect each compatible extension-wallet.)

2. The DApp can be "chain and wallet agnostic". Because the connection is initiated from the wallet *and all access to the chain is made thru the wallet*, it's easier to make a DApp "chain and wallet agnostic"

**All access to the chain is made thru the wallet**

The wallet-SDK is very-light. The Wallet-SDK only has the code required to communicate with an chrome-extension wallet (chrome.runtime.sendMessage, listeners, window.postMessage, marshaling). That's very few lines of code. It **does not** include json-RPC, crypto, BN, BIP-39, ed25519, tweetnacl, sha or any other dependency.

The chrome extension-wallet has all the required dependencies to communicate with the chain, and its job is to sign and boradcast transactions into the chain, *hiding all the complexity from the DApp*.

Because the wallet-SDK is very simple, it could be possible to create a single DApp that works with different blockchains, depending on what extension-wallet you decide to activate to "connect-to-the-web-page". The wallet itself handles all the complexity of tx-signing and broadcasting, and the smart contracts are different for each chain, but because the wallet-SDK is simple and high-level, it could "*theoretically*" be possible to use the same DApp UX code to operate on different chains.

The core Wallet integration API is 200 lines of typescript, and this is all a DApp must include. There's no other dependencies than this one (no tweetnacl,bn,bip39,crypto,sha256). So [this problem](https://github.com/ethereum/web3.js/issues/1178) is avoided for the DApps.

All the complexity of connecting to the chain is handled by the chrome-extension wallet listening on the other side. This represents an advantage for DApps on the download size. Narwallets integration is 200 lines of typescript, while web3.js is 12MB unpacked, and ether.js is 9MB unpacked

*Core Wallet API:*
```typescript
//-----------------------------
//-- SINGLETON WALLET class  --
//-----------------------------
export class Wallet {
    
    _isConnected: boolean =false;
    _accountId: string="";
    _network="mainnet"; //default required network. Users will be required to connect accounts from mainnet
    
    get accountId():string{
        return this._accountId;
    }

    get network(){ return this._network }
    set network(value:string){ this._network = value;}

    // Note: Connection is started from the chrome-extension, so web pages don't get any info before the user decides to "connect"
    // Also pages don't need to create buttons/options to connect to different wallets, as long all wallets connect with Dapp-pages by using this API
    // potentially, a single DApp can be used to operate on multiple chains, since all requests are high-level and go thru the chrome-extension

    get isConnected() {return this._isConnected}
   
    disconnect(){
        console.log("wallet.disconnect") 
        document.dispatchEvent(new CustomEvent("wallet-disconnected"));
        if (this._isConnected) window.postMessage({dest:"ext",code:"disconnect"},"*"); //inform the extension
        this._isConnected = false;
        this._accountId = "";
        
    }

    connectionHelp(){
        window.open("http://www.narwallets.com/help/connect-to-web-app")
    }

    /**
     * isConnected or trhrows "wallet not connected"
     */
    checkConnected() {
        if (!this._isConnected) {
            throw Error("Wallet is not connected. Open the wallet extension and click 'Connect to Web Page'")
        }
    }

    /**
     * Just a single contract "view" call
     */
    async view (contract:string, method:string, args:Record<string,any>):Promise<any>{

        wallet.checkConnected()
        //ask the extension to make the view-call
        const requestPayload={dest:"ext", code:"view", contract:contract, method:method, args:args}
        return backgroundRequest(requestPayload);
    }

    /**
     * A single contract "payable" fn call
     */
    async call(contract:string, method:string, args:Record<string,any>, TGas:number, attachedNEAR:number=0):Promise<any>{
        const bt=new BatchTransaction(contract)
        bt.addItem(new FunctionCall(method,args,TGas,attachedNEAR))
        return this.apply(bt)
    }

    /**
     * ASYNC. Applies/broadcasts a BatchTransaction to the blockchain
     */
    async apply (bt:BatchTransaction):Promise<any>{

        wallet.checkConnected()
        
        //ask the extension to broadcast the transaction
        //register request. Promise will be resolved when the response arrives
        const requestPayload={dest:"ext", code:"apply", tx:bt}
        return backgroundRequest(requestPayload);
    }

    //to add event listeners
    onConnect(handler:EventHandler){
        document.addEventListener<any>("wallet-connected",handler)
    }
    onDisconnect(handler:EventHandler){
        document.addEventListener<any>("wallet-disconnected",handler)
    }
}
//-----------------
// SINGLETON EXPORT
//-----------------
export let wallet = new Wallet();
```
