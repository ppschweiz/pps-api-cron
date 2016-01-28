#!/bin/sh

node run.js

sleep $(( $(date -d "tomorrow 1:00" +%s) - $(date +%s) ))
