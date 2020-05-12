# Agent Node #

This repository is the implementation of the agent node from our paper "", which is published [here]().
To run fully run all of the engines here, you also need to run all of the engines in the Notary Node, which is available [here](https://github.com/mrkazawa/notary_node).

## Installation ##

You need `vagrant` and `virtualbox` for this project.
So install them first if you do not have it yet in your machine.
You can download them [here](https://www.vagrantup.com/downloads.html) and [here](https://www.virtualbox.org/wiki/Downloads).
All of the required softwares and tools has been included in the `Vagrantfile` and it will be installed during the `vagrant up` using shell provisioning scripts in `/shell` directory.

```console
foo@ubuntu:~$ cd ~/
foo@ubuntu:~$ git clone https://github.com/mrkazawa/agent_node.git
foo@ubuntu:~$ cd ~/agent_node

foo@ubuntu:~$ vagrant up # if it is our first time, this will take some times
foo@ubuntu:~$ vagrant rsync-auto

foo@ubuntu:~$ vagrant ssh agent1 # open another terminal for agent1 (car owner)
foo@ubuntu:~$ vagrant ssh agent2 # open another terminal for agent2 (car renter)
foo@ubuntu:~$ vagrant ssh agent3 # open another terminal for agent3 (car backend)
```

Inside the SSH instances, we need to install all of the Node JS dependencies.
Run this in all proxy nodes (`agent1` to `agent3`).

```console
vagrant@agent1:~$ cd ~/src
vagrant@agent1:~$ npm install

vagrant@agent1:~$ npm run-script # show all available NPM commands
```

Other useful commands,

```console
foo@ubuntu:~$ cd ~/agent_node
foo@ubuntu:~$ vagrant reload # to restart VM
foo@ubuntu:~$ vagrant halt # to shutdwon VM
foo@ubuntu:~$ vagrant destroy -f # to completely delete VM
```

- - - -

## Running the Engines ##

Run this in all proxy nodes (`agent1` to `agent3`).

### 1. Run the Storage Engine ###

First of all, lets create an IPFS instance.

```console
vagrant@agent1:~$ cd ~/src
vagrant@agent1:~$ npm run ipfs-build # initiate IPFS
```

Get the swarm key from the boot node.
Run the following command in `notary1` terminal.

```console
vagrant@notary1:~$ cat ~/.ipfs/swarm.key
```

This will output something like this

```bash
/key/swarm/psk/1.0.0/
/base16/
deb1aeca7acd63417d6ba13d6d8c8f894bd2d18f5dc67892214397372f562b5d
```

Copy the contents and create the same file in `agent1` terminal.

```console
vagrant@agent1:~$ touch ~/.ipfs/swarm.key
vagrant@agent1:~$ nano ~/.ipfs/swarm.key

# now paste the same contents from notary 1 swarm.key to this file
# Ctrl + X and then Y, to save and exit
```

Get the Peer ID of the IPFS boot node.
Run the following command in `notary1` terminal.

```console
vagrant@notary1:~$ IPFS_PATH=~/.ipfs ipfs config show | grep "PeerID" | cut -d ":" -f2 | grep -o '".*"' | sed 's/"//g'
```

Copy the output, back to `agent1` terminal, and replace `$your_boot_node_peer_id` with the output

```console
vagrant@agent1:~$ cd ~/src
vagrant@agent1:~$ chmod +x ./storage/add_boot_ipfs.sh && ./storage/add_boot_ipfs.sh $your_boot_node_peer_id
vagrant@agent1:~$ npm run ipfs-start # to start IPFS daemon
vagrant@agent1:~$ npm test # if all is working correctly, the test should pass
```

Additional commands,

```console
vagrant@agent1:~$ npm run ipfs-stop # to stop IPFS daemon
vagrant@agent1:~$ npm run ipfs-destroy # to destroy IPFS instance
```

### 2. Run the Compute Engine ###

At this moment, we use ganache network for our compute engine.
Therefore, the agents are not running any Ethereum node.
You can change the location of the ganache network by modifying the `web3.js` in `src/compute/web3.js`.

**TODO:** move the implementation to use Geth instead.

### 3. Run the Payment Engine ###

For now, we still uses one IRI and one COO.
The agents are not running any IRI node.
You can change the location of the IOTA network by modifying the `iota.js` in `src/payment/iota.js`.

**TODO:** move the implementation to use multiple IRI nodes.

The following snippets are steps for multiple IRIs.
The IRI node can connect to one another but the snapshot is not working.
Only one node has the correct IOTA balances according to the snapshot.
***Need further investigation!***

First of all, clone and install IRI.

```console
vagrant@agent1:~$ cd ~/src
vagrant@agent1:~$ chmod +x ./payment/1_install_iri.sh && ./payment/1_install_iri.sh
```

Open a terminal in the `notary1` node, then run this command to get the Coordinator address.

```console
vagrant@notary1:~$ cat ~/compass/docs/private_tangle/data/layers/layer.0.csv
```

Back to the `agent` terminal.
Copy the previous output and paste it as a parameter of `$your_coo_address` in the command below.

```console
vagrant@agent1:~$ cd ~/src
vagrant@agent1:~$ chmod +x ./payment/2_run_iri.sh && ./payment/2_run_iri.sh $your_coo_address
```

The configuration of the IRI node parameter can be tweaked in `src/payment/config/config.json`. Meanwhile, the snapshot file can be tweaked in `src/payment/config/snapshot.txt`.

- - - -

## Running the IoT Agents for Apps ##

This repository provides examples of IoT agents implementation for IoT apps.
These agent nodes are complementary nodes that lives along with the Notary Node to provide IoT application use cases.
Please refer to the paper for more details.
So far, we only have a 'Rental Car' IoT application in `src/actors/rental_car`.
In the future, we may add more use cases example.

Follow the instruction in [here](https://github.com/mrkazawa/agent_node/tree/master/src/actors/rental_car) to run the Rental Car scenario.

**TODO:** add more IoT agents example.

- - - -

## Known Issues ##

If the node cannot ping to one another, perhaps it has the problem with the Avahi DNS.
Try to ping to itself using the configured domain in all nodes.
Then, try to ping one another.

```console
vagrant@agent1:~$ ping agent1.local # run this in agent #1
vagrant@agent2:~$ ping agent2.local # run this in agent #2
vagrant@agent3:~$ ping agent3.local # run this in agent #3

# then try to ping one another, this should solves the issues
```

## Authors ##

- **Yustus Oktian** - *Initial work*

## Acknowledgments ##

- Hat tip to anyone whose code was used
- Fellow researchers
- Korea Government for funding this project
