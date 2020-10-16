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
  const toShow = byId(id);
  toShow.classList.remove(HIDDEN); //show requested
  hideErr(); //cleanup
  //hide all others
  document.querySelectorAll(".page").forEach((el) => {
    if (el !== toShow) el.classList.add(HIDDEN);
  })
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
		while (result.indexOf("{{"+key+"}}")!==-1){
			result = result.replace("{{"+key+"}}",value);	
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