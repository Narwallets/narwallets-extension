//ask background, wait for response, return a Promise
export function askBackground(requestPayload) {
    requestPayload.dest = "ext";
    return new Promise((resolve, reject) => {
        console.log("sendMessage", requestPayload);
        const timeout = setTimeout(() => { return reject(Error("timeout")); }, 10000);
        chrome.runtime.sendMessage(requestPayload, function (response) {
            clearTimeout(timeout);
            if (!response) {
                return reject(Error("response is empty"));
            }
            else if (response.err) {
                return reject(Error(response.err));
            }
            return resolve(response.data);
        });
    });
}
//# sourceMappingURL=askBackground.js.map