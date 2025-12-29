const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. YOUR CARD LIST ---
const cardPool = [
  { name: 'Yeosang', group: 'ATEEZ', rarity: '⭐ Rare', image: 'https://placehold.co/400x600/png?text=Yeosang' },
  { name: 'San', group: 'ATEEZ', rarity: '🌸 Common', image: 'https://placehold.co/400x600/png?text=San' },
  { name: 'Mingi', group: 'ATEEZ', rarity: '🌸 Common', image: 'https://placehold.co/400x600/png?text=Mingi' },
  { name: 'Hongjoong', group: 'ATEEZ', rarity: '✨ Ultra', image: 'https://placehold.co/400x600/png?text=Hongjoong' }
];

// --- 2. COOLDOWN TRACKER ---
const dropCooldowns = new Map();

// --- 3. REGISTER COMMANDS ---
const commands = [{ name: 'drop', description: 'Order a 3-item card drop!' }];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Successfully reloaded /drop command!');
  } catch (error) { console.error(error); }
})();

// --- 4. THE BOT INTERACTIONS ---
client.on('interactionCreate', async interaction => {
  
  // HANDLE SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'drop') {
      
      // Check Cooldown
      const lastDrop = dropCooldowns.get(interaction.user.id);
      const now = Date.now();
      if (lastDrop && (now - lastDrop) < 60000) { // 60 seconds
        const timeLeft = Math.ceil((60000 - (now - lastDrop)) / 1000);
        return interaction.reply({ content: `⏳ Your cafe order is still being prepared! Wait ${timeLeft} more seconds.`, ephemeral: true });
      }

      // Pick 3 random cards
      const droppedItems = [
        cardPool[Math.floor(Math.random() * cardPool.length)],
        cardPool[Math.floor(Math.random() * cardPool.length)],
        cardPool[Math.floor(Math.random() * cardPool.length)]
      ];

      const dropEmbed = new EmbedBuilder()
        .setTitle('☕ New Cafe Order!')
        .setDescription(`${interaction.user.username} dropped 3 items! Use the buttons below to claim one.`)
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

      const message = await interaction.reply({ embeds: [dropEmbed], components: [buttons], fetchReply: true });
      
      // Set the cooldown after a successful drop
      dropCooldowns.set(interaction.user.id, now);

      // Create a "Collector" to listen for button clicks for 15 seconds
      const collector = message.createMessageComponentCollector({ time: 15000 });

      collector.on('collect', async bInteraction => {
        const index = bInteraction.customId.split('_')[1];
        const chosenCard = droppedItems[index];

        // "Ephemeral" means only the person who clicked sees this message!
        await bInteraction.reply({ content: `✅ You claimed **${chosenCard.name}**! It has been added to your collection.`, ephemeral: true });
        
        // Disable buttons so no one else can claim from this drop
        const disabledRow = new ActionRowBuilder().addComponents(
            buttons.components.map(button => ButtonBuilder.from(button).setDisabled(true))
        );
        await interaction.editReply({ components: [disabledRow] });
        collector.stop();
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
