const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DATA_FILE = './cards.json';

// --- 1. DATA STORAGE ---
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));
function getCards() { return JSON.parse(fs.readFileSync(DATA_FILE)); }
function saveCard(card) {
    const cards = getCards();
    cards.push(card);
    fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2));
}

// --- 2. COOLDOWN TRACKING ---
// We use a Map to store the EXACT time someone can use a command again
const cooldowns = new Map(); 

function getRemainingTime(userId, type) {
    const key = `${userId}_${type}`;
    const expiration = cooldowns.get(key);
    if (!expiration) return "Ready! ✅";
    
    const now = Date.now();
    if (now >= expiration) return "Ready! ✅";
    
    const diff = expiration - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (hours > 24) return `${Math.floor(hours/24)}d ${hours%24}h remaining`;
    return `${hours}h ${minutes}m ${seconds}s`;
}

// --- 3. COMMANDS ---
const commands = [
    { name: 'drop', description: 'Drop a random card (1 min cooldown)' },
    { name: 'daily', description: 'Claim your daily cafe reward' },
    { name: 'weekly', description: 'Claim your weekly cafe reward' },
    { name: 'cooldowns', description: 'Check your cafe timers' },
    {
        name: 'addcard',
        description: 'OWNER ONLY: Add a card',
        options: [
            { name: 'code', description: 'ATZYS#001', type: 3, required: true },
            { name: 'name', description: 'Name', type: 3, required: true },
            { name: 'group', description: 'Group', type: 3, required: true },
            { name: 'rarity', description: 'Emoji', type: 3, required: true },
            { name: 'image', description: 'Upload', type: 11, required: true }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    } catch (e) { console.error(e); }
})();

// --- 4. INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;

    // --- COOLDOWNS COMMAND ---
    if (interaction.commandName === 'cooldowns') {
        const embed = new EmbedBuilder()
            .setTitle(`⏳ ${interaction.user.username}'s Cafe Timers`)
            .setColor('#D2B48C')
            .addFields(
                { name: '☕ Next Drop', value: getRemainingTime(userId, 'drop'), inline: false },
                { name: '🥐 Daily Reward', value: getRemainingTime(userId, 'daily'), inline: false },
                { name: '🍰 Weekly Reward', value: getRemainingTime(userId, 'weekly'), inline: false }
            )
            .setThumbnail(interaction.user.displayAvatarURL());
        
        return interaction.reply({ embeds: [embed] });
    }

    // --- DROP COMMAND ---
    if (interaction.commandName === 'drop') {
        const key = `${userId}_drop`;
        if (cooldowns.has(key) && Date.now() < cooldowns.get(key)) {
            return interaction.reply({ content: `Wait! Next drop in: ${getRemainingTime(userId, 'drop')}`, ephemeral: true });
        }

        const cards = getCards();
        if (cards.length < 1) return interaction.reply("No cards in the cafe!");

        const card = cards[Math.floor(Math.random() * cards.length)];
        const embed = new EmbedBuilder()
            .setTitle('☕ Cafe Drop!')
            .setDescription(`**${card.rarity} ${card.name}**\nCode: \`${card.code}\``)
            .setImage(card.image)
            .setColor('#D2B48C');

        await interaction.reply({ embeds: [embed] });

        // Set 1 minute cooldown
        cooldowns.set(key, Date.now() + 60000);
    }

    // --- DAILY COMMAND ---
    if (interaction.commandName === 'daily') {
        const key = `${userId}_daily`;
        if (cooldowns.has(key) && Date.now() < cooldowns.get(key)) {
            return interaction.reply({ content: `Daily reward available in: ${getRemainingTime(userId, 'daily')}`, ephemeral: true });
        }
        
        await interaction.reply("🎁 You claimed your Daily Cafe Reward!");
        cooldowns.set(key, Date.now() + 86400000); // 24 Hours
    }

    // --- WEEKLY COMMAND ---
    if (interaction.commandName === 'weekly') {
        const key = `${userId}_weekly`;
        if (cooldowns.has(key) && Date.now() < cooldowns.get(key)) {
            return interaction.reply({ content: `Weekly reward available in: ${getRemainingTime(userId, 'weekly')}`, ephemeral: true });
        }
        
        await interaction.reply("💎 You claimed your Weekly Cafe Super-Reward!");
        cooldowns.set(key, Date.now() + 604800000); // 7 Days
    }

    // --- ADD CARD (OWNER ONLY) ---
    if (interaction.commandName === 'addcard') {
        if (userId !== interaction.guild.ownerId) return interaction.reply({ content: "Owner only!", ephemeral: true });
        
        const card = {
            code: interaction.options.getString('code').toUpperCase(),
            name: interaction.options.getString('name'),
            group: interaction.options.getString('group'),
            rarity: interaction.options.getString('rarity'),
            image: interaction.options.getAttachment('image').url
        };
        saveCard(card);
        await interaction.reply({ content: `✅ Card ${card.code} added!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
