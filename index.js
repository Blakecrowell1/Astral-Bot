const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1480264097780994270";
const GUILD_ID = "1479549670354190393";

const LFG_CHANNEL_ID = "1479599992346906675";
const MEMBER_ROLE_ID = "1479586030058471530";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Set your timezone'),
    new SlashCommandBuilder()
        .setName('lfgpanel')
        .setDescription('Create the LFG control panel')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands.map(c => c.toJSON()) }
        );

        await client.login(TOKEN);
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log("Astral Bot is online");
});

client.on('interactionCreate', async interaction => {

    if (interaction.isButton()) {

        if (interaction.customId === 'create_lfg') {
            await interaction.reply({
                content: "LFG creation form coming next step.",
                ephemeral: true
            });
            return;
        }

    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'timezone') {

        await interaction.reply({
            content: "Timezone setup panel coming next step.",
            ephemeral: true
        });

        return;
    }

    if (interaction.commandName === 'lfgpanel') {

        const member = interaction.member;

        if (!member.roles.cache.has(MEMBER_ROLE_ID)) {
            await interaction.reply({
                content: "You must have the Member role to use this.",
                ephemeral: true
            });
            return;
        }

        if (interaction.channel.id !== LFG_CHANNEL_ID) {
            await interaction.reply({
                content: "This command can only be used in the LFG channel.",
                ephemeral: true
            });
            return;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_lfg')
                .setLabel('Create LFG')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: "LFG control panel created.",
            ephemeral: true
        });

        await interaction.channel.send({
            content:
`🟣 **Astral Group Finder**

Create a group for PvM or minigame content.

Press the button below to create an LFG event.`,
            components: [row]
        });

        return;
    }

});