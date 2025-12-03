# **🚀 Deployment Guide: Ubuntu Server 24.04 **

This guide provides step-by-step instructions to deploy the Virtnet Coupon Bot on a Linux server (Ubuntu 24.04) running as the **root** user.

## **1\. Prerequisites**

Login to your server via SSH and install the required runtime environment.

\# Update system packages  
apt update && apt upgrade \-y

\# Install Node.js (Version 20.x)  
curl \-fsSL \[https://deb.nodesource.com/setup\_20.x\](https://deb.nodesource.com/setup\_20.x) | bash \-  
apt install \-y nodejs

\# Verify installation  
node \-v  
npm \-v

## **2\. Prepare Directory & Transfer Files**

First, create a folder on your server to hold the project files.

\# Create the project directory  
mkdir \-p /root/virtnet-coupon

**Note:** You can rename virtnet-coupon to anything you like (e.g., discord-bot), but you **must** remember to update the paths in the Service configuration (Step 4\) to match your new name.

Now, move the bot source code from your local machine to this new folder.

### **Option A: WinSCP (Recommended for Windows)**

1. Download [WinSCP](https://winscp.net/eng/download.php).  
2. Connect to your server (Protocol: SFTP, User: root).  
3. Navigate to /root/virtnet-coupon/ on the server side.  
4. Drag your local bot folder to the server.  
   * **Note:** Do **not** upload the node\_modules folder. We will generate it on the server.

### **Option B: Command Line (Mac/Linux/PowerShell)**

\# Replace 1.2.3.4 with your server IP  
\# This uploads the local 'bot' folder into the remote 'virtnet-coupon' folder  
scp \-r ./bot root@1.2.3.4:/root/virtnet-coupon/

## **3\. Installation & Setup**

Navigate to the project folder and install dependencies.

\# 1\. Enter the directory (Adjust path if you renamed the folder)  
cd /root/virtnet-coupon/bot

\# 2\. Clean install dependencies  
rm \-rf node\_modules package-lock.json  
npm install

\# 3\. Initialize the local database  
node setup\_db.js

### **Configuration (.env)**

You must create the environment variables file on the server.

1. Create the file:  
   nano .env

2. Paste your credentials:  
   DISCORD\_TOKEN=your\_actual\_bot\_token\_here  
   CLIENT\_ID=your\_application\_id\_here  
   GUILD\_ID=your\_server\_id\_here

3. Save and exit (Ctrl+O, Enter, Ctrl+X).

## **4\. Setup Background Service (Systemd)**

We use systemd to keep the bot running 24/7 and automatically restart it if it crashes or the server reboots.

1. **Create the service file:**  
   nano /etc/systemd/system/virtnet-bot.service

2. **Paste the configuration:Important:** If you renamed the directory in Step 2, update WorkingDirectory below.  
   \[Unit\]  
   Description=Virtnet Discord Bot  
   After=network.target

   \[Service\]  
   \# Running as root  
   User=root  
   \# Path to your bot folder  
   WorkingDirectory=/root/virtnet-coupon/bot  
   \# Command to start the bot  
   ExecStart=/usr/bin/node index.js  
   \# Auto-restart config  
   Restart=always  
   RestartSec=10

   \[Install\]  
   WantedBy=multi-user.target

3. **Enable and Start:**  
   \# Reload systemd to read the new file  
   systemctl daemon-reload

   \# Enable startup on boot  
   systemctl enable virtnet-bot

   \# Start the bot now  
   systemctl start virtnet-bot

## **5\. Management Cheatsheet**

Useful commands for managing your bot once it is running.

**Check Status** (See if it's running):

systemctl status virtnet-bot

**View Logs** (Real-time console output):

journalctl \-u virtnet-bot \-f

**Restart Bot** (After updating code):

systemctl restart virtnet-bot

**Stop Bot**:

systemctl stop virtnet-bot

## **6\. Troubleshooting**

### **Error: invalid ELF header**

This happens if you copied node\_modules from Windows/Mac to Linux. The sqlite3 library must be built specifically for the OS it runs on.

**Fix:**

cd /root/virtnet-coupon/bot  
rm \-rf node\_modules package-lock.json  
npm install  
npm rebuild sqlite3  
systemctl restart virtnet-bot  
