import * as c from "./util/conversions.js";
let original = "10" + "0".repeat(24);
console.log(original, c.ytonFull(original), c.removeDecZeroes(c.ytonFull(original)));
for (let n = 1; n < 20; n++) {
    let original = Math.round(Math.random() * 1e12).toString() + "0".repeat(12 + Math.random() * 10);
    console.log(original, c.ytonFull(original), c.removeDecZeroes(c.ytonFull(original)));
}
//# sourceMappingURL=test.js.map