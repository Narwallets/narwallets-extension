//---------------------
//--- DOM UTILITIES ---
//---------------------
import * as c from "./conversions.js";

export type ClickHandler =
  | (() => void)
  | ((ev: Event) => void)
  | ((ev: Event) => Promise<void>)
  | (() => Promise<void>);

//events
export const CLICK = "click";
export const INPUT = "input";
//actions
export const OPEN = "open";
export const CREATE = "create";
export const IMPORT = "import";
//classes
export const HIDDEN = "hidden";
//elem-id
export const ERR_DIV = "err-div";
export const WAIT = "wait";

export const ENTER = "Enter";
let globalEnterKeyPress: (event: KeyboardEvent) => void;

export let activePage = "";

//----DOM COMMON simple independent utility FUNCTIONS  -------
/**
 * wrapper around document.getElementById -> HTMLElement
 * @param id
 */
export function byId(id: string): HTMLElement {
  try {
    return document.getElementById(id) as HTMLElement;
  } catch {
    console.error(`document.getElementById(${id}) NOT FOUND`);
    return new HTMLElement();
  }
}

/**
 * gets checked radiobutton by name
 * @param name
 */
export function checkedRadioButton(name: string): HTMLElement {
  try {
    return document.querySelector(
      "input[name=" + name + "]:checked"
    ) as HTMLElement;
  } catch {
    console.error(`document.getElementsByName(${name}) NOT FOUND`);
    return new HTMLElement();
  }
}
//---
//-- seach button elements with the id and add click listener
//---
export function onClickId(id: string, clickHandler: (ev: Event) => void) {
  try {
    let elems = document.querySelectorAll("button#" + id);
    if (elems.length > 1)
      return console.error("more than one! querySelectorAll: button#" + id);
    let elem = elems[0];
    if (!elem) {
      let elems = document.querySelectorAll("#" + id);
      if (elems.length > 1)
        return console.error("more than one! querySelectorAll: #" + id);
      elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
    }
    elem.addEventListener(CLICK, clickHandler);
  } catch (ex) {
    console.error("ERR: onClickId('" + id + "') " + ex.message);
  }
}

//---
//-- seach button elements with the id and add click listener
//---
export function onGlobalKeyPress(handler: (ev: Event) => void, key: string) {
  try {
    document.removeEventListener("keypress", globalEnterKeyPress);    
    globalEnterKeyPress = (event: KeyboardEvent) => {
      var keyCode = event.key;
      if(keyCode == key) {
        handler(event);
      }  
    };
    document.addEventListener("keypress", globalEnterKeyPress);
    
  } catch (ex) {
    console.error("ERR: onGlobalKeyPress() " + ex.message);
  }
}

//---
//-- seach button elements with the id and add click listener
//---
export function removeGlobalKeyPress() {
  try {
    document.removeEventListener("keypress", globalEnterKeyPress);    
    globalEnterKeyPress = () => {};
  } catch (ex) {
    console.error("ERR: removeGlobalKeyPress() " + ex.message);
  }
}

/**
 * add an event when Enter is pressed in an input-box
 * @param textId
 * @param clickHandler
 */
export function onEnterKey(textId: string, clickHandler: (ev: Event) => void) {
  byId(textId).addEventListener("keyup", (event: KeyboardEvent) => {
    if (event.key === "Enter") clickHandler(event);
  });
}

/**
 * add an event when is pressed in an input-box
 * @param textId
 * @param handler
 */
export function onChangeId(id: string, handler: (ev: Event) => void) {
  try {
    let elems = document.querySelectorAll("button#" + id);
    if (elems.length > 1)
      return console.error("more than one! querySelectorAll: button#" + id);
    let elem = elems[0];
    if (!elem) {
      let elems = document.querySelectorAll("#" + id);
      if (elems.length > 1)
        return console.error("more than one! querySelectorAll: #" + id);
      elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
    }
    elem.addEventListener("keyup", handler);
  } catch (ex) {
    console.error("ERR: onClickId('" + id + "') " + ex.message);
  }
}

export function onClickSelector(
  selector: string,
  clickHandler: (ev: Event) => void
) {
  new El(selector).onClick(clickHandler);
}

export type AnyElement = HTMLElement & HTMLInputElement & HTMLButtonElement;

/**
 * wrapper around document.getElementById -> anyElement
 * @param id
 */
export function inputById(id: string): HTMLInputElement {
  const elemClass = qs("input#" + id);
  return elemClass.el as HTMLInputElement;
}

/**
 * get a Number from a text element, by selector
 * @param selector
 */
export function getNumber(selector: string) {
  const amountElem = new El(selector);
  return c.toNum(amountElem.value.trim());
}

export function maxClicked(id: string, selector: string, subtract: number = 0) {
  const amountElem = new El(selector);
  const maxValue = c.toNum(amountElem.innerText) - subtract;
  inputById(id).value = c.toStringDec(Math.max(0, maxValue));
}

//-------------------------------------------------------
/**
 * showByClass(id)
 * removes class=hidden from a DIV with id=id & class=className
 * @param id
 */
export function showByClass(id: string, className: string) {
  const toShow = document.querySelectorAll("." + className + "#" + id)[0];
  if (!toShow) {
    console.error("." + className + "#" + id, "NOT FOUND");
    return;
  }
  //clear all input fields
  toShow.querySelectorAll("input").forEach((item) => (item.value = ""));

  const allPages = document.querySelectorAll("." + className);
  allPages.forEach((el) => {
    el.classList.remove(HIDDEN);
  });
  //the setTimeout is needed because  HIDDEN=>display:none, and setting display:none BREAKS ANIMATIONS
  // setTimeout(() => {
  //animated hide all
  allPages.forEach((el) => {
    el.classList.remove("show");
    el.classList.add("slide-hide");
    el.setAttribute("disabled", "");
  });
  //show requested
  toShow.classList.remove("slide-hide"); //show requested
  toShow.classList.add("show"); //animate
  toShow.removeAttribute("disabled");
  // }, 100);

  //after animation, hide the other divs so they're not in the tab order
  // setTimeout(() => {
  //console.log(toShow.id)
  allPages.forEach((el) => {
    if (el.id != toShow.id) {
      //console.log("hiding",el.id)
      el.classList.add(HIDDEN);
    }
  });
  //console.log("show",toShow.id)
  toShow.classList.remove(HIDDEN);
  // }, 300);
}
/**
 * showByClass(id)
 * removes class=hidden from a DIV with id=id & class="appface"
 * @param id
 */
export function showPage(id: string) {
  activePage = id;
  showByClass(id, "appface");
}
export function showSubPage(id: string) {
  showByClass(id, "subpage");
  let primerRadio = document.querySelectorAll("#" + id + ".subpage .radio.one");
  if (primerRadio.length > 0) {
    (primerRadio[0] as HTMLInputElement).checked = true;
  }
}

export function hideDiv(id: string) {
  byId(id).classList.add(HIDDEN);
}
//-----------------------------------
//----- NOTIFICATIONS ---------------
//-----------------------------------
// shows a message on ERR_DIV for 5 seconds
// requires div id="err-div" and css class .show

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
  } catch {}
}

var errorId = 0;

// returns created err-div item
// showMs=-1 => indefinite
export function showMsg(
  msg: string,
  extraClass: string,
  showMs?: number
): HTMLElement {
  if (!showMs) showMs = 6000; //default show for 6 seconds
  const errDiv = byId(ERR_DIV);
  const newDiv = document.createElement("DIV") as HTMLElement;
  newDiv.innerText = msg;
  if (extraClass) newDiv.classList.add(extraClass);
  if (!errDiv) {
    console.error("MISSING err-div ON THIS PAGE");
    alert(msg);
  } else {
    errDiv.appendChild(newDiv);
    setTimeout(() => {
      newDiv.classList.add("show");
    }, 30);
    setTimeout(() => {
      newDiv.classList.remove("show");
    }, showMs);
  }
  if (showMs > 0) {
    setTimeout(() => {
      newDiv.remove();
    }, showMs + 300);
  }
  return newDiv;
}

export function showSuccess(msg: string) {
  showMsg(msg, "success");
}

export function showWarn(msg: string) {
  showMsg(msg, "warning");
}

// shows a message on ERR_DIV for 5 seconds
// requires div id="err-div" and class .show
export function showErr(msg: string) {
  showMsg(msg, "error");
  console.log(msg);
}

//-----------------------
//--- WAIT WHEEL  -------
//-----------------------

let hideTO: any;
// wait wheel
// requires div id="wait" and class .show
export function showWait() {
  const waitDiv = byId(WAIT);
  if (!waitDiv) {
    console.error("MISSING div id=wait ON THIS PAGE");
    return;
  }
  waitDiv.classList.add("show");
  window.addEventListener("keydown", ignoreKeys, true);
  hideTO = setTimeout(hideWait, 30000); //in case there's a programming error, hideWait is called automatically after 30 sec
}

function ignoreKeys(event: Event) {
  event.preventDefault();
}

export function hideWait() {
  window.removeEventListener("keydown", ignoreKeys, true);
  clearTimeout(hideTO);
  const waitDiv = byId(WAIT);
  if (waitDiv) waitDiv.classList.remove("show"); //hide
}

//------------------------------------------------------------
//---  TEMPLATES ---------------------------------------------
//------------------------------------------------------------
let numberFormatFunction = function (num: number, key: string) {
  if (key.endsWith("Pct")) return num.toString();
  return c.toStringDec(num);
};
//---------------------
// inline HTML templates
export function templateReplace(
  template: string,
  obj: any,
  prefix: string = ""
): string {
  var result = template;
  for (const key in obj) {
    let value = obj[key];
    let text = "";
    if (value == null || value == undefined) {
      text = "";
    } else if (typeof value === "number") {
      text = numberFormatFunction(value, key);
    } else if (typeof value === "object") {
      result = templateReplace(result, value, key + "."); //recurse
      continue;
      // check if its a date in ISO format. e.g. "2021-07-16T22:16:58.985"
    } else if (/\d+-\d+-\d+T\d+:\d+:\.*/.test(value)) {
      text = new Date(value).toLocaleString();
      // assume string
    } else {
      text = value.toString();
    }
    while (result.indexOf("{" + prefix + key + "}") !== -1) {
      result = result.replace("{" + prefix + key + "}", text);
    }
  }
  return result;
}
export function clearContainer(containerId: string) {
  const listContainer = byId(containerId);
  listContainer.innerHTML = "";
}

export function appendTemplate(
  elType: string,
  containerId: string,
  templateId: string,
  data: Record<string, any>
) {
  const newLI = document.createElement(elType) as HTMLLIElement;
  const templateElem = byId(templateId);
  if (!templateElem)
    console.error("appendTemplate, template id='" + templateId + "' NOT FOUND");
  //-- if data-id has value, set it
  if (templateElem.dataset.id)
    newLI.id = templateReplace(templateElem.dataset.id, data); //data-id => id={x}
  //-- copy classes from template (except "hidden")
  //@ts-ignore
  newLI.classList.add(...templateElem.classList); //add all classes
  newLI.classList.remove("hidden"); //remove hidden
  //---
  newLI.innerHTML = templateReplace(templateElem.innerHTML, data);
  const listContainer = byId(containerId);
  listContainer.appendChild(newLI);
}

export function appendTemplateLI(
  containerId: string,
  templateId: string,
  data: Record<string, any>
) {
  appendTemplate("LI", containerId, templateId, data);
}
export function populateSingleLI(
  containerId: string,
  templateId: string,
  multiDataObj: Record<string, any>,
  key: string
) {
  const dataItem = {
    key: key,
    ...multiDataObj[key],
  };
  appendTemplateLI(containerId, templateId, dataItem);
}
export function populateUL(
  containerId: string,
  templateId: string,
  multiDataObj: Record<string, any>
) {
  for (let key in multiDataObj) {
    populateSingleLI(containerId, templateId, multiDataObj, key);
  }
}

// get inner text form a classed children
export function getChildText(parent: Element, childSelector: string): string {
  const elems = parent.querySelectorAll(childSelector);
  if (!elems[0]) {
    console.error(
      "getChildText",
      `parent.querySelectorAll('${childSelector}') NOT FOUND`
    );
    return "";
  }
  const childEl = elems[0] as AnyElement;
  return childEl.innerText;
}

// get inner text form a classed children
export function getClosestChildText(
  parentSelector: string,
  target: EventTarget | null,
  childSelector: string
): string {
  if (!target) {
    console.error("getClosestChildText", "!target");
    return "";
  }
  const anyEl = target as AnyElement;
  const parent = anyEl.closest(parentSelector);
  if (parent == null) {
    console.error(
      "getClosestChildText",
      `ev.target.closest('${parentSelector}') NOT FOUND`
    );
    return "";
  }

  const elems = parent.querySelectorAll(childSelector);
  if (!elems[0]) {
    console.error(
      "getClosestChildText",
      `ev.target.querySelectorAll('${childSelector}') NOT FOUND`
    );
    return "";
  }
  const childEl = elems[0] as AnyElement;
  return childEl.innerText;
}

//------------------------------------------------------------
// a safe query selector, throws if there's more than one
//------------------------------------------------------------
export function qs(selector: string) {
  return new El(selector);
}

export class El {
  el: AnyElement = undefined as unknown as AnyElement;

  constructor(selector: string) {
    if (selector == "") return;
    try {
      let elems = document.querySelectorAll(selector);
      if (elems.length > 1) throw new Error("more than one!");
      let elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
      this.el = elem as unknown as AnyElement;
    } catch (ex) {
      console.error("ERR: querySelectorAll('" + selector + "') " + ex.message);
      return;
    }
  }

  sub(selector: string): El {
    try {
      let elems = this.el.querySelectorAll(selector);
      if (elems.length > 1) throw new Error("more than one!");
      let elem = elems[0];
      if (!elem) throw new Error("NOT FOUND");
      const newEl = new El("");
      newEl.el = elem as unknown as AnyElement;
      return newEl;
    } catch (ex) {
      console.error(
        "ERR: sub-querySelectorAll('" + selector + "') " + ex.message
      );
      return this;
    }
  }

  hide() {
    this.el.classList.add("hidden");
  }
  show() {
    this.el.classList.remove("hidden");
  }
  showIf(truefalse: boolean) {
    if (truefalse) this.show();
    else this.hide();
  }
  get hidden() {
    return this.el.classList.contains("hidden");
  }
  set hidden(value) {
    if (value) this.hide();
    else this.show();
  }

  get innerText() {
    return this.el.innerText;
  }
  set innerText(newText) {
    this.el.innerText = newText;
  }

  get value() {
    return this.el.value;
  }
  set value(newValue) {
    this.el.value = newValue;
  }

  get disabled() {
    return this.el.disabled;
  }
  set disabled(value) {
    this.el.disabled = value;
  }

  get enabled() {
    return !this.el.disabled;
  }
  set enabled(value) {
    this.el.disabled = !value;
  }

  get classList() {
    return this.el.classList;
  }

  toggleClass(className: string) {
    if (this.classList.contains(className)) {
      this.classList.remove(className);
    } else {
      this.classList.add(className);
    }
  }

  onClick(clickHandler: ClickHandler) {
    this.el.addEventListener(CLICK, clickHandler);
  }
  onInput(inputHandler: ClickHandler) {
    this.el.addEventListener(INPUT, inputHandler);
  }
}

//------------------------------------------------------------
// a safe query selector ALL, throws if there's none
//------------------------------------------------------------
export function all(selector: string) {
  return new All(selector);
}
//---------------
export class All {
  elems: NodeListOf<HTMLElement>;

  constructor(selector: string) {
    this.elems = document.querySelectorAll(selector);
    try {
      if (this.elems.length == 0) throw new Error("not found!");
    } catch (ex) {
      console.error("ERR: querySelectorAll('" + selector + "') " + ex.message);
    }
  }

  hide() {
    this.elems.forEach((item: HTMLElement) => {
      item.classList.add("hidden");
    });
  }
  show() {
    this.elems.forEach((item: HTMLElement) => {
      item.classList.remove("hidden");
    });
  }

  toggleClass(className: string) {
    this.elems.forEach((item: HTMLElement) => {
      if (item.classList.contains(className)) {
        item.classList.remove(className);
      } else {
        item.classList.add(className);
      }
    });
  }
  addClass(className: string) {
    this.elems.forEach((item: HTMLElement) => {
      item.classList.add(className);
    });
  }
  removeClass(className: string) {
    this.elems.forEach((item: HTMLElement) => {
      item.classList.remove(className);
    });
  }

  addEventListener(event: string, handler: ClickHandler) {
    for (const item of this.elems as unknown as HTMLElement[]) {
      item.addEventListener(event, handler);
    }
  }
  onClick(clickHandler: ClickHandler) {
    this.addEventListener(CLICK, clickHandler);
  }
  onInput(inputHandler: ClickHandler) {
    this.addEventListener(INPUT, inputHandler);
  }
}
