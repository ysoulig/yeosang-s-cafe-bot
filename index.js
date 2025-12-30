const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. DATA SETUP ---
const DATA_DIR = './data'; 
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const INV_FILE = path.join(DATA_DIR, 'inventories.json');

const readJSON = (file) => {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } 
    catch (e) { return file.includes('inventories') ? {} : []; }
};

// --- 2. EMOJIS (Full Render Format) ---
const EMOJIS = {
    COMPUTER: '<:YS_COMPUTER:1444114271901450412>',
    RARITY: {
        "1": "<:YS_BASIC:1392222205055602741>",
        "2": "<:YS_AWESOME:1392219819440603341>",
        "3": "<:YS_SUPER:1392220075276107896>",
        "4": "<:YS_RARE4:1394450951267684362>"
    }
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'drop') {
        const cards = readJSON(CARDS_FILE);
        if (cards.length < 3) return interaction.reply("Add more cards first!");

        await interaction.deferReply(); // Fixes "Application did not respond"

        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);

        // --- THE HORIZONTAL BOX ---
        const embed = new EmbedBuilder()
            .setTitle(`☕ ${interaction.user.username} is dropping cards!`)
            .setColor('#D2B48C')
            .addFields(
                { name: 'Slot 1', value: `${EMOJIS.RARITY[selected[0].rarity] || '❓'}\n\`${selected[0].code}\``, inline: true },
                { name: 'Slot 2', value: `${EMOJIS.RARITY[selected[1].rarity] || '❓'}\n\`${selected[2].code}\``, inline: true },
                { name: 'Slot 3', value: `${EMOJIS.RARITY[selected[2].rarity] || '❓'}\n\`${selected[2].code}\``, inline: true }
            )
            .setImage(selected[0].image) // Preview of first card
            .setFooter({ text: '15 seconds to claim! Preview shows Slot 1.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });
        let claims = [null, null, null];

        collector.on('collect', async i => {
            const idx = parseInt(i.customId.split('_')[1]);
            if (claims[idx]) return i.reply({ content: "Taken!", ephemeral: true });
            
            claims[idx] = i.user;
            const inv = readJSON(INV_FILE);
            if (!inv[i.user.id]) inv[i.user.id] = [];
            inv[i.user.id].push(selected[idx]);
            fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));

            await i.reply({ content: `✅ You got ${selected[idx].name}!`, ephemeral: true });
        });

        collector.on('end', async () => {
            const finalResults = selected.map((card, idx) => {
                const claim
