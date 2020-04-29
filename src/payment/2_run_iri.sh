#!/bin/bash

cd ~/iri
java -jar target/iri-1.9.0.jar \
  --config ../src/payment/config/iri.ini \
  --snapshot ../src/payment/config/snapshot.txt