import { createHash } from "crypto";
const yourString = process.argv[2];
//console.log(yourString)
const hash = createHash("sha256").update(yourString).digest("hex");
console.log(hash.slice(0, 40));
