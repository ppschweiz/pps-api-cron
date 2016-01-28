#!/bin/sh
docker rm pps-api-cron
docker build -t pps-api-cron .
docker run --name pps-api-cron \
-e CIVICRM_SITE_KEY=37cc3ffd53f3359c92277c6505d89989 \
-e CIVICRM_API_KEY=qS9C8WyKLVmdwxBu4ApSBM7c \
-e CIVICRM_SERVER=https://members-crm.piratenpartei.ch \
-e PPSAPI_PAYSECRET=59349bb7815f8ef8f623196183f4b351662548dda07d5e05a1c9b02248361486 \
-e PPSAPI_URL="https://api.piratenpartei.ch" \
-e PPSAPI_PAYLINKURL=https://www.piratenpartei.ch \
pps-api-cron

