const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. THE DATABASE HELPERS ---
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const INV_FILE = path.join(DATA_DIR, 'inventories.json');
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');

// Helper to read files safely without crashing
function readData(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return file.includes('inventories') ? {} : [];
    }
}

// --- 2. THE EMOJIS ---
const EMOJIS = {
    COMPUTER: '<:YS_COMPUTER:1444114271901450412>',
    BEAN: '<:YS_COFFEEBEAN:1394451580312490035>',
    COIN: '<:YS_COIN:1394451524096098337>'
};

// --- 3. COMMAND REGISTRATION ---
const commands = [
    { name: 'inventory', description: 'View your card collection' },
    { name: 'drop', description: 'Serve a triple card drop!' },
    { name: 'profile', description: 'View your currencies' },
    // (Other commands stay registered from yesterday)
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
})();

// --- 4. THE INVENTORY LOGIC ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;

    if (interaction.commandName === 'inventory') {
        const inv = readData(INV_FILE);
        const userCards = inv[userId] || [];

        if (userCards.length === 0) {
            return interaction.reply("Your inventory is empty! Use `/drop` to start your collection. ☕");
        }

        // Group cards by group/idol to keep it clean
        const inventoryList = userCards.map((card, index) => {
            return `\`${index + 1}.\` ${card.emoji} **${card.name}** (${card.group}) - \`${card.code}\``;
        }).join('\n');

        const invEmbed = new EmbedBuilder()
            .setTitle(`${EMOJIS.COMPUTER} ${interaction.user.username}'s Collection`)
            .setDescription(inventoryList.length > 2000 ? inventoryList.substring(0, 1990) + "..." : inventoryList)
            .setColor('#D2B48C')
            .setFooter({ text: `Total Cards: ${userCards.length}` });

        await interaction.reply({ embeds: [invEmbed] });
    }

    // --- RE-FIXED DROP COMMAND (To prevent "Not Responding") ---
    if (interaction.commandName === 'drop') {
        const cards = readData(CARDS_FILE);
        if (cards.length < 3) return interaction.reply("You need to add at least 3 cards with `/addcard` first!");

        // We use "deferReply" to stop the "Not Responding" error while the bot thinks
        await interaction.deferReply();

        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);
        const embed = new EmbedBuilder()
            .setTitle('☕ Fresh Cafe Drop!')
            .setDescription(`1️⃣ ${selected[0].emoji} **${selected[0].name}**\n2️⃣ ${
