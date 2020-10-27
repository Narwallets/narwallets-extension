import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require("fs")
const path= require("path")
const child_process= require("child_process")

const execSync=child_process.execSync

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

function renameToTS (filename) {
    fs.renameSync(filename,filename.slice(0,-3)+".ts")
    // var buf = fs.readFileSync(filename)
    // const replaced = buf.toString().replace(/(import .* from\s+['"])(?!.*\.js['"])(\..*?)(?=['"])/g, '$1$2.js')
    // if (replaced !== buf.toString()) {
    //     fs.writeFileSync(filename, replaced)
    //     console.log("fixed imports at " + filename)
    // }
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

fromDir("./src", /\+ts\.js$/, renameToJustJS)
process.exit(1)

console.clear()
// rename *.js -> *+ts.ts so the plus-ts-compiler treat them as .ts files
// if everything compiles, rename -back
fromDir("./src", /\+ts\.js$/, renameToTS)


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

