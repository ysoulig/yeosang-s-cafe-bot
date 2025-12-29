const { Client, GatewayIntentBits } = require('discord.js');

// This creates the connection to Discord
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// This message shows up in your Railway logs when the bot turns on
client.once('ready', () => {
    console.log('✅ Yeosang Cafe Bot is now online!');
});

// This is a simple test command: type !hello in your server
client.on('messageCreate', (message) => {
    if (message.content === '!hello') {
        message.reply('Welcome to Yeosang’s Cafe! ☕');
    }
});

// THIS IS THE KEY: It uses the Variable you added to Railway
client.login(process.env.DISCORD_TOKEN);
