# Narwallet Chrome Extension 

## Installation

* clone this repository on your machine and:
* open chrome
* enable Extensions Developer Mode
* load unpacked extension from Narwallet-extension/src
* Chrome Dev Tools: Map folder to Narwallet-extension/scr
* Use Chrome Dev Tools as an quick-and-dirty IDE
* Use VSCode as the main IDE
* This project uses [plus-typescript](github.com/luciotato/plus-typescript) so you can modify /src directly from Chrome Dev Tools (no source-maps, no transpiling)

VSCode Configured by: https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-newer-typescript-versions

//.vscode/settings.json
{
    "debug.allowBreakpointsEverywhere": true,
    "typescript.tsdk": "./node_modules/plus-typescript/lib"
}
