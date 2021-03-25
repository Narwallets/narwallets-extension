//----------------------------------
//------ conversions Yoctos->Near
//----------------------------------
//BigInt scientific notation
const base1e = BigInt(10);
function b1e(n) { return base1e ** BigInt(n); }
;
const b1e12 = b1e(12);
const b1e24 = b1e(24);
export function TGas(tgas) {
    return (BigInt(tgas) * b1e12).toString(); // tgas*1e12 // Note: gas is u64
}
export function ntoy(near) {
    return (BigInt(near) * b1e24).toString(); // near*1e24 // Note: YoctoNear is u128
}
/**
 * returns string representing NEAR with thsnds separators, and 2 decimal places
 * @param {string} yoctos
 */
export function ytonString(yoctos) {
    const just5dec = ytonFull(yoctos).slice(0, -19); //truncate at 5 decs
    return addCommas(just5dec);
}
/**
 * returns Near number with 4 decimal digits
 * @param {string} yoctos amount in yoctos
 */
export function yton(yoctos) {
    try {
        const just5dec = ytonFull(yoctos).slice(0, -19);
        return Number(just5dec); // truncated to 4 decimals 
    }
    catch (ex) {
        console.log("ERR: yton(", yoctos, ")", ex);
        return NaN;
    }
}
/**
 * Formats a number in NEAR to a string with commas and 2 decimal places
 * @param {number} n
 */
export function toStringDec(n) {
    const text1e4N = Math.round(n * 100).toString().padStart(3, "0");
    const withDecPoint = text1e4N.slice(0, -2) + "." + text1e4N.slice(-2);
    return addCommas(withDecPoint);
}
/**
 * converts a string with and commas and decimal places into a number
 * @param {string} str
 */
export function toNum(str) {
    return Number(str.replace(/,/g, ""));
}
/**
 * returns string with a decimal point and 24 decimal places
 * @param {string} yoctoString amount in yoctos
 */
export function ytonFull(yoctoString) {
    let result = (yoctoString + "").padStart(25, "0");
    result = result.slice(0, -24) + "." + result.slice(-24);
    return result;
}
/**
 * adds commas to a string number with 4 decimals
 * @param {string} str
 */
export function addCommas(str) {
    let n = str.indexOf(".") - 4;
    while (n >= 0) {
        str = str.slice(0, n + 1) + "," + str.slice(n + 1);
        n = n - 3;
    }
    return str;
}
//# sourceMappingURL=conversions.js.map