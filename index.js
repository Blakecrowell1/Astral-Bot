const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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
    const modal = new ModalBuilder()
        .setCustomId('lfg_modal')
        .setTitle('Create Astral LFG');

    const activityTypeInput = new TextInputBuilder()
        .setCustomId('activity_type')
        .setLabel('Activity Type: PvM or Minigame')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: PvM')
        .setRequired(true);

    const activityInput = new TextInputBuilder()
        .setCustomId('activity_name')
        .setLabel('Activity Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: ToA')
        .setRequired(true);

    const teamSizeInput = new TextInputBuilder()
        .setCustomId('team_size')
        .setLabel('Team Size')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: 4 Man')
        .setRequired(true);

    const startTimeInput = new TextInputBuilder()
        .setCustomId('start_time')
        .setLabel('Start Time')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: Now or 17:00')
        .setRequired(true);

    const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Notes')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Optional notes')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(activityTypeInput),
        new ActionRowBuilder().addComponents(activityInput),
        new ActionRowBuilder().addComponents(teamSizeInput),
        new ActionRowBuilder().addComponents(startTimeInput),
        new ActionRowBuilder().addComponents(notesInput)
    );

    await interaction.showModal(modal);
    return;
}

if (interaction.isModalSubmit()) {

    if (interaction.customId === 'lfg_modal') {
        const activityType = interaction.fields.getTextInputValue('activity_type');
        const activityName = interaction.fields.getTextInputValue('activity_name');
        const teamSize = interaction.fields.getTextInputValue('team_size');
        const startTime = interaction.fields.getTextInputValue('start_time');
        const notes = interaction.fields.getTextInputValue('notes') || 'None';

        await interaction.reply({
            content:
`LFG submitted.

Activity Type: ${activityType}
Activity: ${activityName}
Team Size: ${teamSize}
Start Time: ${startTime}
Notes: ${notes}`,
            ephemeral: true
        });

        return;
    }

}
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