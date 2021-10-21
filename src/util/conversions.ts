
//----------------------------------
//------ conversions Yoctos->Near
//----------------------------------

//BigInt scientific notation
const base1e = BigInt(10);
function b1e(n: number) { return base1e ** BigInt(n) };
const b1e12 = b1e(12);
const b1e18 = b1e(18);
const b1e24 = b1e(24);

export function TGas(tgas: number): string {
    return (BigInt(tgas) * b1e12).toString(); // tgas*1e12 // Note: gas is u64
}
export function ntoy(near: number): string {
    return (BigInt(Math.trunc(near * 1e6)) * b1e18).toString(); // near*1e24 // Note: YoctoNear is u128
}
/// use up-to 6 decimals from user's input
export function nToYD(near: number, decimals: number): string {
    return (BigInt(Math.trunc(near * 1e6)) * b1e(decimals - 6)).toString(); // use up-to 6 decimals from user input
}

/**
 * returns string representing NEAR with thousands separators, and 5 decimal places
 * @param {string} yoctos 
 */
export function ytonString(yoctos: string): string {
    const just5dec = ytonFull(yoctos).slice(0, -19) //truncate at 5 decs
    return addCommas(just5dec)
}
export function ytonStringMin(yoctos: string): string {
    const just5dec = ytonFull(yoctos).slice(0, -19) //truncate at 5 decs
    return addCommas(just5dec)
}

/**
 * returns number with 4 decimal digits
 * @param {string} yoctos amount in yoctos
 * @param {number} decimals token decimals default 24
 */
export function ytond(yoctos: string, decimals: number): number {
    try {
        const just5dec = ytonFullD(yoctos, decimals).slice(0, -decimals + 5)
        return Number(just5dec) // truncated to 4 decimals 
    }
    catch (ex) {
        console.log("ERR: yton(", yoctos, ")", ex)
        return NaN;
    }
}

/**
 * returns Near number with 4 decimal digits
 * @param {string} yoctos amount in yoctos
 */
export function yton(yoctos: string): number {
    return ytond(yoctos, 24)
}


/**
 * Formats a number in NEAR to a string with commas and 5 decimal places
 * @param {number} n 
 */
function toStringDecSimple(n: number) {
    const decimals = 5
    const textNoDec = Math.round(n * 10 ** decimals).toString().padStart(decimals + 1, "0");
    return textNoDec.slice(0, -decimals) + "." + textNoDec.slice(-decimals);
}
/**
* Formats a number in NEAR to a string with commas and 5 decimal places
* @param {number} n 
*/
export function toStringDec(n: number) {
    return addCommas(toStringDecSimple(n));
}
/**
 * removes extra zeroes after the decimal point
 * it leaves >4,2, or none (never 3 to not confuse the international user)
 * @param {number} n 
 */
export function removeDecZeroes(withDecPoint: string): string {
    let decPointPos = withDecPoint.indexOf('.')
    if (decPointPos <= 0) return withDecPoint;
    let decimals = withDecPoint.length - decPointPos - 1;
    while (withDecPoint.endsWith("0") && decimals-- > 4) withDecPoint = withDecPoint.slice(0, -1);
    if (withDecPoint.endsWith("00")) withDecPoint = withDecPoint.slice(0, -2)
    if (withDecPoint.endsWith(".00")) withDecPoint = withDecPoint.slice(0, -3)
    return withDecPoint;
}
/**
 * Formats a number in NEAR to a string with commas and 5,2, or 0 decimal places
 * @param {number} n 
 */
export function toStringDecMin(n: number) {
    return addCommas(removeDecZeroes(toStringDecSimple(n)));
}
/**
 * converts a string with and commas and decimal places into a number
 * @param {string} str
 */
export function toNum(str: string): number {
    return Number(str.replace(/,/g, ""))
}


/**
 * returns string with a decimal point and 24 decimal places
 * @param {string} yoctoString amount in yoctos
 */
export function ytonFull(yoctoString: string): string {
    return ytonFullD(yoctoString, 24)
}

/**
 * returns string with a decimal point and 24 decimal places
 * @param {string} yoctoString amount in yoctos
 * @param {number} decimals how many decimals
 */
export function ytonFullD(yoctoString: string, decimals: number): string {
    let result = (yoctoString + "").padStart(decimals + 1, "0")
    result = result.slice(0, -decimals) + "." + result.slice(-decimals)
    return result
}

/**
 * adds commas to a string number 
 * @param {string} str 
 */
export function addCommas(str: string) {
    let n = str.indexOf(".") - 4
    while (n >= 0) {
        str = str.slice(0, n + 1) + "," + str.slice(n + 1)
        n = n - 3
    }
    return str;
}

