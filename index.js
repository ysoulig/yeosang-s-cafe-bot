const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 1. Define your slash commands here
const commands = [
  {
    name: 'cafe',
    description: 'Welcome to Yeosang’s Cafe!',
  },
  {
    name: 'bias',
    description: 'Get a random photo of a member (Coming soon!)',
  }
];

// 2. This part registers the commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    // This updates the commands for EVERY server your bot is in
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// 3. This tells the bot what to do when someone uses a command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'cafe') {
    await interaction.reply('☕ Welcome to **Yeosang’s Cafe**! What can I get for you today?');
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN);
