import * as d from "../util/document.js"
import * as c from "../util/conversions.js"
import * as global from "../data/global.js"
import * as Pages from "../pages/main.js"
import * as Network from "../data/Network.js"
import * as near from "../api/near-rpc.js"
import * as rpc from "../api/utils/json-rpc.js"


/*+
type PoolInfo = {
      name:string;
      slashed: string;
      stake: string;
      stakeY: string;
      uptime: number;
      fee?: number;
}
+*/
function sortCompare(a/*:PoolInfo*/, b/*:PoolInfo*/) {
  if (a.stakeY > b.stakeY) return -1;
  return 1;
}


function clicked(name/*:string*/) {
  console.log(name);
  navigator.clipboard.writeText(name);
  d.showSuccess("Copied to clipboard: " + name)
  setTimeout(window.close,600);
  }

// ---------------------
// DOM Loaded - START
// ---------------------
async function onLoad() {

  try {

    const data = await near.getValidators()

    d.byId("net-name").innerText = Network.currentInfo().displayName;

    const list/*:PoolInfo[]*/ = []
    for (let item of data.current_validators) {
      list.push({
        name: item.account_id,
        slashed: item.is_slashed ? "yes" : "no",
        stake: c.yton(item.stake),
        stakeY: item.stake.padStart(50, "0"),
        uptime: Math.round(item.num_produced_blocks / item.num_expected_blocks * 100)
      })

    }

    list.sort(sortCompare);

    d.populateUL("list", "item-template", list)

    //query fees
    for (let item of data.current_validators) {
      near.getStakingPoolFee(item.account_id) //async get fees
        .then((fee) => {
          const elem = d.byId(item.account_id)
          elem.innerText = fee.toString();
          const parent = elem.parentElement;
          if (parent) {
            if (fee > 50) parent.classList.add("red")
            if (fee > 15) parent.classList.add("yellow")
            if (fee <= 8 && fee >= 0.5) parent.classList.add("green")
            const LI=parent.closest("LI");
            if (LI) {
              const button/*+:HTMLElement|null+*/ = LI.querySelector("button")
              if (button) {
                button.addEventListener("click", () => { clicked(item.account_id) })
                button.classList.remove("hidden");
              }
            }
          }
        })
        .catch((ex) => {
          console.error(ex)
        })
    }

  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

async function init(){
  try{
  chrome.storage.local.get("selectedNetwork",(data)=>{
    Network.setCurrent(data.selectedNetwork);
    onLoad();
  })
  }catch(ex){
    d.showErr(ex.message);
  }
}

document.addEventListener('DOMContentLoaded', init);

