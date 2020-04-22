#!/usr/bin/env bash

if [ $# -eq 0 ]
  then
    echo "No arguments supplied, You need to put Peer ID of boot node as argument!"
  else
    # get Peer ID from argument
    BOOT_ID=$1
    # get IP of notary 1 as boot node
    BOOT_IP="10.0.0.11"
    
    # add boostrap to refer to notary1 as a bootnode
    IPFS_PATH=~/.ipfs ipfs bootstrap add /ip4/$BOOT_IP/tcp/4001/ipfs/$BOOT_ID
fi