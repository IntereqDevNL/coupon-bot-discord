require('dotenv').config(); // Load .env variables
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, Events, MessageFlags } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

// --- CONFIGURATION ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DB_PATH = './coupons.db';
const API_PORT = process.env.API_PORT || 3000;

// The Questions and Answers
const TASKS = [
    {
        question: "Task 1: What comes after 1, 2, 3...?",
        answer: "4"
    },
    {
        question: "Task 2: Type the secret password (hint: it's 'open').",
        answer: "open"
    },
    {
        question: "Task 3: What is 5 + 5?",
        answer: "10"
    }
];

// --- INITIALIZATION ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // Required to receive DMs
});

// Connect to Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("Could not connect to database:", err.message);
    else console.log("Connected to local database.");
});

// Store user progress in memory: { userId: currentQuestionIndex }
const userProgress = new Map();

// --- API SERVER SETUP (EXPRESS) ---
const app = express();

app.get('/api/stats', (req, res) => {
    // Read from the persistent stats table
    db.get("SELECT total_coupons_given FROM bot_stats WHERE id = 1", [], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({
            status: "success",
            lifetime_coupons_given: row ? row.total_coupons_given : 0,
            timestamp: new Date().toISOString()
        });
    });
});

app.listen(API_PORT, () => {
    console.log(`API Server running on http://localhost:${API_PORT}`);
});


// --- HELPER FUNCTIONS ---

function hasUserClaimed(userId) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM coupons WHERE claimed_by = ?", [userId], (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
        });
    });
}

function claimCoupon(userId) {
    return new Promise((resolve, reject) => {
        // We use serialize to ensure these 3 database steps happen in order
        db.serialize(() => {
            
            // 1. Find an available code
            db.get("SELECT id, code FROM coupons WHERE claimed_by IS NULL LIMIT 1", [], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve(null); // No codes left

                const couponId = row.id;
                const couponCode = row.code;

                // 2. Mark it as claimed
                db.run("UPDATE coupons SET claimed_by = ? WHERE id = ?", [userId, couponId], function(err) {
                    if (err) return reject(err);

                    // 3. Increment the global counter (The new part!)
                    db.run("UPDATE bot_stats SET total_coupons_given = total_coupons_given + 1 WHERE id = 1", function(err) {
                        if (err) console.error("Failed to update stats counter:", err);
                        // We resolve even if the counter fails, because the user got their code.
                        resolve(couponCode);
                    });
                });
            });
        });
    });
}

// --- SLASH COMMAND REGISTRATION ---
const commands = [
    new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Start the coupon quest!'),
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- BOT EVENTS ---

client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        console.log(`Started refreshing application (/) commands for Guild: ${GUILD_ID}.`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// 1. HANDLE SLASH COMMANDS
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'quiz') {
        const userId = interaction.user.id;

        try {
            const claimed = await hasUserClaimed(userId);
            if (claimed) {
                return interaction.reply({ content: "You have already claimed a coupon code! Save some for others.", flags: MessageFlags.Ephemeral });
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: "Database error checking your status.", flags: MessageFlags.Ephemeral });
        }

        if (userProgress.has(userId)) {
            return interaction.reply({ content: "You are already in the quiz! Check your DMs.", flags: MessageFlags.Ephemeral });
        }

        userProgress.set(userId, 0);
        
        try {
            await interaction.user.send(`**Welcome to the Coupon Quest!**\n\n${TASKS[0].question}`);
            await interaction.reply({ content: "I've sent you a DM to start the tasks! Check your Direct Messages.", flags: MessageFlags.Ephemeral });
        } catch (error) {
            userProgress.delete(userId);
            await interaction.reply({ content: "I couldn't DM you. Please enable DMs from server members in your privacy settings.", flags: MessageFlags.Ephemeral });
        }
    }
});

// 2. HANDLE ANSWERS (Only in DM)
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const content = message.content.trim().toLowerCase();

    if (message.channel.isDMBased() && userProgress.has(userId)) {
        const currentStep = userProgress.get(userId);
        const currentTask = TASKS[currentStep];

        if (content === currentTask.answer.toLowerCase()) {
            const nextStep = currentStep + 1;

            if (nextStep < TASKS.length) {
                userProgress.set(userId, nextStep);
                return message.reply(`Correct!\n\n${TASKS[nextStep].question}`);
            } else {
                userProgress.delete(userId);
                
                try {
                    const code = await claimCoupon(userId);
                    if (code) {
                        return message.reply(`🎉 **Congratulations!** You passed all tasks.\n\nYour Coupon Code: \`${code}\``);
                    } else {
                        return message.reply("🎉 **Congratulations!** You passed... but sadly we have run out of codes! Contact An Administrator.");
                    }
                } catch (err) {
                    console.error(err);
                    return message.reply("An error occurred while retrieving your code. Please contact an admin.");
                }
            }
        } else {
            return message.reply("That is incorrect. Try again!");
        }
    }
});

client.login(TOKEN);