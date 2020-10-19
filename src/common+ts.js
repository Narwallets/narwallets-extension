import * as Pages from "./pages+ts.js"
//--- COMMON CONSTANTS ---
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

//------- COMMON simple independent utility FUNCTIONS -------
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


/*+ 
export type anyElement = HTMLElement & HTMLInputElement & HTMLButtonElement; 
+*/


/**
 * wrapper around document.getElementById -> anyElement
 * @param id 
 */
export function textById(id/*:string*/)/*:anyElement*/ {
  try {
    return document.getElementById(id) /*+as anyElement+*/
  }
  catch {
    return undefined /*+as unknown as anyElement+*/;
  }
}

/**
* showPage(id)
* removes class=hidden from an element
* @param id 
*/
export function showPage(id/*:string*/) {
  const toShow = document.querySelectorAll(".page#" + id)[0];
  hideErr(); //cleanup
  //hide all others
  document.querySelectorAll(".page").forEach((el) => {
    if (el !== toShow) {
      el.classList.add("slide-hide");
      el.classList.remove("show");
    }
  })
  if (!toShow) {
    console.error(".page#" + id, "NOT FOUND")
    return;
  }
  toShow.classList.remove(HIDDEN); //show requested
  toShow.classList.remove("slide-hide"); //show requested
  toShow.classList.add("show"); //animate
}

export function hideDiv(id/*:string*/) {
  byId(id).classList.add(HIDDEN);
};

export function hideErr() {
  try {
    byId(ERR_DIV).classList.remove("show"); //cleanup - hide errors    
  }
  catch { }
}

// shows a message on ERR_DIV for 5 seconds
// requires div id="err-div" and class .show
export function showErr(msg/*:string*/) {
  const errDiv = byId(ERR_DIV)
  if (!errDiv) {
    console.error("MISSING err-div ON THIS PAGE")
    alert(msg);
    return;
  }
  errDiv.innerText = msg;
  errDiv.classList.add("show");
  setTimeout(hideErr, 5000);
}

//---------------------
// inline HTML templates
export function templateReplace(templateId/*:string*/, obj/*:any*/) {
  var result = byId(templateId).innerHTML;
  for (const key in obj) {
    let value = obj[key];
    if (value == null || value == undefined) {
      value = "";
    }
    while (result.indexOf("{" + key + "}") !== -1) {
      result = result.replace("{" + key + "}", value);
    }
  }
  return result;
}


// wait wheel
// requires div id="wait" and class .show
export function showWait() {
  const waitDiv = byId(WAIT)
  if (!waitDiv) {
    console.error("MISSING div id=wait ON THIS PAGE")
    return;
  }
  waitDiv.classList.add("show");
}

export function hideWait() {
  const waitDiv = byId(WAIT)
  if (waitDiv) waitDiv.classList.remove("show"); //hide
}

export function yton(yoctos/*:string*/)/*:string*/ {
  return ytonFull(yoctos).slice(0, -20) // truncate to 4 decimals 
}

export function ytonFull(str/*:string*/)/*:string*/ {
  let result = (str + "").padStart(25, "0")
  result = result.slice(0, -24) + "." + result.slice(-24)
  return result
}

export function clearContainer(containerId/*:string*/) {
  const listContainer = byId(containerId)
  listContainer.innerHTML = "";
}

export function populateSingleLI(containerId/*:string*/, templateId/*:string*/, multiDataObj/*:Record<string,any>*/, key/*:string*/) {
  const newLI = document.createElement("LI")  /*+as HTMLLIElement+*/
  const dataItem = {
    key: key, ...multiDataObj[key]
  }
  newLI.innerHTML = templateReplace(templateId, dataItem)
  const listContainer = byId(containerId)
  listContainer.appendChild(newLI)
}
export function populateLI(containerId/*:string*/, templateId/*:string*/, multiDataObj/*:Record<string,any>*/) {
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
  const childEl = elems[0] /*+as anyElement+*/;
  return childEl.innerText;
}

// get inner text form a classed children
export function getClosestChildText(parentSelector/*:string*/, target/*:EventTarget|null*/, childSelector/*:string*/) /*:string*/ {
  if (!target) {
    console.error("getClosestChildText", "!target")
    return "";
  }
  const anyEl = target /*+as anyElement+*/;
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
  const childEl = elems[0] /*+as anyElement+*/;
  return childEl.innerText;

}

export class El {

  el/*:anyElement*/ = undefined /*+as unknown as anyElement+*/;

  constructor(selector/*:string*/) {
    try {
      let elems = document.querySelectorAll(selector);
      if (elems.length > 1) throw new Error("more than one!");
      let elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
      this.el = elem /*+as unknown as anyElement+*/;
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

  get text() { return this.el.innerText }
  set text(newText) { this.el.innerText = newText }

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

  onClick(clickHandler/*:((ev:Event)=>void)|(()=>void)*/) { this.el.addEventListener(CLICK, clickHandler); }
  onInput(inputHandler/*:((ev:Event)=>void)|(()=>void)*/) { this.el.addEventListener(INPUT, inputHandler); }
}
