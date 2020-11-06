import * as d from "../util/document.js"
import {options, recoverOptions, saveOptions} from "../data/options.js"
import * as c from "../util/conversions.js"
import * as global from "../data/global.js"



function SaveClicked(ev/*:Event*/){
    ev.preventDefault()
    const checkElem = document.getElementById("advanced") /*+as HTMLInputElement+*/
    options.advanced = checkElem.checked
    saveOptions()
    d.showSuccess("Saved")
}

async function init() {
  
  try {

    await recoverOptions()
    const checkElem = document.getElementById("advanced") /*+as HTMLInputElement+*/
    checkElem.checked = options.advanced

    d.onClickId("save",SaveClicked)

  } 
  catch (ex) {
    d.showErr(ex.message);
  }

}

document.addEventListener('DOMContentLoaded', init);


