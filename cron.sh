#!/bin/sh

node run.js

sleep $(( $(date -d "tomorrow 3:00" +%s) - $(date +%s) ))
