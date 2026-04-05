const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'bingoData.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return {
            active: false,
            scoreboardChannelId: '',
            scoreboardMessageId: '',
            reviewChannelId: '',
            leadershipRoleId: '',
            staffRoleId: '',
            captains: {},
            teams: {},
            submissions: []
        };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function handleBingoCommand(interaction) {
const OWNER_ID = "1289553957982830713";

if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: 'Not allowed.', ephemeral: true });
}

const data = loadData();
const sub = interaction.options.getSubcommand();

if (sub === 'start') {
    data.active = true;
    saveData(data);
    return interaction.reply('Bingo started.');
}

if (sub === 'end') {
    data.active = false;
    saveData(data);
    return interaction.reply('Bingo ended.');
}

async function handleBingoButton(interaction) {
    return interaction.reply({ content: 'Bingo button clicked.', ephemeral: true });
}

module.exports = {
    handleBingoCommand,
    handleBingoButton,
    loadData,
    saveData
};