//--- DOCUMENT UTILITIES ---
import * as c from "./conversions.js"

/*+
export type ClickHandler = (()=>void) | ((ev:Event)=>void) |  ((ev:Event)=>Promise<void>) | (()=>Promise<void>) 

+*/

//events
export const CLICK = "click"
export const INPUT = "input"
//actions
export const OPEN = "open"
export const CREATE = "create"
export const IMPORT = "import"
//classes
export const HIDDEN = "hidden"
//elem-id
export const ERR_DIV = "err-div"
export const WAIT = "wait"

export const IUOP = "Invalid user or password"

let numberFormatFunction = function(num/*:number*/,key/*:string*/){
  if (key.endsWith("Pct")) return num.toString();
  return c.toStringDec(num);
}
//export function setNumberFormatFunction

//----js simple independent utility FUNCTIONS  -------
// add property get Object.isEmpty --> returns true if the object is {}
Object.defineProperty(Object.prototype, 'isEmpty', {
  get() {
    for (var p in this) {
      if (this.hasOwnProperty(p)) { return false }
    }
    return true;
  }
})
/*+
declare global {
  interface Object {
    isEmpty:boolean;
  }
}
+*/


//----DOM COMMON simple independent utility FUNCTIONS  -------
/**
 * wrapper around document.getElementById -> HTMLElement
 * @param id 
 */
export function byId(id/*:string*/)/*:HTMLElement*/ {
  try {
    return document.getElementById(id) /*+as HTMLElement+*/
  }
  catch {
    return new HTMLElement();
  }
}

export function onClickId(id/*:string*/, clickHandler/*:(ev:Event)=>void*/) {
  try {
    let elems = document.querySelectorAll("button#" + id);
    if (elems.length > 1) return console.error("more than one! querySelectorAll: button#" + id);
    let elem = elems[0];
    if (!elem) {
      let elems = document.querySelectorAll("#" + id);
      if (elems.length > 1) return console.error("more than one! querySelectorAll: #" + id);
      elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
    }
    elem.addEventListener(CLICK, clickHandler);
  }
  catch (ex) {
    console.error("ERR: onClick('" + id + "') " + ex.message);
  }
}

export function onEnterKey(textId/*:string*/, clickHandler/*:(ev:Event)=>void*/) {
  byId(textId).addEventListener("keyup", (event/*:KeyboardEvent*/) => { if (event.key === 'Enter') clickHandler(event) })
}

export function onClickSelector(selector/*:string*/, clickHandler/*:(ev:Event)=>void*/) {
  new El(selector).onClick(clickHandler)
}


/*+ 
export type AnyElement = HTMLElement & HTMLInputElement & HTMLButtonElement; 
+*/


/**
 * wrapper around document.getElementById -> anyElement
 * @param id 
 */
export function inputById(id/*:string*/)/*:HTMLInputElement*/ {
  try {
    const result = document.getElementById(id)
    if (!result) {
      console.error("element with id='" + id + "' NOT FOUND")
      return undefined /*+as unknown as HTMLInputElement+*/;
    }
    return document.getElementById(id) /*+as HTMLInputElement+*/
  }
  catch (ex) {
    console.error(ex.message + " element with id='" + id + "' NOT FOUND")
    return undefined /*+as unknown as HTMLInputElement+*/;
  }
}

/**
* showPage(id)
* removes class=hidden from an element
* @param id 
*/
export function showByClass(id/*:string*/, className/*:string*/) {
  const toShow = document.querySelectorAll("." + className + "#" + id)[0];
  // comentado - hides useful info -hideErr(); //cleanup
  //hide all others
  document.querySelectorAll("." + className).forEach((el) => {
    if (el !== toShow) {
      el.classList.add("slide-hide");
      el.classList.remove("show");
    }
  })
  if (!toShow) {
    console.error("." + className + "#" + id, "NOT FOUND")
    return;
  }
  toShow.querySelectorAll("input").forEach((item) => item.value = "") //clear all input fields
  toShow.classList.remove(HIDDEN); //show requested
  toShow.classList.remove("slide-hide"); //show requested
  toShow.classList.add("show"); //animate
}

export function showPage(id/*:string*/) {
  showByClass(id, "page");
}
export function showSubPage(id/*:string*/) {
  showByClass(id, "subpage");
}


export function hideDiv(id/*:string*/) {
  byId(id).classList.add(HIDDEN);
};


function displayNoneErr() {
  byId(ERR_DIV).classList.add("hidden");
}
function displayBlockErr() {
  byId(ERR_DIV).classList.remove("hidden");
}
function addShowErr() {
  byId(ERR_DIV).classList.add("show");
}


export function hideErr() {
  try {
    byId(ERR_DIV).innerHTML = "";
  }
  catch { }
}

var errorId = 0

export function showMsg(msg/*:string*/, extraClass/*:string*/) {
  const errDiv = byId(ERR_DIV)
  if (!errDiv) {
    console.error("MISSING err-div ON THIS PAGE")
    alert(msg);
    return;
  }
  const newDiv = document.createElement("DIV")  /*+as HTMLElement+*/
  newDiv.innerText = msg;
  if (extraClass) newDiv.classList.add(extraClass)
  errDiv.appendChild(newDiv);
  setTimeout(() => { newDiv.classList.add("show") }, 30);
  setTimeout(() => { newDiv.classList.remove("show") }, 5000);
  setTimeout(() => { newDiv.remove() }, 5300);
}

export function showSuccess(msg/*:string*/) {
  showMsg(msg, "success")
}

// shows a message on ERR_DIV for 5 seconds
// requires div id="err-div" and class .show
export function showErr(msg/*:string*/) {
  showMsg(msg, "error");
}

//---------------------
// inline HTML templates
export function internal_templateReplace(template/*:string*/, prefix/*:string*/, obj/*:any*/) /*:string*/ {
  var result = template;
  for (const key in obj) {
    let value = obj[key];
    let text = ""
    if (value == null || value == undefined) {
      text = "";
    }
    else if (typeof value === "number") {
      text = numberFormatFunction(value,key)
    }
    else if (typeof value === "object") {
      result = internal_templateReplace(result, key + ".", value) //recurse
      continue;
    }
    else {
      text = value.toString()
    }
    while (result.indexOf("{" + prefix + key + "}") !== -1) {
      result = result.replace("{" + prefix + key + "}", text);
    }
  }
  return result;
}

export function templateReplace(templateId/*:string*/, obj/*:any*/) {
  var result = byId(templateId).innerHTML;
  return internal_templateReplace(result, "", obj)
}

let hideTO/*:any*/;
// wait wheel
// requires div id="wait" and class .show
export function showWait() {
  const waitDiv = byId(WAIT)
  if (!waitDiv) {
    console.error("MISSING div id=wait ON THIS PAGE")
    return;
  }
  waitDiv.classList.add("show");
  hideTO = setTimeout(hideWait, 30000);//in case there's a programming error, hideWait is called automatically after 30 sec
}

export function hideWait() {
  clearTimeout(hideTO);
  const waitDiv = byId(WAIT)
  if (waitDiv) waitDiv.classList.remove("show"); //hide
}


export function clearContainer(containerId/*:string*/) {
  const listContainer = byId(containerId)
  listContainer.innerHTML = "";
}

export function appendTemplateLI(containerId/*:string*/, templateId/*:string*/, data/*:Record<string,any>*/) {
  const newLI = document.createElement("LI")  /*+as HTMLLIElement+*/
  newLI.innerHTML = templateReplace(templateId, data)
  const listContainer = byId(containerId)
  listContainer.appendChild(newLI)
}
export function populateSingleLI(containerId/*:string*/, templateId/*:string*/, multiDataObj/*:Record<string,any>*/, key/*:string*/) {
  const dataItem = {
    key: key, ...multiDataObj[key]
  }
  appendTemplateLI(containerId, templateId, dataItem)
}
export function populateUL(containerId/*:string*/, templateId/*:string*/, multiDataObj/*:Record<string,any>*/) {
  for (let key in multiDataObj) {
    populateSingleLI(containerId, templateId, multiDataObj, key);
  }
}

// get inner text form a classed children
export function getChildText(parent/*:Element*/, childSelector/*:string*/) /*:string*/ {
  const elems = parent.querySelectorAll(childSelector)
  if (!elems[0]) {
    console.error("getChildText", `parent.querySelectorAll('${childSelector}') NOT FOUND`)
    return "";
  }
  const childEl = elems[0] /*+as AnyElement+*/;
  return childEl.innerText;
}

// get inner text form a classed children
export function getClosestChildText(parentSelector/*:string*/, target/*:EventTarget|null*/, childSelector/*:string*/) /*:string*/ {
  if (!target) {
    console.error("getClosestChildText", "!target")
    return "";
  }
  const anyEl = target /*+as AnyElement+*/;
  const parent = anyEl.closest(parentSelector)
  if (parent == null) {
    console.error("getClosestChildText", `ev.target.closest('${parentSelector}') NOT FOUND`)
    return "";
  }

  const elems = parent.querySelectorAll(childSelector)
  if (!elems[0]) {
    console.error("getClosestChildText", `ev.target.querySelectorAll('${childSelector}') NOT FOUND`)
    return "";
  }
  const childEl = elems[0] /*+as AnyElement+*/;
  return childEl.innerText;

}

export class El {

  el/*:AnyElement*/ = undefined /*+as unknown as AnyElement+*/;

  constructor(selector/*:string*/) {
    try {
      let elems = document.querySelectorAll(selector);
      if (elems.length > 1) throw new Error("more than one!");
      let elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
      this.el = elem /*+as unknown as AnyElement+*/;
    }
    catch (ex) {
      console.error("ERR: querySelectorAll('" + selector + "') " + ex.message);
      return;
    }
  }

  hide() { this.el.classList.add("hidden") }
  show() { this.el.classList.remove("hidden") }
  get hidden() { return this.el.classList.contains("hidden") }
  set hidden(value) { if (value) this.hide(); else this.show() }

  get innerText() { return this.el.innerText }
  set innerText(newText) { this.el.innerText = newText }

  get value() { return this.el.value }
  set value(newValue) { this.el.value = newValue }

  get disabled() { return this.el.disabled }
  set disabled(value) { this.el.disabled = value }

  get enabled() { return !this.el.disabled }
  set enabled(value) { this.el.disabled = !value }

  get classList() { return this.el.classList }

  toggleClass(className/*:string*/) {
    if (this.classList.contains(className)) {
      this.classList.remove(className)
    }
    else {
      this.classList.add(className)
    }
  }

  onClick(clickHandler/*:ClickHandler*/) { this.el.addEventListener(CLICK, clickHandler); }
  onInput(inputHandler/*:ClickHandler*/) { this.el.addEventListener(INPUT, inputHandler); }
}
