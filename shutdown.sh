#!/bin/bash

pgrep tennisCourtChecker | xargs kill

echo "Server Off"

exit 0
