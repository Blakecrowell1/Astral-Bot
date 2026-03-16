const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1480264097780994270";
const GUILD_ID = "1479549670354190393";
const OWNER_ID = "1289553957982830713";
const COFFER_CHANNEL_ID = "1480275246002081972";

const LFG_CHANNEL_ID = "1479599992346906675";
const MEMBER_ROLE_ID = "1479586030058471530";

const COIN = "<:Coins:1480262838323773625>";
const DATA_FILE = "coffer.json";

let data = {
    total: 0,
    messageId: null
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        data.total = saved.total || 0;
        data.messageId = saved.messageId || null;
    } catch {
        data = { total: 0, messageId: null };
    }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function format(num) {
    if (num >= 1000000000) {
        const v = num / 1000000000;
        return Number.isInteger(v) ? `${v}b` : `${v.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}b`;
    }

    if (num >= 1000000) {
        const v = num / 1000000;
        return Number.isInteger(v) ? `${v}m` : `${v.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}m`;
    }

    if (num >= 1000) {
        const v = num / 1000;
        return Number.isInteger(v) ? `${v}k` : `${v.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}k`;
    }

    return `${num}gp`;
}

function parseGP(input) {
    if (!input) return NaN;

    input = input.toLowerCase().trim();

    if (input.endsWith("b")) return Math.round(parseFloat(input) * 1000000000);
    if (input.endsWith("m")) return Math.round(parseFloat(input) * 1000000);
    if (input.endsWith("k")) return Math.round(parseFloat(input) * 1000);

    return Math.round(parseFloat(input));
}

function buildCofferMessage() {
    return `${COIN}┃Clan Coffers: ${format(data.total)}`;
}

async function ensureCofferMessage(client) {
    try {
        const channel = await client.channels.fetch(COFFER_CHANNEL_ID);
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        let message = null;

        if (data.messageId) {
            try {
                message = await channel.messages.fetch(data.messageId);
            } catch {
                message = null;
            }
        }

        if (!message) {
            message = await channel.send(buildCofferMessage());
            data.messageId = message.id;
            saveData();
            return;
        }

        await message.edit(buildCofferMessage());
    } catch (err) {
        console.log("Could not create or update coffer message:", err.message);
    }
}

const commands = [
    new SlashCommandBuilder()
        .setName('coffer')
        .setDescription('Shows the clan coffer total'),

    new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add GP to the clan coffer')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Example: 25m, 500k, 2b')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove GP from the clan coffer')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Example: 25m, 500k, 2b')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Set your timezone'),

    new SlashCommandBuilder()
        .setName('lfgpanel')
        .setDescription('Create the LFG control panel')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log("Astral Bot is online");
    await ensureCofferMessage(client);
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

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "coffer") {
        await interaction.reply(`${COIN}┃Clan Coffers: ${format(data.total)}`);
        return;
    }

    if (interaction.commandName === "add" || interaction.commandName === "remove") {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({
                content: "Only Bruin can change the coffer.",
                ephemeral: true
            });
            return;
        }

        const amount = parseGP(interaction.options.getString("amount"));

        if (!amount || isNaN(amount) || amount <= 0) {
            await interaction.reply({
                content: "Enter a valid amount like 25m, 500k, or 2b.",
                ephemeral: true
            });
            return;
        }

        if (interaction.commandName === "add") {
            data.total += amount;
            saveData();

            await interaction.reply(`Added ${format(amount)}. ${COIN} New Total: ${format(data.total)}`);
            await ensureCofferMessage(client);
            return;
        }

        if (interaction.commandName === "remove") {
            data.total = Math.max(0, data.total - amount);
            saveData();

            await interaction.reply(`Removed ${format(amount)}. ${COIN} New Total: ${format(data.total)}`);
            await ensureCofferMessage(client);
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
            content: `🟣 **Astral Group Finder**

Create a group for PvM or minigame content.

Press the button below to create an LFG event.`,
            components: [row]
        });

        return;
    }
});

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        await client.login(TOKEN);
    } catch (err) {
        console.error(err);
    }
})();