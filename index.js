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

// --- 2. EMOJI FIXED FORMAT ---
// I put your IDs in here so the bot actually renders the images!
const EMOJIS = {
    COMPUTER: '<:YS_COMPUTER:1444114271901450412>',
    BEAN: '<:YS_COFFEEBEAN:1394451580312490035>',
    COIN: '<:YS_COIN:1394451524096098337>',
    RARITY: {
        "1": "<:YS_BASIC:1392222205055602741>",
        "2": "<:YS_AWESOME:1392219819440603341>",
        "3": "<:YS_SUPER:1392220075276107896>",
        "4": "<:YS_RARE4:1394450951267684362>"
    }
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // --- INVENTORY WITH PAGES ---
    if (interaction.commandName === 'inventory') {
        const inv = readJSON(INV_FILE);
        const userCards = inv[interaction.user.id] || [];
        if (userCards.length === 0) return interaction.reply("Your bag is empty! ☕");

        let page = 0;
        const perPage = 10;
        const totalPages = Math.ceil(userCards.length / perPage);

        const generateEmbed = (p) => {
            const start = p * perPage;
            const list = userCards.slice(start, start + perPage).map((c, i) => 
                `**${start + i + 1}.** ${EMOJIS.RARITY[c.rarity] || '❓'} **${c.name}**\n└ \`${c.code}\` • ${c.group}`
            ).join('\n\n');

            return new EmbedBuilder()
                .setTitle(`${EMOJIS.COMPUTER} ${interaction.user.username}'s Collection`)
                .setDescription(list)
                .setColor('#D2B48C')
                .setFooter({ text: `Page ${p + 1} of ${totalPages} • Total: ${userCards.length}` });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1)
        );

        const msg = await interaction.reply({ embeds: [generateEmbed(0)], components: [row], fetchReply: true });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: "Not your bag!", ephemeral: true });
            if (i.customId === 'prev') page--;
            if (i.customId === 'next') page++;

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
            );
            await i.update({ embeds: [generateEmbed(page)], components: [newRow] });
        });
    }

    // --- DROP COMMAND (BIG RECTANGLE) ---
    if (interaction.commandName === 'drop') {
        const cards = readJSON(CARDS_FILE);
        if (cards.length < 3) return interaction.reply("Add more cards first!");

        await interaction.deferReply(); // STOPS THE "DID NOT RESPOND" ERROR
        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);

        const embed = new EmbedBuilder()
            .setTitle('☕ Fresh Cafe Drop!')
            .setDescription(`1️⃣ ${EMOJIS.RARITY[selected[0].rarity]} **${selected[0].name}**\n2️⃣ ${EMOJIS.RARITY[selected[1].rarity]} **${selected[1].name}**\n3️⃣ ${
