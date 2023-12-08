#!/bin/bash
set -e
export NEAR_ENV="testnet"

WHITELIST_CONTRACT="metavote.testnet"
LOCKUP_WASM="lockup_contract.wasm"

echo $NEAR_ENV $LOCKUP_WASM $WHITELIST_CONTRACT $(date) 

YOCTO_UNITS="000000000000000000000000"
TOTAL_PREPAID_GAS="300000000000000"

#OWNER_ACCOUNT=testnearfree.testnet
#OWNER_ACCOUNT=kunchotester.testnet
#OWNER_ACCOUNT=manzatest.testnet
OWNER_ACCOUNT=lockupt.testnet
#OWNER_ACCOUNT=asimov.testnet
LOCKUP_ACCOUNT=$(node get-lockup-account-name.js $OWNER_ACCOUNT).lockupy.testnet

# Deploy Contract
set -x
# near delete $LOCKUP_ACCOUNT "lockupy.testnet"
near create-account $LOCKUP_ACCOUNT --masterAccount=lockupy.testnet --initial-balance=68
near deploy --wasmFile $LOCKUP_WASM  --initFunction new \
--initArgs '{"owner_account_id": "'$OWNER_ACCOUNT'", "lockup_duration": "0", "lockup_timestamp": "1535760000000000000", "release_duration": "126230400000000000", "transfers_information": {"TransfersEnabled": {"transfers_timestamp": "1602614338293769340"}}, "vesting_schedule": {"VestingSchedule": {"start_timestamp": "1535760000000000000", "cliff_timestamp": "1567296000000000000", "end_timestamp": "1661990400000000000"}}, "staking_pool_whitelist_account_id": "happy-whitelist.testnet", "foundation_account_id": "'$OWNER_ACCOUNT'"}' \
--accountId=$LOCKUP_ACCOUNT --initGas=25000000000000
near call $LOCKUP_ACCOUNT select_staking_pool '{"staking_pool_account_id":"other-pool.testnet"}' --accountId $OWNER_ACCOUNT --gas=25000000000000
