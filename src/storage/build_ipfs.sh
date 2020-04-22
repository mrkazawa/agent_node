#!/usr/bin/env bash

# initiate the IPFS node
IPFS_PATH=~/.ipfs ipfs init
# deleting the bootstrap node and peer identity
IPFS_PATH=~/.ipfs ipfs bootstrap rm --all