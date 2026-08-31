#!/bin/bash
# VPS Setup script for n8n

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing Docker..."
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker

echo "Setup completed successfully!"
