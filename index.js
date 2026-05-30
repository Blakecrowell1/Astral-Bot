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
const fetch = require('node-fetch');
const {
    initDB,
    recordAttendance,
    getAttendance,
    deleteAttendance,
    removeMostRecentAttendance,
    addRecruit,
    getRecruits,
    removeRecruit,
    getRecruiter,
    recordDonation,
    getTotalDonations,
    getCofferTotal,
    setCofferTotal,
    getCofferMessageId,
    setCofferMessageId
} = require('./database');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1480264097780994270";
const GUILD_ID = "1479549670354190393";
const OWNER_ID = "1289553957982830713";
const COFFER_CHANNEL_ID = "1480281233337487571";
const LFG_CHANNEL_ID = "1479599992346906675";
const MEMBER_ROLE_ID = "1479586030058471530";
const RECRUIT_CHANNEL_ID = "1479812369889624345";
const STAFF_ROLE_ID = "1480285731955019806";
const LEADERSHIP_ROLE_ID = "1479585915037941872";
const BOT_COMMANDS_CHANNEL_ID = "1508520980035801169";
const ATTENDANCE_CHANNEL_ID = "1510339026446712982";
const EVENT_LOG_CHANNEL_ID = "1510339149851394229";
const EVENT_STAFF_ROLE_ID = "1479806170943328289";
const EVENT_TEAM_LEAD_ROLE_ID = "1479805747163435130";
const WOM_LINK = "https://wiseoldman.net/groups/24109";

const COIN = "<:Coins:1480262838323773625>";
const ASTRAL_BLUE = 0x93BFD6;

// Pending attendance pastes waiting for event name modal
const pendingAttendance = new Map();

const PVM_ACTIVITIES = [
    "ToA", "CoX", "ToB", "Hueycoatl", "Wilderness Bosses", "Yama",
    "God Wars Dungeon", "Royal Titans", "Nex", "Nightmare", "Dagannoth Kings", "Corporeal Beast"
];

const MINIGAME_ACTIVITIES = [
    "Barbarian Assault", "Pest Control", "Soul Wars", "Castle Wars",
    "Guardians of the Rift", "Wintertodt", "Tempoross", "Volcanic Mine", "Shooting Stars"
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
    "Duo": 2, "Trio": 3, "4 Man": 4, "5 Man": 5, "Mass": 999, "Learners": 999
};

const lfgDrafts = new Map();
const activeLfgPosts = new Map();

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
    return {
        embeds: [
            new EmbedBuilder()
                .setColor(0xFFD700)
                .setDescription(`${COIN} ${format(getCofferTotal())} ${COIN}`)
        ]
    };
}

async function ensureCofferMessage(client) {
    try {
        const channel = await client.channels.fetch(COFFER_CHANNEL_ID);
        if (!channel || channel.type !== ChannelType.GuildText) return;

        let message = null;
        const savedId = getCofferMessageId();

        if (savedId) {
            try {
                message = await channel.messages.fetch(savedId);
            } catch {
                message = null;
            }
        }

        if (!message) {
            message = await channel.send(buildCofferMessage());
            setCofferMessageId(message.id);
            console.log("Created new coffer message:", message.id);
            return;
        }

        await message.edit(buildCofferMessage());
        console.log("Updated existing coffer message:", message.id);
    } catch (err) {
        console.log("Could not create or update coffer message:", err.message);
    }
}

async function postCommandsList(client) {
    try {
        const channel = await client.channels.fetch(BOT_COMMANDS_CHANNEL_ID);
        if (!channel || channel.type !== ChannelType.GuildText) return;

        const embed = new EmbedBuilder()
            .setColor(ASTRAL_BLUE)
            .setTitle('⚔️ Astral RS — Bot Commands')
            .setDescription('All available bot commands for Astral RS members.')
            .addFields(
                {
                    name: '👤 Member Commands',
                    value: [
                        '`/profile` — View your own clan profile',
                        '`/profile @member` — View another member\'s profile',
                        '`/coffer` — Check the current clan coffer total',
                        '`/eventattendance` — Check your event attendance history',
                        '`/eventattendance @member` — Check another member\'s attendance',
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'Astral RS Clan • Commands are restricted to #bot-commands' })
            .setTimestamp();

        // Clear old command list messages and repost
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        for (const msg of botMessages.values()) {
            try { await msg.delete(); } catch {}
        }

        await channel.send({ embeds: [embed] });
        console.log("Posted commands list.");
    } catch (err) {
        console.log("Could not post commands list:", err.message);
    }
}

async function postAttendancePanel(client) {
    try {
        const channel = await client.channels.fetch(ATTENDANCE_CHANNEL_ID);
        if (!channel || channel.type !== ChannelType.GuildText) return;

        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        for (const msg of botMessages.values()) {
            try { await msg.delete(); } catch {}
        }

        const embed = new EmbedBuilder()
            .setColor(ASTRAL_BLUE)
            .setTitle('📋 Event Attendance Submission')
            .setDescription('Use the buttons below to record clan event attendance.\n\n📋 **Hosted Event** — Paste RuneLite attendance data\n🏆 **WOM Competition** — Pull results from Wise Old Man')
            .setFooter({ text: 'Astral RS Clan • Leadership Only' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('submit_attendance')
                .setLabel('📋 Hosted Event')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('submit_wom')
                .setLabel('🏆 WOM Competition')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row] });
        console.log("Posted attendance panel.");
    } catch (err) {
        console.log("Could not post attendance panel:", err.message);
    }
}

function getEmptyDraft() {
    return { activityType: "", activityName: "", teamSize: "", startTime: "", notes: "" };
}

function getDraft(userId) {
    if (!lfgDrafts.has(userId)) lfgDrafts.set(userId, getEmptyDraft());
    return lfgDrafts.get(userId);
}

function buildLfgPanelContent(userId) {
    const draft = getDraft(userId);
    return `🔵 **Astral LFG Setup**\n\n**Activity Type:** ${draft.activityType || "Not selected"}\n**Activity:** ${draft.activityName || "Not selected"}\n**Team Size:** ${draft.teamSize || "Not selected"}\n**Start Time:** ${draft.startTime || "Not selected"}\n**Notes:** ${draft.notes || "None"}\n\nChoose your options below, then press **Submit LFG**.`;
}

function buildActivityOptions(activityType) {
    const activities = activityType === "PvM" ? PVM_ACTIVITIES : activityType === "Minigame" ? MINIGAME_ACTIVITIES : [];
    return activities.map(name => ({ label: name, value: name }));
}

function buildLfgPanelComponents(userId) {
    const draft = getDraft(userId);

    const typeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('lfg_type')
            .setPlaceholder('Choose Activity Type')
            .addOptions({ label: 'PvM', value: 'PvM' }, { label: 'Minigame', value: 'Minigame' })
    );

    const activityMenu = new StringSelectMenuBuilder()
        .setCustomId('lfg_activity')
        .setPlaceholder(draft.activityType ? `Choose ${draft.activityType} Activity` : 'Choose Activity Type First');

    if (!draft.activityType) {
        activityMenu.setDisabled(true).addOptions([{ label: 'Choose Activity Type First', value: 'disabled_activity' }]);
    } else {
        activityMenu.addOptions(buildActivityOptions(draft.activityType));
    }

    const teamRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('lfg_team')
            .setPlaceholder('Choose Team Size')
            .addOptions(
                { label: 'Duo', value: 'Duo' }, { label: 'Trio', value: 'Trio' },
                { label: '4 Man', value: '4 Man' }, { label: '5 Man', value: '5 Man' },
                { label: 'Mass', value: 'Mass' }, { label: 'Learners', value: 'Learners' }
            )
    );

    const timeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('lfg_time')
            .setPlaceholder('Choose Start Time')
            .addOptions(
                { label: 'Now', value: 'Now' }, { label: '15 Minutes', value: '15 Minutes' },
                { label: '30 Minutes', value: '30 Minutes' }, { label: '1 Hour', value: '1 Hour' }
            )
    );

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lfg_notes').setLabel('📝 Add Notes').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lfg_submit').setLabel('✅ Submit LFG').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('lfg_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
    );

    return [typeRow, new ActionRowBuilder().addComponents(activityMenu), teamRow, timeRow, buttonRow];
}

function buildStartTimeText(startTime) {
    const now = Math.floor(Date.now() / 1000);
    if (startTime === "Now") return `<t:${now}:t> • <t:${now}:R>`;
    if (startTime === "15 Minutes") { const ts = now + 900; return `<t:${ts}:t> • <t:${ts}:R>`; }
    if (startTime === "30 Minutes") { const ts = now + 1800; return `<t:${ts}:t> • <t:${ts}:R>`; }
    if (startTime === "1 Hour") { const ts = now + 3600; return `<t:${ts}:t> • <t:${ts}:R>`; }
    return startTime;
}

function buildEventButtons(isFull, isClosed) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lfg_join').setLabel('✅ Join').setStyle(ButtonStyle.Success).setDisabled(isFull || isClosed),
            new ButtonBuilder().setCustomId('lfg_leave').setLabel('❌ Leave').setStyle(ButtonStyle.Danger).setDisabled(isClosed),
            new ButtonBuilder().setCustomId('lfg_close').setLabel('🔒 Close').setStyle(ButtonStyle.Secondary).setDisabled(isClosed)
        )
    ];
}

function buildInterestedList(post) {
    if (post.interested.length === 0) return 'No one yet';
    return post.interested.map(id => id === post.hostId ? `• <@${id}> 👑` : `• <@${id}>`).join('\n');
}

function buildLfgEmbed(post) {
    const isFull = post.interested.length >= post.limit;
    let statusEmoji = '🟢';
    let footerText = 'Open Group';
    if (post.closed) { statusEmoji = '🔴'; footerText = 'Group Closed'; }
    else if (isFull) { statusEmoji = '🟡'; footerText = 'Group Full'; }

    return new EmbedBuilder()
        .setColor(ASTRAL_BLUE)
        .setTitle(`${statusEmoji} Astral Group Finder`)
        .setDescription(`<@&${post.roleId}>`)
        .addFields(
            { name: '⚔️ Activity', value: post.activityName, inline: true },
            { name: '🗂️ Type', value: post.activityType, inline: true },
            { name: '👥 Team Size', value: post.teamSize, inline: true },
            { name: '👑 Host', value: `<@${post.hostId}>`, inline: true },
            { name: '⏰ Start Time', value: post.startTimeText, inline: true },
            { name: '📝 Notes', value: post.notes || 'None', inline: true },
            { name: `🎯 Interested (${post.interested.length}/${post.limit === 999 ? '∞' : post.limit})`, value: buildInterestedList(post), inline: false }
        )
        .setFooter({ text: footerText })
        .setTimestamp();
}

const commands = [
    new SlashCommandBuilder().setName('coffer').setDescription('Shows the clan coffer total'),

    new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add GP to the clan coffer')
        .addStringOption(o => o.setName('amount').setDescription('Example: 25m, 500k, 2b').setRequired(true))
        .addUserOption(o => o.setName('member').setDescription('Member who donated (optional)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove GP from the clan coffer')
        .addStringOption(o => o.setName('amount').setDescription('Example: 25m, 500k, 2b').setRequired(true)),

    new SlashCommandBuilder().setName('timezone').setDescription('Set your timezone'),
    new SlashCommandBuilder().setName('lfgpanel').setDescription('Create the LFG control panel'),

    new SlashCommandBuilder()
        .setName('recordattendance')
        .setDescription('Record attendance from a clan event (Leadership only)')
        .addStringOption(o => o.setName('data').setDescription('Paste the full attendance block here').setRequired(true)),

    new SlashCommandBuilder()
        .setName('addattendance')
        .setDescription('Manually add an attendance credit for a member (Leadership only)')
        .addUserOption(o => o.setName('member').setDescription('The member to credit').setRequired(true))
        .addStringOption(o => o.setName('event').setDescription('Name of the event').setRequired(true)),

    new SlashCommandBuilder()
        .setName('removeattendance')
        .setDescription('Remove the most recent attendance entry for a member (Leadership only)')
        .addUserOption(o => o.setName('member').setDescription('The member to remove attendance from').setRequired(true)),

    new SlashCommandBuilder()
        .setName('addrecruit')
        .setDescription('Credit a member for recruiting a new clan member (Leadership only)')
        .addUserOption(o => o.setName('recruit').setDescription('The new member who joined').setRequired(true))
        .addUserOption(o => o.setName('recruiter').setDescription('The member who recruited them').setRequired(true)),

    new SlashCommandBuilder()
        .setName('removerecruit')
        .setDescription("Remove a recruit from a recruiter's record (Leadership only)")
        .addUserOption(o => o.setName('recruit').setDescription('The recruit to remove').setRequired(true)),

    new SlashCommandBuilder()
        .setName('profile')
        .setDescription("View a clan member's profile")
        .addUserOption(o => o.setName('member').setDescription('Member to look up (leave blank to view your own)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('eventattendance')
        .setDescription('Check clan event attendance')
        .addUserOption(o => o.setName('member').setDescription('Member to look up (leave blank to check yourself)').setRequired(false)),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
    console.log("Astral Bot is online");
    await initDB();
    await ensureCofferMessage(client);
    await postCommandsList(client);
    await postAttendancePanel(client);
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    console.log("Member cache loaded.");
});

client.on('guildMemberAdd', async () => {});

client.on('guildMemberRemove', async (member) => {
    try {
        deleteAttendance(member.id);
        removeRecruit(member.id);

        const channel = await member.guild.channels.fetch(RECRUIT_CHANNEL_ID);
        if (!channel || channel.type !== ChannelType.GuildText) return;

        const nickname = member.nickname || member.displayName || member.user.username;
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("Member Left")
            .setDescription(`${nickname} left the server.`)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.log("Leave event error:", err.message);
    }
});

client.on('interactionCreate', async interaction => {

    if (interaction.isButton()) {

        if (interaction.customId === 'submit_attendance') {
            const member = interaction.member;
            const hasRole = member.roles.cache.has(LEADERSHIP_ROLE_ID) ||
                            member.roles.cache.has(EVENT_STAFF_ROLE_ID) ||
                            member.roles.cache.has(EVENT_TEAM_LEAD_ROLE_ID);

            if (!hasRole) {
                await interaction.reply({ content: "You don't have permission to submit attendance.", ephemeral: true });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId('attendance_submit_modal')
                .setTitle('Submit Event Attendance');

            const pasteInput = new TextInputBuilder()
                .setCustomId('attendance_paste')
                .setLabel('Paste RuneLite attendance data')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Paste the full attendance block from the RuneLite plugin here')
                .setRequired(true);

            const eventInput = new TextInputBuilder()
                .setCustomId('event_name')
                .setLabel('What event was this?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. Raid Night, SotW Week 3, BotW')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(pasteInput),
                new ActionRowBuilder().addComponents(eventInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'submit_wom') {
            const member = interaction.member;
            const hasRole = member.roles.cache.has(LEADERSHIP_ROLE_ID) ||
                            member.roles.cache.has(EVENT_STAFF_ROLE_ID) ||
                            member.roles.cache.has(EVENT_TEAM_LEAD_ROLE_ID);

            if (!hasRole) {
                await interaction.reply({ content: "You don't have permission to submit WOM competition results.", ephemeral: true });
                return;
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('wom_event_type')
                    .setPlaceholder('Select event type')
                    .addOptions(
                        { label: 'Skill of the Week (100k XP)', value: 'skill', emoji: '⚔️' },
                        { label: 'Boss of the Week (50 Kills)', value: 'boss', emoji: '💀' }
                    )
            );

            await interaction.reply({
                content: '🏆 **WOM Competition — Select Event Type**

What type of competition was this?',
                components: [row],
                ephemeral: true
            });
            return;
        }

        if (interaction.customId === 'create_lfg') {
            const member = interaction.member;
            if (!member.roles.cache.has(MEMBER_ROLE_ID)) {
                await interaction.reply({ content: "You must have the Member role to create LFG events.", ephemeral: true });
                return;
            }
            if (interaction.channel.id !== LFG_CHANNEL_ID) {
                await interaction.reply({ content: "LFG events can only be created in the LFG channel.", ephemeral: true });
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
            const modal = new ModalBuilder().setCustomId('lfg_notes_modal').setTitle('Add Notes to Your LFG');
            const notesInput = new TextInputBuilder()
                .setCustomId('notes')
                .setLabel('Notes (optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('e.g. Learner friendly, bring supplies, Discord required...')
                .setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'lfg_cancel') {
            lfgDrafts.delete(interaction.user.id);
            await interaction.update({ content: "LFG creation canceled.", components: [] });
            return;
        }

        if (interaction.customId === 'lfg_submit') {
            const draft = getDraft(interaction.user.id);
            if (!draft.activityType || !draft.activityName || !draft.teamSize || !draft.startTime) {
                await interaction.reply({ content: "Please finish all dropdown selections before submitting.", ephemeral: true });
                return;
            }
            const activityInfo = ACTIVITY_MAP[draft.activityName];
            if (!activityInfo || activityInfo.type !== draft.activityType) {
                await interaction.reply({ content: "Activity type and activity do not match. Please fix them and try again.", ephemeral: true });
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
            await interaction.update({ content: "✅ LFG posted successfully!", components: [] });

            // Auto-delete after 3 hours if not closed
            setTimeout(async () => {
                const post = activeLfgPosts.get(sentMessage.id);
                if (post && !post.closed) {
                    try {
                        await sentMessage.delete();
                        activeLfgPosts.delete(sentMessage.id);
                        console.log("Auto-deleted expired LFG post:", sentMessage.id);
                    } catch (err) {
                        console.log("Could not auto-delete LFG post:", err.message);
                    }
                }
            }, 3 * 60 * 60 * 1000);

            return;
        }

        if (interaction.customId === 'lfg_join') {
            const post = activeLfgPosts.get(interaction.message.id);
            if (!post) { await interaction.reply({ content: "This LFG post is no longer active.", ephemeral: true }); return; }
            if (post.closed) { await interaction.reply({ content: "This group is closed.", ephemeral: true }); return; }
            if (post.interested.includes(interaction.user.id)) { await interaction.reply({ content: "You are already in this group.", ephemeral: true }); return; }
            if (post.interested.length >= post.limit) { await interaction.reply({ content: "This group is already full.", ephemeral: true }); return; }
            post.interested.push(interaction.user.id);
            const isFull = post.interested.length >= post.limit;
            await interaction.update({ content: `<@&${post.roleId}>`, embeds: [buildLfgEmbed(post)], components: buildEventButtons(isFull, false) });
            return;
        }

        if (interaction.customId === 'lfg_leave') {
            const post = activeLfgPosts.get(interaction.message.id);
            if (!post) { await interaction.reply({ content: "This LFG post is no longer active.", ephemeral: true }); return; }
            if (post.closed) { await interaction.reply({ content: "This group is closed.", ephemeral: true }); return; }
            if (interaction.user.id === post.hostId) { await interaction.reply({ content: "The host cannot leave their own group.", ephemeral: true }); return; }
            if (!post.interested.includes(interaction.user.id)) { await interaction.reply({ content: "You are not currently in this group.", ephemeral: true }); return; }
            post.interested = post.interested.filter(id => id !== interaction.user.id);
            const isFull = post.interested.length >= post.limit;
            await interaction.update({ content: `<@&${post.roleId}>`, embeds: [buildLfgEmbed(post)], components: buildEventButtons(isFull, false) });
            return;
        }

        if (interaction.customId === 'lfg_close') {
            const post = activeLfgPosts.get(interaction.message.id);
            if (!post) { await interaction.reply({ content: "This LFG post is no longer active.", ephemeral: true }); return; }
            const isLeader = interaction.member.roles.cache.has(LEADERSHIP_ROLE_ID);
            if (interaction.user.id !== post.hostId && !isLeader) {
                await interaction.reply({ content: "Only the host or leadership can close this group.", ephemeral: true });
                return;
            }
            post.closed = true;
            await interaction.update({ content: `<@&${post.roleId}>`, embeds: [buildLfgEmbed(post)], components: buildEventButtons(false, true) });
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
        if (interaction.customId === 'wom_event_type') {
            const eventType = interaction.values[0];
            const threshold = eventType === 'skill' ? 100000 : 50;
            const thresholdLabel = eventType === 'skill' ? '100k XP' : '50 kills';

            const modal = new ModalBuilder()
                .setCustomId(`wom_submit_modal_${eventType}_${threshold}`)
                .setTitle('WOM Competition Details');

            const compIdInput = new TextInputBuilder()
                .setCustomId('competition_id')
                .setLabel('WOM Competition ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. 12345 (from the WOM competition URL)')
                .setRequired(true);

            const eventNameInput = new TextInputBuilder()
                .setCustomId('event_name')
                .setLabel('Event Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. SotW Week 3, BotW - Zulrah')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(compIdInput),
                new ActionRowBuilder().addComponents(eventNameInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'lfg_type') { draft.activityType = interaction.values[0]; draft.activityName = ""; }
        if (interaction.customId === 'lfg_activity') draft.activityName = interaction.values[0];
        if (interaction.customId === 'lfg_team') draft.teamSize = interaction.values[0];
        if (interaction.customId === 'lfg_time') draft.startTime = interaction.values[0];
        lfgDrafts.set(interaction.user.id, draft);
        await interaction.update({ content: buildLfgPanelContent(interaction.user.id), components: buildLfgPanelComponents(interaction.user.id) });
        return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'lfg_notes_modal') {
            const draft = getDraft(interaction.user.id);
            draft.notes = interaction.fields.getTextInputValue('notes') || '';
            lfgDrafts.set(interaction.user.id, draft);
            await interaction.reply({ content: "Notes saved! Go back to your LFG panel and press **Submit LFG** when ready.", ephemeral: true });
            return;
        }

        if (interaction.customId === 'attendance_submit_modal') {
            const raw = interaction.fields.getTextInputValue('attendance_paste');
            const eventName = interaction.fields.getTextInputValue('event_name');
            const eventDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const normalized = raw.replace(/`/g, '');
            const recorded = [];
            const notFound = [];

            const matches = [...normalized.matchAll(/([A-Za-z0-9 _'\-]+)\s*\|\s*\d{2}:\d{2}\s*\|/g)];
            for (const match of matches) {
                const rsn = match[1].trim().replace(/^Late\s*/i, '').replace(/^-\s*/i, '').trim();
                if (!rsn || rsn.toLowerCase() === 'name') continue;
                const guildMember = interaction.guild.members.cache.find(m => {
                    const nick = (m.nickname || m.displayName || '').toLowerCase();
                    return nick === rsn.toLowerCase();
                });
                if (guildMember) {
                    recordAttendance(guildMember.id, rsn, eventDate, eventName);
                    recorded.push(rsn);
                } else {
                    notFound.push(rsn);
                }
            }

            await interaction.reply({ content: `✅ Attendance recorded successfully!`, ephemeral: true });

            // Post results embed to event log channel
            try {
                const logChannel = await interaction.guild.channels.fetch(EVENT_LOG_CHANNEL_ID);
                if (logChannel && logChannel.type === ChannelType.GuildText) {
                    const resultEmbed = new EmbedBuilder()
                        .setColor(ASTRAL_BLUE)
                        .setTitle(`📋 Event Attendance — ${eventName}`)
                        .addFields(
                            { name: '📅 Date', value: eventDate, inline: true },
                            { name: '👥 Members Credited', value: `${recorded.length}`, inline: true },
                            { name: '✅ Credited Members', value: recorded.length > 0 ? recorded.map(r => `• ${r}`).join('\n') : 'None', inline: false },
                            notFound.length > 0 ? { name: '⚠️ Not Found (Nickname Mismatch?)', value: notFound.map(r => `• ${r}`).join('\n'), inline: false } : { name: '\u200b', value: '\u200b', inline: false }
                        )
                        .setFooter({ text: `Submitted by ${interaction.member.nickname || interaction.user.username}` })
                        .setTimestamp();

                    await logChannel.send({ embeds: [resultEmbed] });
                }
            } catch (err) {
                console.log("Could not post to event log channel:", err.message);
            }
            return;
        }

        if (interaction.customId.startsWith('wom_submit_modal_')) {
            const parts = interaction.customId.split('_');
            const eventType = parts[3];
            const threshold = parseInt(parts[4]);
            const thresholdLabel = eventType === 'skill' ? '100k XP' : '50 kills';

            const competitionId = interaction.fields.getTextInputValue('competition_id').trim();
            const eventName = interaction.fields.getTextInputValue('event_name').trim();
            const eventDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            await interaction.deferReply({ ephemeral: true });

            try {
                const res = await fetch(`https://api.wiseoldman.net/v2/competitions/${competitionId}/top5`);
                const allRes = await fetch(`https://api.wiseoldman.net/v2/competitions/${competitionId}/participants`);

                if (!allRes.ok) {
                    await interaction.editReply({ content: `⚠️ Could not find WOM competition with ID **${competitionId}**. Please check the ID and try again.` });
                    return;
                }

                const participants = await allRes.json();
                const qualified = participants.filter(p => {
                    const gained = p.progress?.gained ?? 0;
                    return gained >= threshold;
                });

                const recorded = [];
                const notFound = [];
                const belowThreshold = participants.length - qualified.length;

                for (const participant of qualified) {
                    const rsn = participant.player?.displayName || participant.player?.username;
                    if (!rsn) continue;

                    const guildMember = interaction.guild.members.cache.find(m => {
                        const nick = (m.nickname || m.displayName || '').toLowerCase();
                        return nick === rsn.toLowerCase();
                    });

                    if (guildMember) {
                        recordAttendance(guildMember.id, rsn, eventDate, eventName);
                        recorded.push(rsn);
                    } else {
                        notFound.push(rsn);
                    }
                }

                await interaction.editReply({ content: `✅ WOM competition results recorded!` });

                // Post results to event log channel
                const logChannel = await interaction.guild.channels.fetch(EVENT_LOG_CHANNEL_ID);
                if (logChannel && logChannel.type === ChannelType.GuildText) {
                    const resultEmbed = new EmbedBuilder()
                        .setColor(ASTRAL_BLUE)
                        .setTitle(`🏆 WOM Competition — ${eventName}`)
                        .addFields(
                            { name: '📅 Date', value: eventDate, inline: true },
                            { name: '👥 Members Credited', value: `${recorded.length}`, inline: true },
                            { name: '📊 Threshold', value: thresholdLabel, inline: true },
                            { name: '❌ Below Threshold', value: `${belowThreshold}`, inline: true },
                            { name: '✅ Credited Members', value: recorded.length > 0 ? recorded.map(r => `• ${r}`).join('\n') : 'None', inline: false },
                            notFound.length > 0 ? { name: '⚠️ Not Found (Nickname Mismatch?)', value: notFound.map(r => `• ${r}`).join('\n'), inline: false } : { name: '\u200b', value: '\u200b', inline: false }
                        )
                        .setFooter({ text: `Submitted by ${interaction.member.nickname || interaction.user.username} • WOM ID: ${competitionId}` })
                        .setTimestamp();

                    await logChannel.send({ embeds: [resultEmbed] });
                }
            } catch (err) {
                console.log("WOM fetch error:", err.message);
                await interaction.editReply({ content: `⚠️ Something went wrong fetching the WOM competition. Please try again.` });
            }
            return;
        }

        if (interaction.customId === 'attendance_event_modal') {
            const pending = pendingAttendance.get(interaction.user.id);
            if (!pending) {
                await interaction.reply({ content: "Session expired. Please run `/recordattendance` again.", ephemeral: true });
                return;
            }
            pendingAttendance.delete(interaction.user.id);

            const eventName = interaction.fields.getTextInputValue('event_name');
            const { raw } = pending;
            const eventDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const normalized = raw.replace(/`/g, '');
            const recorded = [];
            const notFound = [];

            const matches = [...normalized.matchAll(/([A-Za-z0-9 _'\-]+)\s*\|\s*\d{2}:\d{2}\s*\|/g)];
            for (const match of matches) {
                const rsn = match[1].trim().replace(/^Late\s*/i, '').replace(/^-\s*/i, '').trim();
                if (!rsn || rsn.toLowerCase() === 'name') continue;
                const guildMember = interaction.guild.members.cache.find(m => {
                    const nick = (m.nickname || m.displayName || '').toLowerCase();
                    return nick === rsn.toLowerCase();
                });
                if (guildMember) {
                    recordAttendance(guildMember.id, rsn, eventDate, eventName);
                    recorded.push(rsn);
                } else {
                    notFound.push(rsn);
                }
            }

            let response = `✅ **Attendance recorded for ${eventDate} — ${eventName}**\n`;
            response += `👥 **${recorded.length} member(s) credited:** ${recorded.join(', ') || 'None'}\n`;
            if (notFound.length > 0) response += `⚠️ **Could not find (nickname mismatch?):** ${notFound.join(', ')}`;

            await interaction.reply({ content: response, ephemeral: true });
            return;
        }
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "coffer") {
        await interaction.reply(`${COIN}┃Clan Coffers: ${format(getCofferTotal())}`);
        return;
    }

    if (interaction.commandName === "add" || interaction.commandName === "remove") {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: "Only Raleigh can change the coffer.", ephemeral: true });
            return;
        }
        const amount = parseGP(interaction.options.getString("amount"));
        if (!amount || isNaN(amount) || amount <= 0) {
            await interaction.reply({ content: "Enter a valid amount like 25m, 500k, or 2b.", ephemeral: true });
            return;
        }
        if (interaction.commandName === "add") {
            const donatingMember = interaction.options.getMember('member');
            if (donatingMember) {
                const rsn = donatingMember.nickname || donatingMember.displayName || donatingMember.user.username;
                recordDonation(donatingMember.id, rsn, amount);
            }
            setCofferTotal(getCofferTotal() + amount);
            const donorText = donatingMember ? ` from **${donatingMember.nickname || donatingMember.displayName}**` : '';
            await interaction.reply(`Added ${format(amount)}${donorText}. ${COIN} New Total: ${format(getCofferTotal())}`);
            await ensureCofferMessage(client);
            return;
        }
        if (interaction.commandName === "remove") {
            setCofferTotal(Math.max(0, getCofferTotal() - amount));
            await interaction.reply(`Removed ${format(amount)}. ${COIN} New Total: ${format(getCofferTotal())}`);
            await ensureCofferMessage(client);
            return;
        }
    }

    if (interaction.commandName === 'timezone') {
        await interaction.reply({ content: "Timezone dropdown setup is coming next.", ephemeral: true });
        return;
    }

    if (interaction.commandName === 'recordattendance') {
        const member = interaction.member;
        if (!member.roles.cache.has(LEADERSHIP_ROLE_ID)) {
            await interaction.reply({ content: "Only leadership can record attendance.", ephemeral: true });
            return;
        }
        const raw = interaction.options.getString('data');
        pendingAttendance.set(interaction.user.id, { raw });

        const modal = new ModalBuilder().setCustomId('attendance_event_modal').setTitle('Name This Event');
        const eventInput = new TextInputBuilder()
            .setCustomId('event_name')
            .setLabel('What event was this?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. Raid Night, SotW Week 3, BotW')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(eventInput));
        await interaction.showModal(modal);
        return;
    }

    if (interaction.commandName === 'addattendance') {
        const member = interaction.member;
        if (!member.roles.cache.has(LEADERSHIP_ROLE_ID)) {
            await interaction.reply({ content: "Only leadership can manually add attendance.", ephemeral: true });
            return;
        }
        const target = interaction.options.getMember('member');
        const eventName = interaction.options.getString('event');
        const rsn = target.nickname || target.displayName || target.user.username;
        const eventDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        recordAttendance(target.id, rsn, eventDate, eventName);
        await interaction.reply({ content: `✅ Manually added 1 attendance credit for **${rsn}** — ${eventName} on ${eventDate}.`, ephemeral: true });
        return;
    }

    if (interaction.commandName === 'removeattendance') {
        const member = interaction.member;
        if (!member.roles.cache.has(LEADERSHIP_ROLE_ID)) {
            await interaction.reply({ content: "Only leadership can remove attendance.", ephemeral: true });
            return;
        }
        const target = interaction.options.getMember('member');
        const rsn = target.nickname || target.displayName || target.user.username;
        const rows = getAttendance(target.id);
        if (rows.length === 0) {
            await interaction.reply({ content: `⚠️ **${rsn}** has no attendance records to remove.`, ephemeral: true });
            return;
        }
        removeMostRecentAttendance(target.id);
        await interaction.reply({ content: `✅ Removed the most recent attendance entry for **${rsn}**. They now have **${rows.length - 1}** event(s) on record.`, ephemeral: true });
        return;
    }

    if (interaction.commandName === 'addrecruit') {
        const member = interaction.member;
        if (!member.roles.cache.has(LEADERSHIP_ROLE_ID)) {
            await interaction.reply({ content: "Only leadership can record recruits.", ephemeral: true });
            return;
        }
        const recruit = interaction.options.getMember('recruit');
        const recruiter = interaction.options.getMember('recruiter');
        const recruitRsn = recruit.nickname || recruit.displayName || recruit.user.username;
        const recruiterRsn = recruiter.nickname || recruiter.displayName || recruiter.user.username;
        addRecruit(recruiter.id, recruit.id, recruitRsn);
        await interaction.reply({ content: `✅ **${recruitRsn}** has been added to **${recruiterRsn}**'s recruit list.`, ephemeral: true });
        return;
    }

    if (interaction.commandName === 'removerecruit') {
        const member = interaction.member;
        if (!member.roles.cache.has(LEADERSHIP_ROLE_ID)) {
            await interaction.reply({ content: "Only leadership can remove recruits.", ephemeral: true });
            return;
        }
        const recruit = interaction.options.getMember('recruit');
        const recruitRsn = recruit.nickname || recruit.displayName || recruit.user.username;
        const recruiterId = getRecruiter(recruit.id);
        if (!recruiterId) {
            await interaction.reply({ content: `⚠️ **${recruitRsn}** is not linked to any recruiter.`, ephemeral: true });
            return;
        }
        const recruiterMember = interaction.guild.members.cache.get(recruiterId);
        const recruiterRsn = recruiterMember ? (recruiterMember.nickname || recruiterMember.displayName) : 'Unknown';
        removeRecruit(recruit.id);
        await interaction.reply({ content: `✅ **${recruitRsn}** has been removed from **${recruiterRsn}**'s recruit list.`, ephemeral: true });
        return;
    }

    if (interaction.commandName === 'eventattendance') {
        const target = interaction.options.getMember('member') || interaction.member;
        const rsn = target.nickname || target.displayName || target.user.username;
        const rows = getAttendance(target.id);
        if (rows.length === 0) {
            await interaction.reply({ content: `📋 **${rsn}** has no recorded event attendance yet.` });
            return;
        }
        const eventList = rows.map((r, i) => `${i + 1}. ${r.event_date} — ${r.event_name}`).join('\n');
        await interaction.reply({ content: `📋 **Event Attendance for ${rsn}**\n**Total: ${rows.length}**\n\n${eventList}` });
        return;
    }

    if (interaction.commandName === 'profile') {
        const target = interaction.options.getMember('member') || interaction.member;
        const rsn = target.nickname || target.displayName || target.user.username;

        const joinedAt = target.joinedAt;
        const now = new Date();
        const daysInClan = joinedAt ? Math.floor((now - joinedAt) / (1000 * 60 * 60 * 24)) : 0;

        const attendanceRows = getAttendance(target.id);
        const recruitRows = getRecruits(target.id);
        const totalDonated = getTotalDonations(target.id);

        const attendanceList = attendanceRows.length > 0
            ? attendanceRows.slice(0, 10).map((r, i) => `${i + 1}. ${r.event_date} — ${r.event_name}`).join('\n')
            : 'No events attended yet.';

        const recruitList = recruitRows.length > 0
            ? recruitRows.map(r => `• ${r.recruit_rsn}`).join('\n')
            : 'No recruits yet.';

        const embed = new EmbedBuilder()
            .setColor(ASTRAL_BLUE)
            .setTitle(`${rsn}'s Clan Profile`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📅 Days in Clan', value: `**${daysInClan} days**`, inline: true },
                { name: '📋 Events Attended', value: `**${attendanceRows.length}**`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '👥 Recruits', value: `**${recruitRows.length}**`, inline: true },
                { name: '💰 Total Donated', value: `**${totalDonated > 0 ? format(totalDonated) : '0gp'}**`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '📜 Attendance History (Last 10)', value: attendanceList, inline: false },
                { name: '🎯 Recruited Members', value: recruitList, inline: false }
            )
            .setFooter({ text: 'Astral RS Clan' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (interaction.commandName === 'lfgpanel') {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: "Only Raleigh can use this command.", ephemeral: true });
            return;
        }
        if (interaction.channel.id !== LFG_CHANNEL_ID) {
            await interaction.reply({ content: "This command can only be used in the LFG channel.", ephemeral: true });
            return;
        }
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_lfg').setLabel('⚔️ Create LFG').setStyle(ButtonStyle.Success)
        );
        const embed = new EmbedBuilder()
            .setColor(ASTRAL_BLUE)
            .setTitle("⚔️ Astral Group Finder")
            .setDescription(`Find others to group with for **PvM** or **minigame** content.\n\nPress **Create LFG** below to post a group event and ping interested members.`)
            .setFooter({ text: "Astral Clan • Groups auto-delete after 3 hours" });
        await interaction.reply({ content: "LFG control panel created.", ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return;
    }
});

(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        await client.login(TOKEN);
    } catch (err) {
        console.error(err);
    }
})();