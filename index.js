const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 1. Register the /ping command
const commands = [
  {
    name: 'ping',
    description: 'Check if the bot is alive!',
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Successfully reloaded slash commands!');
  } catch (error) {
    console.error(error);
  }
})();

// 2. Respond to the /ping command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    await interaction.editReply(`🏓 **Pong!**\nBuild Latency: ${latency}ms\nAPI Heartbeat: ${client.ws.ping}ms`);
  }
});

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} is online and ready to test!`);
});

client.login(process.env.DISCORD_TOKEN);
