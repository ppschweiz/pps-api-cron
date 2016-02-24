#!/bin/sh

while :
do
	echo $(date)
	node run.js
	sleep $(( $(date -d "tomorrow 1:00" +%s) - $(date +%s) ))
done

