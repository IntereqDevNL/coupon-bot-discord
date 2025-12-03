🚀 Deployment Guide: Ubuntu Server 24.04 This guide provides step-by-step instructions to deploy the Virtnet Coupon Bot on a Linux server (Ubuntu 24.04) running as the root user.1. PrerequisitesLogin to your server via SSH and install the required runtime environment.# Update system packages
apt update && apt upgrade -y

# Install Node.js (Version 20.x)
curl -fsSL [https://deb.nodesource.com/setup_20.x](https://deb.nodesource.com/setup_20.x) | bash -
apt install -y nodejs

# Verify installation
node -v
npm -v
2. Prepare Directory & Transfer FilesFirst, create a folder on your server to hold the project files.# Create the project directory
mkdir -p /root/virtnet-coupon
Note: You can rename virtnet-coupon to anything you like (e.g., discord-bot), but you must remember to update the paths in the Service configuration (Step 4) to match your new name.Now, move the bot source code from your local machine to this new folder.Option A: WinSCP (Recommended for Windows)Download WinSCP.Connect to your server (Protocol: SFTP, User: root).Navigate to /root/virtnet-coupon/ on the server side.Drag your local bot folder to the server.Note: Do not upload the node_modules folder. We will generate it on the server.Option B: Command Line (Mac/Linux/PowerShell)# Replace 1.2.3.4 with your server IP
# This uploads the local 'bot' folder into the remote 'virtnet-coupon' folder
scp -r ./bot root@1.2.3.4:/root/virtnet-coupon/
3. Installation & SetupNavigate to the project folder and install dependencies.# 1. Enter the directory (Adjust path if you renamed the folder)
cd /root/virtnet-coupon/bot

# 2. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Initialize the local database
node setup_db.js
Configuration (.env)You must create the environment variables file on the server.Create the file:nano .env
Paste your credentials:DISCORD_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here
Save and exit (Ctrl+O, Enter, Ctrl+X).4. Setup Background Service (Systemd)We use systemd to keep the bot running 24/7 and automatically restart it if it crashes or the server reboots.Create the service file:nano /etc/systemd/system/virtnet-bot.service
Paste the configuration:Important: If you renamed the directory in Step 2, update WorkingDirectory below.[Unit]
Description=Virtnet Discord Bot
After=network.target

[Service]
# Running as root
User=root
# Path to your bot folder
WorkingDirectory=/root/virtnet-coupon/bot
# Command to start the bot
ExecStart=/usr/bin/node index.js
# Auto-restart config
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
Enable and Start:# Reload systemd to read the new file
systemctl daemon-reload

# Enable startup on boot
systemctl enable virtnet-bot

# Start the bot now
systemctl start virtnet-bot
5. Management CheatsheetUseful commands for managing your bot once it is running.Check Status (See if it's running):systemctl status virtnet-bot
View Logs (Real-time console output):journalctl -u virtnet-bot -f
Restart Bot (After updating code):systemctl restart virtnet-bot
Stop Bot:systemctl stop virtnet-bot
6. TroubleshootingError: invalid ELF headerThis happens if you copied node_modules from Windows/Mac to Linux. The sqlite3 library must be built specifically for the OS it runs on.Fix:cd /root/virtnet-coupon/bot
rm -rf node_modules package-lock.json
npm install
npm rebuild sqlite3
systemctl restart virtnet-bot
