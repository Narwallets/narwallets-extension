# Narwallet Chrome Extension 

## Beta Test Installation (v0.1)

* clone this repository on your machine and:
* open chrome
* enable Extensions Developer Mode
* load unpacked extension from /Narwallets-extension/src



## Dev Tools (v0.1)

* Chrome Dev Tools: Map folder to Narwallets-extension/scr
* Use Chrome Dev Tools as an quick-and-dirty IDE
* Use VSCode as the main IDE
* This project uses [plus-typescript](github.com/luciotato/plus-typescript) so you can modify /src directly from Chrome Dev Tools (no source-maps, no transpiling)
* This can change in future versions, we will move to standard ts after testing Chrome Dev Tools integration with `tsc -w`

VSCode Configured by: https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-newer-typescript-versions

//.vscode/settings.json
{
    "debug.allowBreakpointsEverywhere": true,
    "typescript.tsdk": "./node_modules/plus-typescript/lib"
}
