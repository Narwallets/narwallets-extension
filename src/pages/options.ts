const OPTIONS = "options";
import {
  askBackground,
  askBackgroundGetSettings,
} from "../askBackground.js";
import * as Pages from "./main.js";
import { GContact } from "../data/contact.js";
import * as d from "../util/document.js";
import { setRpcUrl } from "../lib/near-api-lite/utils/json-rpc.js";
import * as Network from "../lib/near-api-lite/network.js";
import { SecureSettings } from "../structs/state-structs.js";

export let readData: SecureSettings;

export async function show() {

  d.onClickId("save-settings", saveSecurityOptions);
  d.onClickId("cancel-security-settings", Pages.show);

  await showInitial();
}
async function saveSecurityOptions(ev: Event) {
  try {
    ev.preventDefault();
    const aulSecs = Number(d.inputById("autolock-seconds-input").value);
    if (isNaN(aulSecs)) throw Error("Invalid autolock seconds");
    if (aulSecs < 60) throw Error("Autolock minimum is 60 seconds");
    readData.autoUnlockSeconds = aulSecs

    const info = Network.getInfo(Network.currentNetworkName); // get & check
    let rpcIndex: number;
    for (rpcIndex = 5; rpcIndex > 0; rpcIndex--) {
      const el = document.getElementById(`select-rpc-${rpcIndex}`)
      if (el && (el as HTMLInputElement).checked) break;
    }
    readData.selectedRpcIndex[Network.currentNetworkName] = rpcIndex

    await askBackground({
      code: "set-options",
      data: readData
    });

    Pages.show();
    // d.showSuccess("Options saved");
  } catch (ex) {
    d.showErr(ex.message);
  }
}


async function showInitial() {
  d.showPage(OPTIONS);
  readData = await askBackgroundGetSettings();
  if (!readData.selectedRpcIndex) {
    readData.selectedRpcIndex = {}
  }
  d.inputById("autolock-seconds-input").value = readData.autoUnlockSeconds.toString();

  const info = Network.getInfo(Network.currentNetworkName); // get & check
  for (let i = 0; i < 5; i++) {
    const rpcServerRadio = document.getElementById(`select-rpc-${i}`) as HTMLInputElement
    if (rpcServerRadio == null) break;
    rpcServerRadio.checked = (i == info.currentRpcIndex)
    const encloser = d.qs(`#settings-select-rpc-${i}`)
    const outOfRange = (i >= info.rpcUrls.length)
    encloser.hidden = outOfRange
    if (!outOfRange) {
      const label = encloser.sub("label")
      label.innerText = info.rpcUrls[i]
    }
  }
}
