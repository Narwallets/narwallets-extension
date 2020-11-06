
export function isValidEmail(email/*:string*/) /*:boolean*/ {

    let matches = email.match(/(?!.*\.\.)(^[^\.][^@\s]+@[^@\s]+\.[^@\s\.]+$)/);
    if (!matches || matches.length == 0) {
        return false;
    }
    else {
        let checkEmail = matches[0]
        if (!checkEmail || checkEmail != email) {
            return false;
        }
    }
    return true;
}
