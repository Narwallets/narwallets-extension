# Narwallet Chrome Extension 

## Beta Test Installation (v0.1)

* clone this repository on your machine and:
  * open chrome
  * enable Extensions Developer Mode
  * load unpacked extension from [dir-where-you-cloned]/Narwallets-extension/extension


## Road Map to v0.2
* Integration with DApp - modeled after docs.ethers.io/v5 ? other? new approach?
* Manage Create account (currently redirecting to NEAR Web Wallet)
* Trello Board at https://trello.com/b/SRbigp2g

## Dev Tooling (v0.1)
* This project uses ES2020 modules import/export
* Being a chrome extension, no bundler/minimizer is needed 
* No frameworks are used neither, this is plain ts/javascript

## Dev Flow (v0.1)
* Chrome Dev Tools: Map folder to Narwallets-extension/extension
* Use Chrome Dev Tools as an quick-and-dirty IDE with Edit & Continue
* Use VSCode as the main IDE - Ctrl-Shift-B to build with (plus)typescript
* This project uses [plus-typescript](github.com/luciotato/plus-typescript) so you can modify "sources" directly from Chrome Dev Tools (no source-maps, no transpiling).  This can change in future versions, we migth move to standard ts

## Low-level Technical debt

* Main code is plus-typescript, but /api (light-near-api) is standard typescript. The mix creates confusion

* We're using base libs as a bundle (The ideal solution would be to have typescript versions of each lib and compile to ES2020 modules) 

We need to reduce the bundle's size.

Bundle includes:

* globalThis.Buffer = SafeBuffer.Buffer
* globalThis.BN = BN
* globalThis.bip39 = bip39
* globalThis.pbkdf2 = pbkdf2
* globalThis.createHmacPackage = {createHmac:createHmac} 


## VSCode config tips

VSCode Configured by: https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-newer-typescript-versions

    //.vscode/settings.json
    {
        "debug.allowBreakpointsEverywhere": true,
        "typescript.tsdk": "./node_modules/plus-typescript/lib"
    }
