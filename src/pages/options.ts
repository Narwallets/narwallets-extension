const OPTIONS = "options";
import {
  askBackground,
  askBackgroundGetNetworkInfo,
  askBackgroundGetSettings,
} from "../askBackground.js";
import * as Pages from "./main.js";
import * as d from "../util/document.js";
import { SecureSettings } from "../structs/state-structs.js";
import { getNetworkConfig, NetworkConfig, NetworkNameAndRpcIndex } from "../lib/near-api-lite/network-types.js";

export let readData: SecureSettings;
export let networkInfoOnOpen: NetworkNameAndRpcIndex;

async function showInitial() {
  d.showPage(OPTIONS);
  readData = await askBackgroundGetSettings();
  if (!readData.selectedRpcIndex) {
    readData.selectedRpcIndex = {}
  }
  d.inputById("autolock-seconds-input").value = readData.autoUnlockSeconds.toString();

  // get actual network info
  networkInfoOnOpen = await askBackgroundGetNetworkInfo();
  // on discrepancy, use the current network rpc index
  if (networkInfoOnOpen.rpcIndex && networkInfoOnOpen.rpcIndex !== readData.selectedRpcIndex[networkInfoOnOpen.name]) {
    readData.selectedRpcIndex[networkInfoOnOpen.name] = networkInfoOnOpen.rpcIndex
  }

  const rpcUrls = getNetworkConfig(networkInfoOnOpen.name).rpcUrls;

  // set radio-buttons based on currentRpcIndex
  for (let i = 0; i < 5; i++) {
    const rpcServerRadio = document.getElementById(`select-rpc-${i}`) as HTMLInputElement
    if (rpcServerRadio) {
      rpcServerRadio.checked = (i == networkInfoOnOpen.rpcIndex)
      const outOfRange = (i >= rpcUrls.length)
      const encloser = d.qs(`#settings-select-rpc-${i}`)
      encloser.hidden = outOfRange
      if (!outOfRange) {
        const label = encloser.sub("label")
        label.innerText = rpcUrls[i]
      }
    }
  }
}

async function saveSecurityOptions(ev: Event) {
  try {
    ev.preventDefault();
    const aulSecs = Number(d.inputById("autolock-seconds-input").value);
    if (isNaN(aulSecs)) throw Error("Invalid autolock seconds");
    if (aulSecs < 60) throw Error("Autolock minimum is 60 seconds");
    readData.autoUnlockSeconds = aulSecs

    let selectedRpcIndex: number;
    for (selectedRpcIndex = 5; selectedRpcIndex > 0; selectedRpcIndex--) {
      const el = document.getElementById(`select-rpc-${selectedRpcIndex}`)
      if (el && (el as HTMLInputElement).checked) break;
    }
    readData.selectedRpcIndex[networkInfoOnOpen.name] = selectedRpcIndex

    await askBackground({
      code: "set-options",
      data: readData
    });

    Pages.show();
    // d.showSuccess("Options saved");
  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

export async function show() {

  d.onClickId("save-settings", saveSecurityOptions);
  d.onClickId("cancel-security-settings", Pages.show);

  await showInitial();
}

