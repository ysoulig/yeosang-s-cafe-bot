const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. CONFIG & DATA ---
// Using a data folder for future "Volume" support
const DATA_DIR = './data'; 
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const INV_FILE = path.join(DATA_DIR, 'inventories.json');

if (!fs.existsSync(CARDS_FILE)) fs.writeFileSync(CARDS_FILE, JSON.stringify([]));
if (!fs.existsSync(INV_FILE)) fs.writeFileSync(INV_FILE, JSON.stringify({}));

// Temporary Memory for Currencies/Streaks (Will reset on restart without Volume)
const userStats = new Map(); 

function getStats(userId) {
    if (!userStats.has(userId)) {
        userStats.set(userId, { 
            beans: 500, gems: 50, yeocoins: 0, 
            streak: 0, lastDaily: 0, lastDrop: 0,
            starCard: null 
        });
    }
    return userStats.get(userId);
}

// --- 2. COMMAND REGISTRATION ---
const commands = [
    { name: 'drop', description: 'Serve a triple card drop!' },
    { name: 'profile', description: 'View your currencies and star card' },
    { name: 'inventory', description: 'Check your collection' },
    { name: 'daily', description: 'Claim daily beans and build a streak' },
    { name: 'gacha', description: 'Spend 50 Gems on the Gacha Matcha machine' },
    { name: 'cooldowns', description: 'Check your cafe timers' },
    { name: 'burn', description: 'Burn a card for a chance at rare Yeocoins', 
      options: [{ name: 'code', description: 'The card code', type: 3, required: true }] },
    { name: 'setstar', description: 'Set your favorite card as your profile star',
      options: [{ name: 'code', description: 'The card code', type: 3, required: true }] },
    { name: 'export', description: 'OWNER ONLY: Backup the card database' },
    { name: 'addcard', description: 'OWNER ONLY: Add a new card',
      options: [
          { name: 'code', description: 'ATZYS#001', type: 3, required: true },
          { name: 'name', description: 'Idol Name', type: 3, required: true },
          { name: 'rarity', description: 'Emoji/Rarity', type: 3, required: true },
          { name: 'image', description: 'Image attachment', type: 11, required: true }
      ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
})();

// --- 3. BOT LOGIC ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    const stats = getStats(userId);
    const now = Date.now();

    // --- DROP COMMAND (TRIPLE DROP) ---
    if (interaction.commandName === 'drop') {
        const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
        if (cards.length < 3) return interaction.reply("Need at least 3 cards in the shop!");
        if (now < stats.lastDrop + 60000) return interaction.reply({ content: "⏳ Cooling down...", ephemeral: true });

        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);
        const embed = new EmbedBuilder()
            .setTitle('☕ Triple Cafe Drop!')
            .addFields(
                { name: '1️⃣', value: `${selected[0].rarity} \`${selected[0].code}\`\n${selected[0].name}`, inline: true },
                { name: '2️⃣', value: `${selected[1].rarity} \`${selected[1].code}\`\n${selected[1].name}`, inline: true },
                { name: '3️⃣', value: `${selected[2].rarity} \`${selected[2].code}\`\n${selected[2].name}`, inline: true }
            ).setColor('#D2B48C');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        stats.lastDrop = now;

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
        const claimed = new Set();

        collector.on('collect', async i => {
            const idx = parseInt(i.customId.split('_')[1]);
            if (claimed.has(idx)) return i.reply({ content: "Already taken!", ephemeral: true });
            
            claimed.add(idx);
            const inv = JSON.parse(fs.readFileSync(INV_FILE));
            if (!inv[i.user.id]) inv[i.user.id] = [];
            inv[i.user.id].push(selected[idx]);
            fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));

            await i.reply(`🎉 **${i.user.username}** claimed **${selected[idx].name}**!`);
        });
    }

    // --- PROFILE COMMAND ---
    if (interaction.commandName === 'profile') {
        const embed = new EmbedBuilder()
            .setTitle(`🎒 ${interaction.user.username}'s Profile`)
            .addFields(
                { name: '🫘 Beans', value: `${stats.beans}`, inline: true },
                { name: '💎 Gems', value: `${stats.gems}`, inline: true },
                { name: '🪙 Yeocoins', value: `${stats.yeocoins}`, inline: true },
                { name: '🔥 Streak', value: `${stats.streak}d`, inline: true }
            ).setColor('#D2B48C');

        if (stats.starCard) {
            embed.setImage(stats.starCard.image);
            embed.setDescription(`🌟 **Star Card:** ${stats.starCard.rarity} ${stats.starCard.name}`);
        }
        await interaction.reply({ embeds: [embed] });
    }

    // --- GACHA MATCHA (ANIMATED) ---
    if (interaction.commandName === 'gacha') {
        if (stats.gems < 50) return interaction.reply("❌ Need 50 Gems!");
        stats.gems -= 50;
        await interaction.reply("🍵 **Gacha Matcha rolling...**");

        const frames = ["⚪ 🟢 ⚪", "⚪ ⚪ 🟢", "🟢 ⚪ ⚪", "✨ **DING!** ✨"];
        for (const f of frames) {
            await new Promise(r => setTimeout(r, 800));
            await interaction.editReply(f);
        }

        const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
        const won = cards[Math.floor(Math.random() * cards.length)];
        const embed = new EmbedBuilder().setTitle("🍵 Matcha Pull!").setImage(won.image).setDescription(`**${won.rarity} ${won.name}**`).setColor('#5da132');
        await interaction.editReply({ content: " ", embeds: [embed] });
    }

    // --- BURN COMMAND (LUCK BASED) ---
    if (interaction.commandName === 'burn') {
        const code = interaction.options.getString('code').toUpperCase();
        const inv = JSON.parse(fs.readFileSync(INV_FILE));
        const userCards = inv[userId] || [];
        const idx = userCards.findIndex(c => c.code === code);

        if (idx === -1) return interaction.reply("Card not found!");
        const burned = userCards.splice(idx, 1)[0];
        inv[userId] = userCards;
        fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));

        const isRare = burned.rarity.includes('⭐') || burned.rarity.includes('✨');
        const luck = Math.random() < (isRare ? 0.5 : 0.1);

        if (luck) {
            stats.yeocoins += 5;
            await interaction.reply(`🔥 Burned! You found **5 Yeocoins**!`);
        } else {
            stats.beans += 50;
            await interaction.reply(`🔥 Burned! No Yeocoins, but you got **50 Beans**.`);
        }
    }

    // --- ADMIN COMMANDS (EXPORT & ADD) ---
    if (interaction.commandName === 'export' && userId === interaction.guild.ownerId) {
        await interaction.reply({ content: "📂 Backup:", files: [CARDS_FILE] });
    }

    if (interaction.commandName === 'addcard' && userId === interaction.guild.ownerId) {
        const card = {
            code: interaction.options.getString('code').toUpperCase(),
            name: interaction.options.getString('name'),
            rarity: interaction.options.getString('rarity'),
            image: interaction.options.getAttachment('image').url
        };
        const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
        cards.push(card);
        fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2));
        await interaction.reply(`✅ Added ${card.name}!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
