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
    return interaction.reply({ content: 'Bingo is connected.', ephemeral: true });
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