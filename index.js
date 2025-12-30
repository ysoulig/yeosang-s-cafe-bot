const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- DATA SETUP ---
const DATA_DIR = './data'; 
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const INV_FILE = path.join(DATA_DIR, 'inventories.json');

const readJSON = (file) => {
    try { 
        if (!fs.existsSync(file)) return file.includes('inventories') ? {} : [];
        return JSON.parse(fs.readFileSync(file, 'utf8')); 
    } catch (e) { return file.includes('inventories') ? {} : []; }
};

// --- 2. EMOJIS (Fixed with full <:name:ID> format) ---
const EMOJIS = {
    COMPUTER: '<:YS_COMPUTER:1444114271901450412>',
    BEAN: '<:YS_COFFEEBEAN:1394451580312490035>',
    COIN: '<:YS_COIN:1394451524096098337>',
    RARITY: {
        "1": "<:YS_BASIC:1392222205055602741>",
        "2": "<:YS_AWESOME:1392219819440603341>",
        "3": "<:YS_SUPER:1392220075276107896>",
        "4": "<:YS_RARE4:1394450951267684362>"
    }
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'drop') {
        const cards = readJSON(CARDS_FILE);
        if (cards.length < 3) return interaction.reply("Add more cards first!");

        await interaction.deferReply();
        const selected = cards.sort(() => 0.5 - Math.random()).slice(0, 3);

        // This creates the "3-column" text layout above the image
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.username} is dropping cards...`, iconURL: interaction.user.displayAvatarURL() })
            .setColor('#D2B48C')
            .addFields(
                { name: 'Slot 1', value: `${EMOJIS.RARITY[selected[0].rarity] || '❓'}\n\`${selected[0].code}\``, inline: true },
                { name: 'Slot 2', value: `${EMOJIS.RARITY[selected[1].rarity] || '❓'}\n\`${selected[1].code}\``, inline: true },
                { name: 'Slot 3', value: `${EMOJIS.RARITY[selected[2].rarity] || '❓'}\n\`${selected[2].code}\``, inline: true }
            )
            .setImage(selected[0].image) // Preview of the first card
            .setFooter({ text: 'Click the buttons below to claim!' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_0').setLabel('1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim_1').setLabel('2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim_2').setLabel('3').setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.editReply({ 
            content: `**${interaction.user.username}** has dropped 3 cards!`, 
            embeds: [embed], 
            components: [row] 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });
        let claims = [null, null, null];

        collector.on('collect', async i => {
            const idx = parseInt(i.customId.split('_')[1]);
            if (claims[idx]) return i.reply({ content: "Already claimed!", ephemeral: true });

            claims[idx] = i.user;
            const currentInv = readJSON(INV_FILE);
            if (!currentInv[i.user.id]) currentInv[i.user.id] = [];
            currentInv[i.user.id].push(selected[idx]);
            fs.writeFileSync(INV_FILE, JSON.stringify(currentInv, null, 2));

            await i.reply({ content: `✅ You claimed **${selected[idx].name}**!`, ephemeral: true });
        });

        collector.on('end', async () => {
            // THE AFTER-DROP LAYOUT
            const finalResults = selected.map((card, idx) => {
                const claimer = claims[idx] ? `<@${claims[idx].id}>` : "*Expired*";
                const emoji = EMOJIS.RARITY[card.rarity] || '❓';
                return `\`Card • ${idx + 1}\` .\n**${card.name}** [${card.group}] // __${card.code}__   〔 ${emoji} 〕\nEra : ${card.era}\nClaimed by : ${claimer}`;
            }).join('\n\n');
            
            await interaction.editReply({ content: finalResults, embeds: [], components: [] });
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
