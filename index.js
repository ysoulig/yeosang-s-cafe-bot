const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const CARDS_FILE = './cards.json';
const INV_FILE = './inventories.json';

// --- 1. DATA HELPERS ---
if (!fs.existsSync(CARDS_FILE)) fs.writeFileSync(CARDS_FILE, JSON.stringify([]));
if (!fs.existsSync(INV_FILE)) fs.writeFileSync(INV_FILE, JSON.stringify({}));

function getCards() { return JSON.parse(fs.readFileSync(CARDS_FILE)); }
function getInventories() { return JSON.parse(fs.readFileSync(INV_FILE)); }
function saveInventory(userId, card) {
    const inv = getInventories();
    if (!inv[userId]) inv[userId] = [];
    inv[userId].push(card);
    fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));
}

// --- 2. COMMAND REGISTRATION ---
const commands = [
    { name: 'drop', description: 'Drop 3 cards to claim!' },
    { name: 'inventory', description: 'View your collection' },
    {
        name: 'addcard',
        description: 'OWNER ONLY: Add a card',
        options: [
            { name: 'code', description: 'ATZYS#001', type: 3, required: true },
            { name: 'name', description: 'Idol Name', type: 3, required: true },
            { name: 'rarity', description: 'Emoji', type: 3, required: true },
            { name: 'image', description: 'Upload', type: 11, required: true }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
})();

// --- 3. THE GAME ENGINE ---
const cooldowns = new Map();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;

    if (interaction.commandName === 'drop') {
        if (cooldowns.has(`${userId}_drop`) && Date.now() < cooldowns.get(`${userId}_drop`)) {
            return interaction.reply({ content: "⏳ Your coffee is still brewing!", ephemeral: true });
        }

        const allCards = getCards();
        if (allCards.length < 3) return interaction.reply("You need at least 3 cards in the database to drop!");

        // Pick 3 unique random cards
        const shuffled = allCards.sort(() => 0.5 - Math.random());
        const selected = [shuffled[0], shuffled[1], shuffled[2]];

        const dropEmbed = new EmbedBuilder()
            .setTitle('☕ Fresh Cafe Drop!')
            .setDescription(`3 items have been served! Click a number to claim that card.`)
            .addFields(
                { name: '1️⃣ Card', value: `${selected[0].rarity} \`${selected[0].code}\`\n**${selected[0].name}**`, inline: true },
                { name: '2️⃣ Card', value: `${selected[1].rarity} \`${selected[1].code}\`\n**${selected[1].name}**`, inline: true },
                { name: '3️⃣ Card', value: `${selected[2].rarity} \`${selected[2].code}\`\n**${selected[2].name}**`, inline: true }
            )
            .setFooter({ text: 'Cards disappear in 30 seconds!' })
            .setColor('#D2B48C');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Primary)
        );

        const response = await interaction.reply({ embeds: [dropEmbed], components: [buttons] });
        cooldowns.set(`${userId}_drop`, Date.now() + 60000);

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
        const claimedIndexes = new Set();

        collector.on('collect', async i => {
            const index = parseInt(i.customId.split('_')[1]);
            
            if (claimedIndexes.has(index)) {
                return i.reply({ content: "❌ That card has already been taken!", ephemeral: true });
            }

            claimedIndexes.add(index);
            saveInventory(i.user.id, selected[index]);

            // Update the buttons to disable the claimed one
            const newButtons = new ActionRowBuilder().addComponents(
                buttons.components.map((btn, idx) => 
                    claimedIndexes.has(idx) ? ButtonBuilder.from(btn).setDisabled(true).setStyle(ButtonStyle.Secondary) : btn
                )
            );

            await i.update({ components: [newButtons] });
            await i.followUp({ content: `🎉 **${i.user.username}** claimed **${selected[index].name}** (\`${selected[index].code}\`)!` });
        });
    }

    // --- INVENTORY COMMAND ---
    if (interaction.commandName === 'inventory') {
        const inv = getInventories();
        const userCards = inv[userId] || [];
        if (userCards.length === 0) return interaction.reply("Your inventory is empty!");

        const list = userCards.map(c => `${c.rarity} \`${c.code}\` **${c.name}**`).join('\n');
        const embed = new EmbedBuilder()
            .setTitle(`🎒 ${interaction.user.username}'s Collection`)
            .setDescription(list)
            .setColor('#D2B48C');
        await interaction.reply({ embeds: [embed] });
    }

    // --- ADD CARD ---
    if (interaction.commandName === 'addcard') {
        if (userId !== interaction.guild.ownerId) return interaction.reply({ content: "Owner only!", ephemeral: true });
        const card = {
            code: interaction.options.getString('code').toUpperCase(),
            name: interaction.options.getString('name'),
            rarity: interaction.options.getString('rarity'),
            image: interaction.options.getAttachment('image').url
        };
        const cards = getCards();
        cards.push(card);
        fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2));
        await interaction.reply({ content: `✅ Added ${card.code}!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
