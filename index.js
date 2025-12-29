const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. DATA FILES ---
const CARDS_FILE = './cards.json';
const INV_FILE = './inventories.json';
// Stats will reset on restart until we find that Volume!
const userStats = new Map(); 

function getStats(userId) {
    if (!userStats.has(userId)) {
        userStats.set(userId, { beans: 500, gems: 50, yeocoins: 0, streak: 0, lastDaily: 0 });
    }
    return userStats.get(userId);
}

// --- 2. COMMAND REGISTRATION ---
const commands = [
    { name: 'gacha', description: 'Spend 50 Gems on the Gacha Matcha!' },
    { name: 'burn', description: 'Burn a card for a chance at Yeocoins', options: [{ name: 'code', description: 'Card code', type: 3, required: true }] },
    { name: 'export', description: 'OWNER ONLY: Get a backup of the card data' }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
})();

// --- 3. INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    const stats = getStats(userId);

    // --- GACHA MATCHA (ANIMATED) ---
    if (interaction.commandName === 'gacha') {
        if (stats.gems < 50) return interaction.reply("❌ You need **50 Gems**!");

        stats.gems -= 50;
        await interaction.reply("🍵 **Preparing your Gacha Matcha...**");

        // The "Animation" using edits
        const frames = ["⚪ 🟢 ⚪", "⚪ ⚪ 🟢", "🟢 ⚪ ⚪", "✨ **DING!** ✨"];
        for (const frame of frames) {
            await new Promise(resolve => setTimeout(resolve, 800));
            await interaction.editReply(frame);
        }

        // Random Prize Logic
        const prizeType = Math.random(); 
        if (prizeType < 0.4) { // 40% chance for Currency
            const bonus = Math.floor(Math.random() * 200) + 50;
            stats.beans += bonus;
            return interaction.editReply(`🎊 The machine spit out **${bonus} Coffee Beans**!`);
        } else { // 60% chance for a Card
            const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
            const card = cards[Math.floor(Math.random() * cards.length)];
            const embed = new EmbedBuilder()
                .setTitle("✨ Gacha Matcha Result!")
                .setDescription(`You pulled: **${card.rarity} ${card.name}**!`)
                .setImage(card.image).setColor('#5da132');
            return interaction.editReply({ content: " ", embeds: [embed] });
        }
    }

    // --- LUCK-BASED BURN ---
    if (interaction.commandName === 'burn') {
        const code = interaction.options.getString('code').toUpperCase();
        const inv = JSON.parse(fs.readFileSync(INV_FILE));
        const userCards = inv[userId] || [];
        const cardIndex = userCards.findIndex(c => c.code === code);

        if (cardIndex === -1) return interaction.reply("You don't own that card!");

        const burned = userCards.splice(cardIndex, 1)[0];
        inv[userId] = userCards;
        fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));

        // Luck Logic: 20% chance for Yeocoins, higher if it's a rare emoji
        let chance = 0.20; 
        if (burned.rarity.includes('⭐') || burned.rarity.includes('✨')) chance = 0.50;

        if (Math.random() < chance) {
            stats.yeocoins += 5;
            await interaction.reply(`🔥 You burned **${burned.name}** and found **5 Yeocoins** in the ashes!`);
        } else {
            stats.beans += 50;
            await interaction.reply(`🔥 You burned **${burned.name}**. No Yeocoins found, but you kept **50 Coffee Beans**.`);
        }
    }

    // --- EXPORT DATA ---
    if (interaction.commandName === 'export') {
        if (userId !== interaction.guild.ownerId) return interaction.reply("Owner only!");
        
        const data = fs.readFileSync(CARDS_FILE, 'utf8');
        // Sends as a file so Discord doesn't cut off the text
        fs.writeFileSync('backup.json', data);
        await interaction.reply({ content: "📂 Here is your card data backup:", files: ['backup.json'] });
    }
});

client.login(process.env.DISCORD_TOKEN);
