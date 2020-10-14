// dummy require fn
//include js dependencies in the HTML file
function require(url) {
    try {
        //simulates node require(). 
        //That's what TS was checking while compiling in node
        switch (url.replace(/\.\./g, ".").replace(/\.\//g, "").replace(".js", "").replace(".ts", "")) {
            case "util/js-sha256": {
                return {
                    sha256: window.sha256
                }
            }
            case "tweetnacl/nacl-fast": {
                if (!window.nacl) window.nacl={}
                return window.nacl;

            }
            case "tweetnacl/nacl-util": {
                if (!window.nacl) window.nacl={}
                return window.nacl.util;

            }
        }
    }
    catch (ex) {
        console.log(ex);
    }
}

