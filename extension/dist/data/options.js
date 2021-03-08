import { recoverFromLocalStorage, localStorageSave } from "./util.js";
const DATA_VERSION = "0.1";
export const EmptyOptions = {
    dataVersion: DATA_VERSION,
    advanced: false,
};
export var options = Object.assign({}, EmptyOptions);
export async function recoverOptions() {
    options = await recoverFromLocalStorage("options", "opt", EmptyOptions);
}
export function saveOptions() {
    localStorageSave("options", "opt", options);
}
//# sourceMappingURL=options.js.map