#!/bin/bash

set -euxo pipefail

# Prerequisites:
#   - You have your SSH public key at ~/.ssh/id_rsa.pub
#   - brew cask install google-cloud-sdk
#   - gcloud auth login
#   - export JWT_SECRET="<some very long alphanumeric secret>"
#   - export CLOUDSDK_CORE_PROJECT="<the project>"
#   - export PUBLIC_INTROVERTACTIVISM_ORIGIN="<the origin you're exposing to internet>"

# See the following documentation for options:
#   - Images https://cloud.google.com/compute/docs/images#ubuntu
#   - Instance Types https://cloud.google.com/compute/vm-instance-pricing#e2_sharedcore_machine_types
#   - Zones https://cloud.google.com/compute/docs/regions-zones

ZONE="us-central1-a"
INSTANCE_TYPE="e2-micro"

gcloud compute instances create introvert-activism-server \
      --image-family=ubuntu-1804-lts --image-project=ubuntu-os-cloud \
      --boot-disk-size=10GB \
      --zone=$ZONE \
      --machine-type=$INSTANCE_TYPE \
      --tags http-server,https-server

cat > .tmp_env_vars <<EOF
export TWILIO_PRODUCTION=yes
export TWILIO_SID="$TWILIO_SID"
export TWILIO_TOKEN="$TWILIO_TOKEN"
export TWILIO_NUMBER="$TWILIO_NUMBER"
export PUBLIC_INTERNET_PREFIX="$PUBLIC_INTROVERTACTIVISM_ORIGIN"
export JWT_SECRET="$JWT_SECRET"
EOF

# Instance needs time to start up.
until gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./.tmp_env_vars introvert-activism-server:/tmp/env_vars --zone="$ZONE"
do
  echo "Waiting for start up ..."
  sleep 10
done
rm .tmp_env_vars

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./scripts/infrastructure/gcp-install.sh introvert-activism-server:/tmp/gcp-install.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./scripts/infrastructure/gcp-post-update.sh introvert-activism-server:/tmp/gcp-post-update.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./scripts/infrastructure/gcp-nginx-site introvert-activism-server:/tmp/gcp-nginx-site --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ~/.ssh/id_rsa.pub introvert-activism-server:/tmp/ssh_key --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh introvert-activism-server --command="bash /tmp/gcp-install.sh" --zone="$ZONE"

gcloud compute instances list

set +x

echo 'Instance is up!'
echo 'You can ssh into the instance with...'
echo " $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh activist@introvert-activism-server --zone=$ZONE"

# Destroy it with
echo 'You can destroy this instance with...'
echo " $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances delete introvert-activism-server"

