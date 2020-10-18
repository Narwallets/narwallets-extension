//--- COMMON CONSTANTS ---
//events
export const CLICK = "click"
export const INPUT = "input"
//actions
export const OPEN = "open"
export const CREATE="create"
export const IMPORT="import"
//classes
export const HIDDEN = "hidden"
//elem-id
export const ERR_DIV = "err-div"
export const WAIT="wait"

//------- COMMON simple independent utility FUNCTIONS -------
/**
 * wrapper around document.getElementById -> HTMLElement
 * @param id 
 */
export function byId (id/*:string*/)/*:HTMLElement*/ {
  try {
    return document.getElementById(id) /*+as HTMLElement+*/
  }
  catch {
    return new HTMLElement();
  }
}

export function onClick(id/*:string*/,clickHandler/*:(ev:Event)=>void*/){
  let elems = document.querySelectorAll("button#"+id);
  if (elems.length>1) return console.error("more than one! querySelectorAll: button#"+id);
  let elem = elems[0];
  if (!elem) {
	  let elems = document.querySelectorAll("#"+id);
	  if (elems.length>1) return console.error("more than one! querySelectorAll: #"+id);
  	  elem = elems[0];
  	  if (!elem) return console.error("byId('"+id+"') NOT FOUND'");
  }
  elem.addEventListener(CLICK, clickHandler);
}

export function onEnterKey(textId/*:string*/,clickHandler/*:(ev:Event)=>void*/){
  byId(textId).addEventListener("keyup", (event/*:KeyboardEvent*/) => { if (event.key === 'Enter') clickHandler(event) })
}

/**
 * wrapper around document.getElementById -> HTMLTextAreaElement
 * @param id 
 */
export function textById(id/*:string*/)/*:HTMLTextAreaElement*/ {
  try {
    return document.getElementById(id) /*+as HTMLTextAreaElement+*/
  }
  catch {
    return new HTMLTextAreaElement();
  }
}

/**
* showPage(id)
* removes class=hidden from an element
* @param id 
*/
export function showPage(id/*:string*/) {
  const toShow = document.querySelectorAll(".page#"+id)[0];
  hideErr(); //cleanup
  //hide all others
  document.querySelectorAll(".page").forEach((el) => {
    if (el !== toShow) el.classList.add(HIDDEN);
  })
  if (!toShow) return console.error(".page#"+id,"NOT FOUND")
  toShow.classList.remove(HIDDEN); //show requested
}

export function hideDiv(id/*:string*/) {
  byId(id).classList.add(HIDDEN);
};

export function hideErr(){
  try{
  byId(ERR_DIV).classList.remove("show"); //cleanup - hide errors    
  }
  catch{}
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
export function templateReplace(templateId/*:string*/,obj/*:any*/){
	var result=byId(templateId).innerHTML;
	for (const key in obj) {
		let value=obj[key];
		if (value==null||value==undefined) {
			value="";
		}
		while (result.indexOf("{"+key+"}")!==-1){
			result = result.replace("{"+key+"}",value);	
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

export function hideWait(){
  const waitDiv = byId(WAIT)
  if (waitDiv) waitDiv.classList.remove("show"); //hide
}

export function yton(yoctos/*:string*/)/*:string*/ {
  return ytonFull(yoctos).slice(0, -20) // truncate to 4 decimals 
}

export function ytonFull(str/*:string*/)/*:string*/  {
  let result = (str + "").padStart(25, "0")
  result = result.slice(0, -24) + "." + result.slice(-24)
  return result
}

export class El{

	el/*:HTMLElement & HTMLInputElement & HTMLButtonElement */= undefined /*+as unknown as HTMLElement & HTMLInputElement & HTMLButtonElement+*/;

	constructor(selector/*:string*/){
		let elems = document.querySelectorAll(selector);
		if (elems.length>1) {
      console.error("more than one! querySelectorAll('"+selector+"')");
      return;
    }
		let elem = elems[0];
		if (!elem) { 
      console.error("querySelectorAll('"+selector+"') NOT FOUND");
      return;
    }
		this.el = elem /*+as unknown as HTMLElement & HTMLInputElement & HTMLButtonElement+*/;
	}

    hide(){this.el.classList.add("hidden")}
    show(){this.el.classList.remove("hidden")}
    get hidden() {return this.el.classList.contains("hidden")}
    set hidden(value) {if (value) this.hide(); else this.show()}

    get text(){return this.el.innerText}
    set text(newText){this.el.innerText=newText}

    get disabled(){return this.el.disabled}
    set disabled(value){this.el.disabled=value}

    get enabled(){return !this.el.disabled}
    set enabled(value){this.el.disabled=!value}

    get classList(){return this.el.classList}

    onClick(clickHandler/*:((ev:Event)=>void)|(()=>void)*/){this.el.addEventListener(CLICK, clickHandler);}
    onInput(inputHandler/*:((ev:Event)=>void)|(()=>void)*/){this.el.addEventListener(INPUT, inputHandler);}
}
