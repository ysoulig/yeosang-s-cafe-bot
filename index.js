const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. DATA STORAGE (Temporary Memory) ---
const userStats = new Map(); 

function getStats(userId) {
    if (!userStats.has(userId)) {
        userStats.set(userId, { 
            beans: 100, 
            gems: 0, 
            yeocoins: 0, 
            streak: 0,
            lastDaily: 0,
            starCard: null // Holds the card object for the profile image
        });
    }
    return userStats.get(userId);
}

// --- 2. COMMAND REGISTRATION ---
const commands = [
    { name: 'profile', description: 'View your cafe profile and currencies' },
    { 
        name: 'setstar', 
        description: 'Set your favorite card as your profile star',
        options: [{ name: 'code', description: 'The card code (e.g. ATZYS#001)', type: 3, required: true }]
    },
    { name: 'daily', description: 'Claim beans and build your streak!' },
    { name: 'cooldowns', description: 'Check your timers' }
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

    // --- PROFILE COMMAND ---
    if (interaction.commandName === 'profile') {
        const profileEmbed = new EmbedBuilder()
            .setTitle(`☕ ${interaction.user.username}'s Cafe Profile`)
            .setColor('#D2B48C')
            .addFields(
                { name: '🫘 Coffee Beans', value: `${stats.beans}`, inline: true },
                { name: '💎 Gems', value: `${stats.gems}`, inline: true },
                { name: '🪙 Yeocoins', value: `${stats.yeocoins}`, inline: true },
                { name: '🔥 Daily Streak', value: `${stats.streak} Days`, inline: false }
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        if (stats.starCard) {
            profileEmbed.setImage(stats.starCard.image);
            profileEmbed.setDescription(`🌟 **Star Card:** ${stats.starCard.rarity} ${stats.starCard.name}`);
        } else {
            profileEmbed.setDescription("🌟 **Star Card:** None set. Use `/setstar`!");
        }

        await interaction.reply({ embeds: [profileEmbed] });
    }

    // --- SET STAR COMMAND ---
    if (interaction.commandName === 'setstar') {
        const code = interaction.options.getString('code').toUpperCase();
        // Here you would check their inventory. For now, we'll assume they own it:
        // (In a real setup, we'd search their inventories.json)
        
        // This is a placeholder: searching the master list for the image
        const CARDS_FILE = './cards.json';
        const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
        const foundCard = cards.find(c => c.code === code);

        if (!foundCard) {
            return interaction.reply({ content: "❌ You don't have that card (or it doesn't exist)!", ephemeral: true });
        }

        stats.starCard = foundCard;
        await interaction.reply(`✨ **${foundCard.name}** is now your Star Card!`);
    }

    // --- DAILY WITH STREAK ---
    if (interaction.commandName === 'daily') {
        const now = Date.now();
        const oneDay = 86400000;
        const twoDays = 172800000;

        if (now < stats.lastDaily + oneDay) {
            return interaction.reply({ content: "⏳ Your daily beans are still roasting!", ephemeral: true });
        }

        // Streak Logic
        if (now < stats.lastDaily + twoDays) {
            stats.streak += 1;
        } else {
            stats.streak = 1; // Streak broken
        }

        const gemBonus = stats.streak * 5; // Get 5 gems per streak day
        stats.beans += 200;
        stats.gems += gemBonus;
        stats.lastDaily = now;

        await interaction.reply(`🥐 **Daily Claimed!**\n+200 Coffee Beans\n+${gemBonus} Gems (Streak: ${stats.streak}d)`);
    }
});

client.login(process.env.DISCORD_TOKEN);
