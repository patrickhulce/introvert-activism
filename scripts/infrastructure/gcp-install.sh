#!/bin/bash

set -euxo pipefail

# Purge man-db because it destroys burstable instances for no good reason on headless server
sudo apt-get remove -y --purge man-db

# GCloud apt-key
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Node apt-key
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -

# Sleep because apt-get update sometimes fails?
sleep 5

# Install dependencies
sudo apt-get update || sudo apt-get update || sudo apt-get update
sudo apt-get install -y xvfb nodejs google-cloud-sdk git zip ffmpeg nginx
sudo npm install -g yarn pm2

# Setup nginx
sudo mv /tmp/gcp-nginx-site /etc/nginx/sites-available/default
sudo chown root.root /etc/nginx/sites-available/default
sudo chmod 0644 /etc/nginx/sites-available/default
sudo service nginx restart

# Add an activist user
sudo useradd -m -s $(which bash) -G sudo activist || echo 'activist already exists'
sudo mv /tmp/ssh_key /home/activist/ssh_key
sudo mv /tmp/env_vars /home/activist/.envrc
sudo chown activist.activist /home/activist/ssh_key /home/activist/.envrc

sudo -i -u activist bash <<EOF
cd /home/activist
mkdir -p .ssh/
touch .ssh/authorized_keys
cat ssh_key >> .ssh/authorized_keys
rm ssh_key

git clone --bare https://github.com/patrickhulce/introvert-activism.git introvert-activism.git/
git clone introvert-activism.git/ introvert-activism/
EOF

sudo mv /tmp/gcp-post-update.sh /home/activist/introvert-activism.git/hooks/post-update
sudo chown activist.activist /home/activist/introvert-activism.git/hooks/post-update
sudo chmod +x /home/activist/introvert-activism.git/hooks/post-update
sudo -i -u activist bash /home/activist/introvert-activism.git/hooks/post-update
