const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. CONNECT TO DATABASE (With Safety Net) ---
mongoose.connect(process.env.MONGO_URI, { 
    serverSelectionTimeoutMS: 5000 // Give up after 5 seconds instead of hanging forever
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ DATABASE ERROR:', err.message));

const CardSchema = new mongoose.Schema({
    code: String, name: String, group: String, rarity: String, image: String 
});
const Card = mongoose.model('Card', CardSchema);

// --- 2. COMMAND REGISTRATION ---
const commands = [
    { name: 'drop', description: 'Order a 3-item card drop!' },
    {
        name: 'addcard',
        description: 'STAFF ONLY: Add a new card',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'code', description: 'Code (e.g. ATZYS#001)', type: 3, required: true },
            { name: 'name', description: 'Idol name', type: 3, required: true },
            { name: 'group', description: 'Group name', type: 3, required: true },
            { name: 'rarity', description: 'Rarity', type: 3, required: true },
            { name: 'image', description: 'Upload file', type: 11, required: true }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Commands Synced');
    } catch (e) { console.error('❌ Command Sync Error:', e); }
})();

// --- 3. THE HANDLER ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // ADD CARD COMMAND
    if (interaction.commandName === 'addcard') {
        // This 'defer' tells Discord "I am working on it, don't time out!"
        await interaction.deferReply({ ephemeral: true });

        try {
            const code = interaction.options.getString('code').toUpperCase();
            const name = interaction.options.getString('name');
            const group = interaction.options.getString('group');
            const rarity = interaction.options.getString('rarity');
            const imageFile = interaction.options.getAttachment('image');

            const newCard = new Card({ code, name, group, rarity, image: imageFile.url });
            await newCard.save();
            
            await interaction.editReply(`✅ Successfully added **[${code}] ${name}**!`);
        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ Database is acting up! Check Railway logs. Error: ${error.message}`);
        }
    }

    // DROP COMMAND
    if (interaction.commandName === 'drop') {
        try {
            const allCards = await Card.find();
            if (allCards.length < 1) return interaction.reply("The cafe is empty! Add cards first.");
            
            // Simple drop logic for now
            const card = allCards[Math.floor(Math.random() * allCards.length)];
            const embed = new EmbedBuilder()
                .setTitle("☕ Cafe Drop")
                .setDescription(`You found **${card.name}**!`)
                .setImage(card.image)
                .setColor('#D2B48C');

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            await interaction.reply("❌ Database error during drop.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
