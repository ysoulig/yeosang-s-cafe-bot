const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. YOUR CARD LIST ---
// This is where you will add your idols later!
const cardPool = [
  { name: 'Yeosang', group: 'ATEEZ', rarity: '⭐ Rare', image: 'https://placehold.co/400x600/png?text=Yeosang' },
  { name: 'San', group: 'ATEEZ', rarity: '🌸 Common', image: 'https://placehold.co/400x600/png?text=San' },
  { name: 'Mingi', group: 'ATEEZ', rarity: '🌸 Common', image: 'https://placehold.co/400x600/png?text=Mingi' },
  { name: 'Hongjoong', group: 'ATEEZ', rarity: '✨ Ultra', image: 'https://placehold.co/400x600/png?text=Hongjoong' }
];

// --- 2. REGISTER THE DROP COMMAND ---
const commands = [{ name: 'drop', description: 'Order a 3-item card drop!' }];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Successfully reloaded /drop command!');
  } catch (error) { console.error(error); }
})();

// --- 3. THE DROP LOGIC ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'drop') {
    // Pick 3 random cards from the pool above
    const item1 = cardPool[Math.floor(Math.random() * cardPool.length)];
    const item2 = cardPool[Math.floor(Math.random() * cardPool.length)];
    const item3 = cardPool[Math.floor(Math.random() * cardPool.length)];

    // Create the "Rectangle" (The Embed)
    const dropEmbed = new EmbedBuilder()
      .setTitle('☕ New Cafe Order!')
      .setDescription(`${interaction.user.username} dropped 3 items!`)
      .addFields(
        { name: 'Item 1', value: `${item1.name} (${item1.rarity})`, inline: true },
        { name: 'Item 2', value: `${item2.name} (${item2.rarity})`, inline: true },
        { name: 'Item 3', value: `${item3.name} (${item3.rarity})`, inline: true }
      )
      .setColor('#D2B48C') // A nice cafe brown color
      .setFooter({ text: 'You have 10 seconds to claim!' });

    // Create the buttons
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim1').setLabel('1').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('claim2').setLabel('2').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('claim3').setLabel('3').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [dropEmbed], components: [buttons] });
  }
});

client.login(process.env.DISCORD_TOKEN);
