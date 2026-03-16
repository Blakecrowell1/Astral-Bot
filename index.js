const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    EmbedBuilder
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

const PVM_ACTIVITIES = [
    "ToA",
    "CoX",
    "ToB",
    "Hueycoatl",
    "Wilderness Bosses",
    "Yama",
    "God Wars Dungeon",
    "Royal Titans",
    "Nex",
    "Nightmare",
    "Dagannoth Kings",
    "Corporeal Beast"
];

const MINIGAME_ACTIVITIES = [
    "Barbarian Assault",
    "Pest Control",
    "Soul Wars",
    "Castle Wars",
    "Guardians of the Rift",
    "Wintertodt",
    "Tempoross",
    "Volcanic Mine",
    "Shooting Stars"
];

const ACTIVITY_MAP = {
    "ToA": { type: "PvM", roleId: "1479613378333905120" },
    "CoX": { type: "PvM", roleId: "1479613406725279920" },
    "ToB": { type: "PvM", roleId: "1479613429844279371" },
    "Hueycoatl": { type: "PvM", roleId: "1479613496386916483" },
    "Wilderness Bosses": { type: "PvM", roleId: "1479614016799113397" },
    "Yama": { type: "PvM", roleId: "1479613668667686983" },
    "God Wars Dungeon": { type: "PvM", roleId: "1479636155434664127" },
    "Royal Titans": { type: "PvM", roleId: "1479613468389937334" },
    "Nex": { type: "PvM", roleId: "1479613451751129148" },
    "Nightmare": { type: "PvM", roleId: "1479614048927613028" },
    "Dagannoth Kings": { type: "PvM", roleId: "1479614231711318086" },
    "Corporeal Beast": { type: "PvM", roleId: "1479613807373586565" },

    "Barbarian Assault": { type: "Minigame", roleId: "1479635786168271084" },
    "Pest Control": { type: "Minigame", roleId: "1479635832133517484" },
    "Soul Wars": { type: "Minigame", roleId: "1479635856779251782" },
    "Castle Wars": { type: "Minigame", roleId: "1479635955542523956" },
    "Guardians of the Rift": { type: "Minigame", roleId: "1479635989810118824" },
    "Wintertodt": { type: "Minigame", roleId: "1479636034085060681" },
    "Tempoross": { type: "Minigame", roleId: "1479636062610395146" },
    "Volcanic Mine": { type: "Minigame", roleId: "1479636083183718583" },
    "Shooting Stars": { type: "Minigame", roleId: "1479636112149577758" }
};

const TEAM_LIMITS = {
    "Duo": 2,
    "Trio": 3,
    "4 Man": 4,
    "5 Man": 5,
    "Mass": 999,
    "Learners": 999
};

const lfgDrafts = new Map();
const activeLfgPosts = new Map();

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

function getEmptyDraft() {
    return {
        activityType: "",
        activityName: "",
        teamSize: "",
        startTime: "",
        notes: ""
    };
}

function getDraft(userId) {
    if (!lfgDrafts.has(userId)) {
        lfgDrafts.set(userId, getEmptyDraft());
    }
    return lfgDrafts.get(userId);
}

function buildLfgPanelContent(userId) {
    const draft = getDraft(userId);

    return `🟣 **Astral LFG Setup**

**Activity Type:** ${draft.activityType || "Not selected"}
**Activity:** ${draft.activityName || "Not selected"}
**Team Size:** ${draft.teamSize || "Not selected"}
**Start Time:** ${draft.startTime || "Not selected"}
**Notes:** ${draft.notes || "None"}

Choose your options below, then press **Submit LFG**.`;
}

function buildActivityOptions(activityType) {
    const activities =
        activityType === "PvM" ? PVM_ACTIVITIES :
        activityType === "Minigame" ? MINIGAME_ACTIVITIES :
        [];

    return activities.map(name => ({
        label: name,
        value: name
    }));
}

function buildLfgPanelComponents(userId) {
    const draft = getDraft(userId);

    const typeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('lfg_type')
            .setPlaceholder('Choose Activity Type')
            .addOptions(
                { label: 'PvM', value: 'PvM' },
                { label: 'Minigame', value: 'Minigame' }
            )
    );

    const activityMenu = new StringSelectMenuBuilder()
        .setCustomId('lfg_activity')
        .setPlaceholder(
            draft.activityType
                ? `Choose ${draft.activityType} Activity`
                : 'Choose Activity Type First'
        );

    if (!draft.activityType) {
        activityMenu
            .setDisabled(true)
            .addOptions([{ label: 'Choose Activity Type First', value: 'disabled_activity' }]);
    } else {
        activityMenu.addOptions(buildActivityOptions(draft.activityType));
    }

    const activityRow = new ActionRowBuilder().addComponents(activityMenu);

    const teamRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('lfg_team')
            .setPlaceholder('Choose Team Size')
            .addOptions(
                { label: 'Duo', value: 'Duo' },
                { label: 'Trio', value: 'Trio' },
                { label: '4 Man', value: '4 Man' },
                { label: '5 Man', value: '5 Man' },
                { label: 'Mass', value: 'Mass' },
                { label: 'Learners', value: 'Learners' }
            )
    );

    const timeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('lfg_time')
            .setPlaceholder('Choose Start Time')
            .addOptions(
                { label: 'Now', value: 'Now' },
                { label: '15 Minutes', value: '15 Minutes' },
                { label: '30 Minutes', value: '30 Minutes' },
                { label: '1 Hour', value: '1 Hour' }
            )
    );

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lfg_notes')
            .setLabel('Add Notes')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('lfg_submit')
            .setLabel('Submit LFG')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('lfg_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
    );

    return [typeRow, activityRow, teamRow, timeRow, buttonRow];
}

function buildStartTimeText(startTime) {
    const now = Math.floor(Date.now() / 1000);

    if (startTime === "Now") {
        return `<t:${now}:t> • <t:${now}:R>`;
    }

    if (startTime === "15 Minutes") {
        const ts = now + (15 * 60);
        return `<t:${ts}:t> • <t:${ts}:R>`;
    }

    if (startTime === "30 Minutes") {
        const ts = now + (30 * 60);
        return `<t:${ts}:t> • <t:${ts}:R>`;
    }

    if (startTime === "1 Hour") {
        const ts = now + (60 * 60);
        return `<t:${ts}:t> • <t:${ts}:R>`;
    }

    return startTime;
}

function buildEventButtons(isFull, isClosed) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lfg_join')
                .setLabel('Join')
                .setStyle(ButtonStyle.Success)
                .setDisabled(isFull || isClosed),
            new ButtonBuilder()
                .setCustomId('lfg_leave')
                .setLabel('Leave')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(isClosed),
            new ButtonBuilder()
                .setCustomId('lfg_close')
                .setLabel('Close')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(isClosed)
        )
    ];
}

function buildInterestedList(post) {
    return post.interested.map(id => {
        if (id === post.hostId) return `• <@${id}> (Host)`;
        return `• <@${id}>`;
    }).join('\n');
}

function buildLfgEmbed(post) {
    const isFull = post.interested.length >= post.limit;
    let footerText = "Open Group";

    if (post.closed) {
        footerText = "Group Closed";
    } else if (isFull) {
        footerText = "Group Full";
    }

    return new EmbedBuilder()
        .setTitle("Astral Group Finder")
        .setDescription(`<@&${post.roleId}>`)
        .addFields(
            { name: "Activity", value: post.activityName, inline: true },
            { name: "Type", value: post.activityType, inline: true },
            { name: "Team Size", value: post.teamSize, inline: true },
            { name: "Host", value: `<@${post.hostId}>`, inline: true },
            { name: "Start Time", value: post.startTimeText, inline: true },
            { name: "Notes", value: post.notes || "None", inline: false },
            { name: "Interested", value: buildInterestedList(post), inline: false }
        )
        .setFooter({ text: footerText });
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
            const member = interaction.member;

            if (!member.roles.cache.has(MEMBER_ROLE_ID)) {
                await interaction.reply({
                    content: "You must have the Member role to create LFG events.",
                    ephemeral: true
                });
                return;
            }

            if (interaction.channel.id !== LFG_CHANNEL_ID) {
                await interaction.reply({
                    content: "LFG events can only be created in the LFG channel.",
                    ephemeral: true
                });
                return;
            }

            lfgDrafts.set(interaction.user.id, getEmptyDraft());

            await interaction.reply({
                content: buildLfgPanelContent(interaction.user.id),
                components: buildLfgPanelComponents(interaction.user.id),
                ephemeral: true
            });
            return;
        }

        if (interaction.customId === 'lfg_notes') {
            const modal = new ModalBuilder()
                .setCustomId('lfg_notes_modal')
                .setTitle('Add LFG Notes');

            const notesInput = new TextInputBuilder()
                .setCustomId('notes')
                .setLabel('Notes')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Optional notes')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(notesInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'lfg_cancel') {
            lfgDrafts.delete(interaction.user.id);

            await interaction.update({
                content: "LFG creation canceled.",
                components: []
            });
            return;
        }

        if (interaction.customId === 'lfg_submit') {
            const draft = getDraft(interaction.user.id);

            if (!draft.activityType || !draft.activityName || !draft.teamSize || !draft.startTime) {
                await interaction.reply({
                    content: "Please finish all dropdown selections before submitting.",
                    ephemeral: true
                });
                return;
            }

            const activityInfo = ACTIVITY_MAP[draft.activityName];

            if (!activityInfo) {
                await interaction.reply({
                    content: "That activity is not recognized.",
                    ephemeral: true
                });
                return;
            }

            if (activityInfo.type !== draft.activityType) {
                await interaction.reply({
                    content: "Your Activity Type and Activity do not match. Please fix them and try again.",
                    ephemeral: true
                });
                return;
            }

            const newPost = {
                hostId: interaction.user.id,
                activityType: draft.activityType,
                activityName: draft.activityName,
                teamSize: draft.teamSize,
                limit: TEAM_LIMITS[draft.teamSize] || 999,
                startTimeText: buildStartTimeText(draft.startTime),
                notes: draft.notes || "",
                roleId: activityInfo.roleId,
                interested: [interaction.user.id],
                closed: false
            };

            const isFull = newPost.interested.length >= newPost.limit;

            const sentMessage = await interaction.channel.send({
                content: `<@&${newPost.roleId}>`,
                embeds: [buildLfgEmbed(newPost)],
                components: buildEventButtons(isFull, false)
            });

            activeLfgPosts.set(sentMessage.id, newPost);
            lfgDrafts.delete(interaction.user.id);

            await interaction.update({
                content: "LFG posted successfully.",
                components: []
            });
            return;
        }

        if (interaction.customId === 'lfg_join') {
            const post = activeLfgPosts.get(interaction.message.id);

            if (!post) {
                await interaction.reply({
                    content: "This LFG post is no longer active.",
                    ephemeral: true
                });
                return;
            }

            if (post.closed) {
                await interaction.reply({
                    content: "This group is closed.",
                    ephemeral: true
                });
                return;
            }

            if (post.interested.includes(interaction.user.id)) {
                await interaction.reply({
                    content: "You are already in this group.",
                    ephemeral: true
                });
                return;
            }

            if (post.interested.length >= post.limit) {
                await interaction.reply({
                    content: "This group is already full.",
                    ephemeral: true
                });
                return;
            }

            post.interested.push(interaction.user.id);

            const isFull = post.interested.length >= post.limit;

            await interaction.update({
                content: `<@&${post.roleId}>`,
                embeds: [buildLfgEmbed(post)],
                components: buildEventButtons(isFull, false)
            });
            return;
        }

        if (interaction.customId === 'lfg_leave') {
            const post = activeLfgPosts.get(interaction.message.id);

            if (!post) {
                await interaction.reply({
                    content: "This LFG post is no longer active.",
                    ephemeral: true
                });
                return;
            }

            if (post.closed) {
                await interaction.reply({
                    content: "This group is closed.",
                    ephemeral: true
                });
                return;
            }

            if (interaction.user.id === post.hostId) {
                await interaction.reply({
                    content: "The host cannot leave their own group.",
                    ephemeral: true
                });
                return;
            }

            if (!post.interested.includes(interaction.user.id)) {
                await interaction.reply({
                    content: "You are not currently in this group.",
                    ephemeral: true
                });
                return;
            }

            post.interested = post.interested.filter(id => id !== interaction.user.id);

            const isFull = post.interested.length >= post.limit;

            await interaction.update({
                content: `<@&${post.roleId}>`,
                embeds: [buildLfgEmbed(post)],
                components: buildEventButtons(isFull, false)
            });
            return;
        }

        if (interaction.customId === 'lfg_close') {
            const post = activeLfgPosts.get(interaction.message.id);

            if (!post) {
                await interaction.reply({
                    content: "This LFG post is no longer active.",
                    ephemeral: true
                });
                return;
            }

            if (interaction.user.id !== post.hostId) {
                await interaction.reply({
                    content: "Only the host can close this group.",
                    ephemeral: true
                });
                return;
            }

            post.closed = true;

            await interaction.update({
                content: `<@&${post.roleId}>`,
                embeds: [buildLfgEmbed(post)],
                components: buildEventButtons(false, true)
            });

            setTimeout(async () => {
                try {
                    await interaction.message.delete();
                    activeLfgPosts.delete(interaction.message.id);
                } catch (err) {
                    console.log("Could not delete closed LFG post:", err.message);
                }
            }, 30 * 60 * 1000);

            return;
        }
    }

    if (interaction.isStringSelectMenu()) {
        const draft = getDraft(interaction.user.id);

        if (interaction.customId === 'lfg_type') {
            draft.activityType = interaction.values[0];
            draft.activityName = "";
        }

        if (interaction.customId === 'lfg_activity') {
            draft.activityName = interaction.values[0];
        }

        if (interaction.customId === 'lfg_team') {
            draft.teamSize = interaction.values[0];
        }

        if (interaction.customId === 'lfg_time') {
            draft.startTime = interaction.values[0];
        }

        lfgDrafts.set(interaction.user.id, draft);

        await interaction.update({
            content: buildLfgPanelContent(interaction.user.id),
            components: buildLfgPanelComponents(interaction.user.id)
        });
        return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'lfg_notes_modal') {
            const draft = getDraft(interaction.user.id);
            draft.notes = interaction.fields.getTextInputValue('notes') || '';
            lfgDrafts.set(interaction.user.id, draft);

            await interaction.reply({
                content: "Notes saved. Go back to your LFG panel and press Submit LFG when ready.",
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
            content: "Timezone dropdown setup is coming next.",
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

const embed = new EmbedBuilder()
    .setColor(0x7a5cff)
    .setTitle("Astral Group Finder")
    .setDescription(
`Create a group for **PvM** or **minigame** content.

Press **Create LFG** below to start a group event.`
    )
    .setFooter({ text: "Astral Clan Event System" });

await interaction.channel.send({
    embeds: [embed],
    components: [row]
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