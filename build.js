import { createRequire } from 'module';
import ts from 'plus-typescript';
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

function copyFolderSync(from, to) {
    try {
      fs.mkdirSync(to);
    } catch(e) {}
  
    fs.readdirSync(from).forEach((element) => {
      const stat = fs.lstatSync(path.join(from, element));
      if (stat.isFile()) {
        fs.copyFileSync(path.join(from, element), path.join(to, element));
      } else if (stat.isSymbolicLink()) {
        fs.symlinkSync(fs.readlinkSync(path.join(from, element)), path.join(to, element));
      } else if (stat.isDirectory()) {
        copyFolderSync(path.join(from, element), path.join(to, element));
      }
    });
  }

//-- execute tsc on a specific dir
function tsc(runPath/*:string*/, extraArgs/*:string[]*/){
    console.log(process.cwd())
    const args=["tsc","-build","-verbose",...extraArgs||[]]
    const execResult = child_process.spawnSync("npx",args, { stdio: 'inherit', cwd:runPath})
    if (execResult.error) {
        console.log(execResult.error)
        process.exit(1)
    }
    if (execResult.status != 0) {
        process.exit(execResult.status)
    }
}


// ---------------------
// ---START BUILD TASKS
// ---------------------
console.clear()
console.log("build",Date.now())
//-----------------------------------------
//-- compile api-ts
tsc("./extension/api") //,["--module","esnext"])

// read tsconfig.json
var buf = fs.readFileSync("tsconfig.json")
try{
var tsconfig = JSON.parse(buf)
}
catch(ex){
    console.error("ERR parsing tsconfig.json")
    console.error(ex)
    const keyPart="JSON at position "
    let n = ex.message.indexOf(keyPart)
    if (n!=-1) {
        const i = n+keyPart.length
        const pos = Number(ex.message.slice(i,i+5))
        if (pos){
            console.error("INFO: position",pos-20,"to",pos+20)
            console.error("...",buf.slice(pos-20,pos+20).toString(),"...")
        }
    }
    process.exit(1)
}
//console.log(JSON.stringify(tsconfig))

// get all files .js under /extension except /extension/api & bundled-libs.js
let files=[]
fromDir("./extension", /\.js$/, (filename)=>{
    if (!filename.endsWith("bundled-libs.js") && filename.indexOf("/api/")==-1) {
      files.push(filename)
    }
  })

const asString = JSON.stringify(files)
if (JSON.stringify(tsconfig.files)!==asString){
    tsconfig.files = files;
    fs.writeFileSync("tsconfig.json",JSON.stringify(tsconfig,null,2))
    console.log("tsconfig.json updated")
}

//call installed tsc compiler: npx tsc
tsc(".")
console.log("INFO: plus-tsc build completed")
