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
// REPLACE THESE with your full <:name:id> strings from yesterday!
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

// --- 3. INVENTORY WITH PAGES ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

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

    // --- 4. DROP COMMAND (FIXED RECTANGLE) ---
    if (interaction.commandName === 'drop') {
        const cards = readJSON(CARDS_FILE);
        if (cards.length < 3) return interaction.reply("Add more cards!");

        await interaction.deferReply();
        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);

        const embed = new EmbedBuilder()
            .setTitle('☕ Fresh Cafe Drop!')
            .setDescription(`1️⃣ ${EMOJIS.RARITY[selected[0].rarity]} **${selected[0].name}**\n2️⃣ ${EMOJIS.RARITY[selected[1].rarity]} **${selected[1].name}**\n3️⃣ ${EMOJIS.RARITY[selected[2].rarity]} **${selected[2].name}**`)
            .setImage(selected[0].image) // This creates the BIG RECTANGLE box
            .setColor('#D2B48C')
            .setFooter({ text: '15 seconds to claim!' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });
        let claims = [null, null, null];

        collector.on('collect', async i => {
            const idx = parseInt(i.customId.split('_')[1]);
            if (claims[idx]) return i.reply({ content: "Already taken!", ephemeral: true });

            claims[idx] = i.user;
            const inv = readJSON(INV_FILE);
            if (!inv[i.user.id]) inv[i.user.id] = [];
            inv[i.user.id].push(selected[idx]);
            fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));

            // Use followUp to prevent "Interaction Failed"
            await i.reply({ content: `✅ You claimed ${selected[idx].name}!`, ephemeral: true });
        });

        collector.on('end', async () => {
            const finalResults = selected.map((card, idx) => {
                const claimer = claims[idx] ? `<@${claims[idx].id}>` : "*Expired*";
                return `\`Card • ${idx + 1}\` .\n**${card.name}** [${card.group}] // __${card.code}__   〔 ${EMOJIS.RARITY[card.rarity]} 〕\nEra : ${card.era}\nClaimed by : ${claimer}`;
            }).join('\n\n');

            await interaction.editReply({ content: finalResults, embeds: [], components: [] });
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
