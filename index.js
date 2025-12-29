const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// --- 1. CONNECT TO DATABASE ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB Cafe Database'))
    .catch(err => console.error('❌ Database connection error:', err));

const CardSchema = new mongoose.Schema({
    name: String,
    group: String,
    rarity: String,
    code: String,
    image: String 
});
const Card = mongoose.model('Card', CardSchema);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 2. DEFINE YOUR EMOJIS HERE ---
// Replace the emojis below with your server's custom emojis!
// To get an emoji ID, type \:your_emoji: in Discord.
const rarityEmojis = {
    'Common': '<:YS_AWHSOME2:1394450778583863410>', 
    'Rare': '<:YS_BASIC1:1394450839409660047>',
    'Ultra': '<:YS_SUPER3:1394450892505223178>',
    'Legendary': '<:YS_RARE4:1394450951267684362>'
};

// --- 3. REGISTER COMMANDS ---
const commands = [
    { name: 'drop', description: 'Order a 3-item card drop!' },
    {
        name: 'addcard',
        description: 'STAFF ONLY: Add a new card to the cafe',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'code', description: 'Unique code (e.g. ATZYS#001)', type: 3, required: true },
            { name: 'name', description: 'Idol name', type: 3, required: true },
            { name: 'group', description: 'Group name', type: 3, required: true },
            { 
                name: 'rarity', 
                description: 'Pick the rarity', 
                type: 3, 
                required: true,
                choices: [
                    { name: 'Common', value: 'Common' },
                    { name: 'Rare', value: 'Rare' },
                    { name: 'Ultra', value: 'Ultra' },
                    { name: 'Legendary', value: 'Legendary' }
                ]
            },
            { name: 'image', description: 'Upload the card image file', type: 11, required: true }
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

// --- 4. INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'addcard') {
        const code = interaction.options.getString('code').toUpperCase();
        const name = interaction.options.getString('name');
        const group = interaction.options.getString('group');
        const rarity = interaction.options.getString('rarity');
        const imageFile = interaction.options.getAttachment('image');

        const newCard = new Card({ code, name, group, rarity, image: imageFile.url });
        await newCard.save();
        
        const emoji = rarityEmojis[rarity] || '';
        await interaction.reply({ content: `✅ Added **[${code}]** ${emoji} ${name} from **${group}**!`, ephemeral: true });
    }

    if (interaction.commandName === 'drop') {
        const allCards = await Card.find();
        if (allCards.length < 3) return interaction.reply("Not enough cards yet!");

        const droppedItems = allCards.sort(() => 0.5 - Math.random()).slice(0, 3);

        const dropEmbed = new EmbedBuilder()
            .setTitle('☕ New Cafe Order!')
            .setDescription(`${interaction.user.username} dropped 3 items!`)
            .addFields(
                { name: 'Item 1', value: `\`${droppedItems[0].code}\`\n${rarityEmojis[droppedItems[0].rarity] || ''} ${droppedItems[0].name}`, inline: true },
                { name: 'Item 2', value: `\`${droppedItems[1].code}\`\n${rarityEmojis[droppedItems[1].rarity] || ''} ${droppedItems[1].name}`, inline: true },
                { name: 'Item 3', value: `\`${droppedItems[2].code}\`\n${rarityEmojis[droppedItems[2].rarity] || ''} ${droppedItems[2].name}`, inline: true }
            )
            .setImage(droppedItems[0].image)
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
