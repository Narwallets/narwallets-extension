
//----------------------------------
//------ conversions Yoctos->Near
//----------------------------------

/**
 * returns string with a decimal point and 4 decimal places
 * @param {string} yoctos 
 */
export function ytonNoComma(yoctos/*:string*/)/*:string*/ {
    return ytonFull(yoctos).slice(0, -22) // truncate to 2 decimals 
}

/**
 * returns string representing NEAR with thsnds separators, and 4 decimal places
 * @param {string} yoctos 
 */
export function yton(yoctos/*:string*/)/*:string*/ {
    return addCommas(ytonNoComma(yoctos)) 
}

/**
 * returns Near number with 4 decimal digits
 * @param {string} yoctos amount in yoctos
 */
export function ytoNN(yoctos/*:string*/)/*:number*/ {
    try {
        return Number(ytonNoComma(yoctos)) // truncated to 4 decimals 
    }
    catch (ex) {
        console.error("ERR: ytoNN(", yoctos, ")", ex)
        return NaN;
    }
}

/**
 * converts a number to a string with commas and 4 decimal places
 * @param {number} n 
 */
export function toStringDec(n/*:number*/) {
    const text1e4N = Math.round(n * 10000).toString().padStart(5, "0");
    const withDecPoint =text1e4N.slice(0, -4) + "." + text1e4N.slice(-4,-2); //only 2 decimal places shown
    return addCommas(withDecPoint);
}
/**
 * converts a string with and commas and 4 decimal places into a number
 * @param {string} str
 */
export function toNum(str/*:string*/)/*:number*/ {
    return Number(str.replace(/,/g, ""))
}


/**
 * returns string with a decimal point and 24 decimal places
 * @param {string} str amount in yoctos
 */
export function ytonFull(str/*:string*/)/*:string*/ {
    let result = (str + "").padStart(25, "0")
    result = result.slice(0, -24) + "." + result.slice(-24)
    return result
}

/**
 * adds commas to a string number with 4 decimals
 * @param {string} str 
 */
export function addCommas(str/*:string*/) {
    let n = str.indexOf(".") - 4
    while (n >= 0) {
        str = str.slice(0, n + 1) + "," + str.slice(n + 1)
        n = n - 3
    }
    return str;
}

