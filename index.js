const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- DATA SETUP ---
const DATA_DIR = './data'; 
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const INV_FILE = path.join(DATA_DIR, 'inventories.json');
if (!fs.existsSync(CARDS_FILE)) fs.writeFileSync(CARDS_FILE, JSON.stringify([]));
if (!fs.existsSync(INV_FILE)) fs.writeFileSync(INV_FILE, JSON.stringify({}));

const userStats = new Map(); 
function getStats(userId) {
    if (!userStats.has(userId)) {
        userStats.set(userId, { beans: 500, gems: 50, yeocoins: 0, streak: 0, lastDaily: 0, lastDrop: 0, starCard: null });
    }
    return userStats.get(userId);
}

const EMOJIS = {
    YEOCON: '<:YS_COIN:1394451524096098337>',
    COMPUTER: '<:YS_COMPUTER:1444114271901450412>',
    CALENDAR: '<:emoji_54:1444409715042942996>',
    BEAN: '<:YS_COFFEEBEAN:1394451580312490035>',
    RARITY_MAP: {
        "1": "<:YS_BASIC:1392222205055602741>",
        "2": "<:YS_AWESOME:1392219819440603341>",
        "3": "<:YS_SUPER:1392220075276107896>",
        "4": "<:YS_RARE4:1394450951267684362>"
    }
};

const commands = [
    { name: 'drop', description: 'Serve a triple card drop!' },
    { name: 'profile', description: 'View your cafe profile' },
    { name: 'daily', description: 'Claim daily beans' },
    { name: 'inventory', description: 'Check your collection' },
    { name: 'cooldowns', description: 'Check your timers' },
    {
        name: 'addcard',
        description: 'OWNER ONLY: Add a card',
        options: [
            { name: 'idol', description: 'Idol Name', type: 3, required: true },
            { name: 'group', description: 'Group Name', type: 3, required: true },
            { name: 'rarity', description: '1, 2, 3, or 4', type: 3, required: true },
            { name: 'era', description: 'Era', type: 3, required: true },
            { name: 'image', description: 'Upload Image', type: 11, required: true }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) { console.error(error); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    const stats = getStats(userId);
    const now = Date.now();

    if (interaction.commandName === 'drop') {
        const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
        if (cards.length < 3) return interaction.reply("Add at least 3 cards first!");
        if (now < stats.lastDrop + 60000) return interaction.reply({ content: "⏳ Cooling down...", ephemeral: true });

        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);
        const embed = new EmbedBuilder()
            .setTitle('☕ Fresh Cafe Drop!')
            .setDescription(`1️⃣ ${selected[0].emoji} **${selected[0].name}**\n2️⃣ ${selected[1].emoji} **${selected[1].name}**\n3️⃣ ${selected[2].emoji} **${selected[2].name}**`)
            .setImage(selected[0].image)
            .setColor('#D2B48C');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        stats.lastDrop = now;

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });
        let claims = [null, null, null];

        collector.on('collect', async i => {
            const idx = parseInt(i.customId.split('_')[1]);
            if (claims[idx]) return i.reply({ content: "Already taken!", ephemeral: true });
            claims[idx] = i.user;
            const inv = JSON.parse(fs.readFileSync(INV_FILE));
            if (!inv[i.user.id]) inv[i.user.id] = [];
            inv[i.user.id].push(selected[idx]);
            fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));
            await i.reply({ content: `✅ Claimed ${selected[idx].name}!`, ephemeral: true });
        });

        collector.on('end', async () => {
            const finalResults = selected.map((card, idx) => {
                const claimer = claims[idx] ? `<@${claims[idx].id}>` : "*Expired*";
                return `\`Card • ${idx + 1}\` .\n**${card.name}** [${card.group}] // __${card.code}__   〔 ${card.emoji} 〕\nEra : ${card.era}\nClaimed by : ${claimer}`;
            }).join('\n\n');
            const disabledRow = new ActionRowBuilder().addComponents(row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true).setStyle(ButtonStyle.Secondary)));
            await interaction.editReply({ content: finalResults, embeds: [], components: [disabledRow] });
        });
    }

    if (interaction.commandName === 'profile') {
        const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.COMPUTER} ${interaction.user.username}'s Profile`)
            .addFields(
                { name: 'Beans', value: `${EMOJIS.BEAN} ${stats.beans}`, inline: true },
                { name: 'Gems', value: `💎 ${stats.gems}`, inline: true },
                { name: 'Yeocoins', value: `${EMOJIS.YEOCON} ${stats.yeocoins}`, inline: true }
            ).setColor('#D2B48C');
        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'addcard') {
        if (userId !== interaction.guild.ownerId) return interaction.reply("Owner only!");
        const idol = interaction.options.getString('idol');
        const group = interaction.options.getString('group');
        const rNum = interaction.options.getString('rarity');
        const era = interaction.options.getString('era');
        const code = `${group.substring(0,3).toUpperCase()}${idol.substring(0,2).toUpperCase()}#${Math.floor(1000 + Math.random() * 9000)}`;
        const card = { code, name: idol, group, era, rarity: rNum, emoji: EMOJIS.RARITY_MAP[rNum] || "❓", image: interaction.options.getAttachment('image').url };
        const cards = JSON.parse(fs.readFileSync(CARDS_FILE));
        cards.push(card);
        fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2));
        await interaction.reply(`✅ Added **${idol}**!`);
    }

    if (interaction.commandName === 'daily') {
        if (now < stats.lastDaily + 86400000) return interaction.reply({ content: "⏳ Come back later!", ephemeral: true });
        stats.beans += 200;
        stats.lastDaily = now;
        await interaction.reply(`${EMOJIS.CALENDAR} **Daily Claimed!** +200 Beans`);
    }
});

client.login(process.env.DISCORD_TOKEN);
