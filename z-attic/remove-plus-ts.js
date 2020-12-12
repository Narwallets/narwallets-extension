import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require("fs")
const path= require("path")
const child_process= require("child_process")

const execSync=child_process.execSync

/**
 * /*: types on comments ugly hack
 * removes / * * / IF those are in the same line and the first one is /*:
 * @param text
 */
function preProcessTSFileContents(text) {

    const plusMl=text.indexOf("/*"+"+");
    const singleLine=text.indexOf("/*"+":");
    if (plusMl===-1 && singleLine===-1) return text; //early exit - performance

    const lines = text.split("\n");
    let replaced = false;
    for (let inx = 0; inx < lines.length; inx++) {
        const line = lines[inx];
        const start = line.indexOf("/*"+":");
        if (start >= 0) {
            const end = line.indexOf("*"+"/");
            if (end >= 0) {
                lines[inx] = line.replace(/(\/\*|\*\/)/g, ""); //remove /* */
                replaced = true;
            }
        }
        else {
            const mlStart = line.indexOf("/*"+"+");
            const mlEnd = line.indexOf("+"+"*/");
            if (mlStart >= 0 || mlEnd >= 0) {
                lines[inx] = line.replace(/(\/\*\+|\+\*\/)/g, ""); //remove /*+ and/or +*/
                replaced = true;
            }
        }
    }
    if (!replaced) return text;
    //console.log("REPLACED: ",fileName);
    return lines.join("\n");
}


function fromDir (startPath, filter, callback) {
    // console.log('Starting from dir '+startPath+'/');

    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath)
        return
    }

    var files = fs.readdirSync(startPath)
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i])
        var stat = fs.lstatSync(filename)
        if (stat.isDirectory()) {
            fromDir(filename, filter, callback) // recurse
        } else if (filter.test(filename)) callback(filename)
    };
};

function convertToTS (filename) {
    //fs.renameSync(filename,filename.slice(0,-3)+".ts")
    if (filename.indexOf("/api/")>=0) return
    var buf = fs.readFileSync(filename)
    const pureTS = preProcessTSFileContents(buf.toString())
    const newFilename = filename.slice(0,-3)+".ts"
    fs.writeFileSync(newFilename, pureTS);
}
function renameToJS (filename) {
    fs.renameSync(filename,filename.slice(0,-3)+".js")
}
function renameToJustJS (filename) {
    fs.renameSync(filename,filename.slice(0,-6)+".js")
}

// ---------------------
// ---START BUILD TASKS
// ---------------------

fromDir("../src", /\.js$/, convertToTS)
process.exit(1)

console.clear()
// rename *.js -> *+ts.ts so the plus-ts-compiler treat them as .ts files
// if everything compiles, rename -back
fromDir("./src", /\+ts\.js$/, convertToTS)


//call insalled ts compiler
const execResult = child_process.spawnSync("npx",["tsc","--build"], { stdio: 'inherit' })
if (execResult.error) {
    console.log(execResult.error)
    process.exit(1)
}
if (execResult.status != 0) {
    process.exit(execResult.status)
}

//if everything ok - rename back
// rename *+ts.ts -> *.js so the browser treat them as .js files
fromDir("./src", /\+ts\.ts$/, renameToJS)
