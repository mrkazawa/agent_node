#!/bin/bash

if [[ -d ~/iri ]]; then
  if [ $# -eq 0 ]; then
    echo "No arguments supplied, You need to put Coordinator address as argument!"

  else
    COO_ADDRESS=$1
    configdir=~/src/payment/config

    sigMode=$(jq -r .sigMode $configdir/config.json)
    security=$(jq .security $configdir/config.json)
    depth=$(jq .depth $configdir/config.json)
    mwm=$(jq .mwm $configdir/config.json)
    milestoneStart=$(jq .milestoneStart $configdir/config.json)

    cd ~/iri
    java -jar target/iri-1.9.0.jar \
      --remote true \
      --remote-limit-api "removeNeighbors, addNeighbors" \
      --testnet true \
      --testnet-coordinator $COO_ADDRESS \
      --testnet-coordinator-security-level $security \
      --testnet-coordinator-signature-mode $sigMode \
      --auto-tethering true \
      --neighbors tcp://10.0.0.11:15600 \
      --max-neighbors 5 \
      --mwm $mwm \
      --milestone-start $milestoneStart \
      --milestone-keys $depth \
      --snapshot $configdir/snapshot.txt \
      --max-depth 1000 $@
  fi

else
  echo "Skipping, IRI has not been installed yet!"
fi
