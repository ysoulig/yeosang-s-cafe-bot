const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// --- 1. CONNECT TO DATABASE ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB Cafe Database'))
    .catch(err => console.error('❌ Database connection error:', err));

// Define what a "Card" looks like in the database
const CardSchema = new mongoose.Schema({
    name: String,
    group: String,
    rarity: String,
    image: String
});
const Card = mongoose.model('Card', CardSchema);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 2. REGISTER COMMANDS ---
const commands = [
    { 
        name: 'drop', 
        description: 'Order a 3-item card drop!' 
    },
    {
        name: 'addcard',
        description: 'STAFF ONLY: Add a new card to the cafe',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'name', description: 'Idol name', type: 3, required: true },
            { name: 'group', description: 'Group name', type: 3, required: true },
            { name: 'rarity', description: 'Rarity (Common, Rare, etc)', type: 3, required: true },
            { name: 'image', description: 'Direct image URL', type: 3, required: true }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded slash commands!');
    } catch (error) { console.error(error); }
})();

// --- 3. INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // STAFF COMMAND: /addcard
    if (interaction.commandName === 'addcard') {
        const name = interaction.options.getString('name');
        const group = interaction.options.getString('group');
        const rarity = interaction.options.getString('rarity');
        const image = interaction.options.getString('image');

        const newCard = new Card({ name, group, rarity, image });
        await newCard.save();
        await interaction.reply({ content: `✅ Added **${name}** from **${group}** to the database!`, ephemeral: true });
    }

    // USER COMMAND: /drop
    if (interaction.commandName === 'drop') {
        const allCards = await Card.find();
        if (allCards.length < 3) return interaction.reply("Not enough cards in the cafe yet! Ask staff to add more.");

        const droppedItems = allCards.sort(() => 0.5 - Math.random()).slice(0, 3);

        const dropEmbed = new EmbedBuilder()
            .setTitle('☕ New Cafe Order!')
            .setDescription(`${interaction.user.username} dropped 3 items!`)
            .addFields(
                { name: 'Item 1', value: `${droppedItems[0].name} (${droppedItems[0].rarity})`, inline: true },
                { name: 'Item 2', value: `${droppedItems[1].name} (${droppedItems[1].rarity})`, inline: true },
                { name: 'Item 3', value: `${droppedItems[2].name} (${droppedItems[2].rarity})`, inline: true }
            )
            .setColor('#D2B48C');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [dropEmbed], components: [buttons] });
    }
});

client.login(process.env.DISCORD_TOKEN);
