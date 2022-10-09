import * as d from "../util/document.js"
import * as c from "../util/conversions.js"
import * as StakingPool from "../contracts/staking-pool.js"

import { askBackgroundGetNetworkInfo, askBackgroundGetValidators } from "../askBackground.js"
import { activeNetworkInfo } from "../askBackground.js"



type PoolInfo = {
  name: string;
  slashed: string;
  stake: string;
  stakeY: string;
  uptime: number;
  fee?: number;
}


function clicked(name: string) {
  //console.log(name);
  navigator.clipboard.writeText(name);
  d.showSuccess("Copied to clipboard: " + name)
  setTimeout(window.close, 600);
}

// ---------------------
async function displayStakingPools() {

  d.showWait()
  try {

    const data = await askBackgroundGetValidators()

    d.byId("net-name").innerText = activeNetworkInfo.displayName;

    const list: PoolInfo[] = []
    for (let item of data.current_validators) {
      list.push({
        name: item.account_id,
        slashed: item.is_slashed ? "yes" : "no",
        stake: c.ytonString(item.stake),
        stakeY: item.stake.padStart(50, "0"),
        uptime: item.num_expected_blocks==0?0: Math.round(item.num_produced_blocks / item.num_expected_blocks * 100)
      })

    }

    // sort desc by uptime
    list.sort((a: PoolInfo, b: PoolInfo) => b.uptime - a.uptime);

    const TEMPLATE = `
    <li id="{name}">
      <div class="name">{name}</div>
      <div class="stake balance">Stake: {stake}</div>
      <div class="block production">Block Production: {uptime}%</div>
      <div class="slashed">Slashed? {slashed}</div>
      <div class="fee-line">
          <span class="fee">Fee: <span id="{name}-fee">?</span>%</span>
      </div>
      <button class="select small hidden">Copy to clip</button>
    </li>
    `;
    d.populateUL("list", TEMPLATE, list)

    //query fees
    for (let item of list) {
      StakingPool.getFee(item.name) //async get fees
        .then((fee) => {
          //debug
          // if (item.name.indexOf("node0") != -1) {
          //   //console.log(fee)
          // }
          const elem = d.byId(item.name)

          if (item.uptime >= 90) {
            // do not colorate low-perf nodes
            const feeSpan = d.byId(item.name + "-fee")
            feeSpan.innerText = fee.toString();
            const feeBox = feeSpan.parentElement;
            if (feeBox) {
              if (fee >= 30) feeBox.classList.add("red")
              else if (fee > 10) feeBox.classList.add("orange")
              else if (fee >= 5) feeBox.classList.add("yellow")
              else feeBox.classList.add("green")
            }
            if (fee > 0 && fee < 50) {
              const button: HTMLElement | null = elem.querySelector("button")
              if (button) {
                button.addEventListener("click", () => { clicked(item.name) })
                button.classList.remove("hidden");
              }
            }
          }
        })
        .catch((ex) => {
          console.log(ex)
          //no contract on account_id
          const elem = d.byId(item.name)
          elem.classList.add("hidden") //bye bye 
        })
    }

  }
  catch (ex) {
    d.showErr(ex.message)
  }
  finally {
    d.hideWait()
  }
}

// ---------------------
// DOM Loaded - START
// ---------------------
async function init() {
  try {
    await askBackgroundGetNetworkInfo();
    displayStakingPools();
  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

document.addEventListener('DOMContentLoaded', init);

