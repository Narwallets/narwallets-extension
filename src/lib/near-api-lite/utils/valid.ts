/**
 * check if this is a valid near account id (syntax-wise)
 * @param accountId 
 */
export function isValidAccountID(accountId: string): boolean {
    const MIN_ACCOUNT_ID_LEN = 2;
    const MAX_ACCOUNT_ID_LEN = 64; //implicit accounts have 64 hex chars
    if (accountId.length < MIN_ACCOUNT_ID_LEN ||
        accountId.length > MAX_ACCOUNT_ID_LEN) {
        return false;
    }
    // The valid account ID regex is /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/
    // We can safely assume that last char was a separator.
    var last_char_is_separator = true;
    for (let n = 0; n < accountId.length; n++) {
        let c = accountId.charAt(n);
        let current_char_is_separator = c == "-" || c == "_" || c == ".";
        if (!current_char_is_separator &&
            !((c >= "a" && c <= "z") || (c >= "0" && c <= "9")))
            return false; //only 0..9 a..z and separators are valid chars
        if (current_char_is_separator && last_char_is_separator) {
            return false; //do not allow 2 separs together
        }
        last_char_is_separator = current_char_is_separator;
    }
    // The account can't end as separator.
    return !last_char_is_separator;
}

export function CheckValidAmount(amount: number) {
    if (isNaN(amount) || amount <= 0) throw Error("Invalid amount")
}

export function isValidEmail(email: string): boolean {

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
