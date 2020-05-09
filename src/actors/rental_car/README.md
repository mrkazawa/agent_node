# Rental Car Scenario #

This documents show how to run the actors for Rental Car IoT application use case.
To run fully run the scenrio here, you also need to run all of the engines in the Notary Node, which is available [here](https://github.com/mrkazawa/notary_node).

## Running Rental Car Application ##

We need to run two instances of Rental Car apps in the `notary1` and `notary2` terminals.
After ssh to the respective termminal, run the following commands.

```bash
cd ~/src
npm run rental-car # run this in notary1 and notary2
```

This command will deploy the smart contract and open REST API endpoints for our agents.

## Running Rental Car Agents ##

The Rental Car applications in the notary node need to run first before the following agents can work correctly.
The orders are crucial here.

### 1. Run the Car Backend ###

The Car Backend will simulate an IoT-based rental car that connects to the compute engine.
This instance will verify car access from the car renter.
It has to allow valid car renter to use the car and reject invalid or malicious car renter.

SSH to `agent3` then run.

```bash
cd ~/src
npm run car-backend
```

### 2. Run the Car Owner ###

The Car Owner simulates the owner of the car.
He push the car detail information to the storage engine.
Then, he push car metadata in the compute engine.

SSH to `agent1` then run.

```bash
cd ~/src
npm run car-owner
```

### 3. Run the Car Renter ###

The Car Renter will browse existing car in the application and pick one for rent.
Then, he conduct the rent payment in the payment engine.
After that, he submit the transaction hash from the payment engine to the app.
Once, his request is approved by the app, he signs an authenticated message to the car backend.

SSH to `agent2` then run.

```bash
cd ~/src
npm run car-renter
```

- - - -

## Benchmarking ##

You can run the following commands to iterate this scenario multiple times to get the recorded latency.
To run the default configuration:

```bash
cd ~/src
npm run car-backend # run this in agent3
npm run bench-car-owner # run this in agent1
npm run bench-car-renter # run this in agent2
```

This will iterate the scenario `1000` times.
To customize your iteration number, run the following instead.
Replace the `$your_iteration_number` with your desired iteration number, e.g. `50` times.

```bash
cd ~/src
npm run car-backend
ITERATION=$your_iteration_number node ./actors/rental_car/car_owner
ITERATION=$your_iteration_number node ./actors/rental_car/car_renter
```

To download the 'result' file from vagrant VM, run the following.
These csvs are recorded latency from segments of the application logics in this scenario.

```bash
scp vagrant@agent1.local:~/result_car_owner_detail.csv ~/.
scp vagrant@agent1.local:~/result_car_owner_metadata.csv ~/.

scp vagrant@agent2.local:~/result_car_renter_access_car.csv  ~/.
scp vagrant@agent2.local:~/result_car_renter_get_car.csv  ~/.
scp vagrant@agent2.local:~/result_car_renter_send_hash.csv  ~/.
scp vagrant@agent2.local:~/result_car_renter_send_payment.csv  ~/.

scp vagrant@notary1.local:~/result_rental_car_insert_car.csv  ~/.
scp vagrant@notary1.local:~/result_rental_car_task_2.csv  ~/.

scp vagrant@notary2.local:~/result_rental_car_verify_payment.csv  ~/.
scp vagrant@notary2.local:~/result_rental_car_task_1.csv ~/.
```

- - - -

## Known Issues ##

The `car owner`, `car renter`, and `car backend` needs to get the Contract ABI from the same source.
For example, all of them are getting the ABI from `notary1` in this example.
Because the way we run the rental-car app is both instances of rental car in `notary1` and `notary2` are deploying contract to the same network.
The generated ABI for `notary1` and `notary2` is different.
Therefore, if ABI is different then, the EVENT WILL NOT WORK. However, CONTRACT CALL STILL WORKS.
***Need further investigation!***
