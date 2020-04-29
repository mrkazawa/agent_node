#!/bin/bash

if [[ ! -d ~/iri ]]; then
  cd ~/
  git clone https://github.com/iotaledger/iri
  cd iri
  mvn clean package

else
  echo "Skipping, IRI already cloned, and probably installed"
fi