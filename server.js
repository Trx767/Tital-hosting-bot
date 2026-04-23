const { Telegraf, Markup } = require('telegraf');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const express = require('express');

// 🔑 သားကြီးရဲ့ Bot Token
const TOKEN = '8409403263:AAEfB166UtdplUjXOQp8odEc61493dh_YbI'; 
const bot = new Telegraf(TOKEN);

// Web Server (For Render's Port binding)
const app = express();
app.get('/', (req, res) => res.send('Titan Multi-Host is Online! 🚀'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web Server listening on port ${PORT}`));

let activeProcesses = {}; 
let userFiles = {}; 

if (fs.existsSync('user_db.json')) {
    try { userFiles = JSON.parse(fs.readFileSync('user_db.json')); } catch (e) { userFiles = {}; }
}

const mainKeyboard = Markup.keyboard([
    ['📂 MY FILES', '🗑️ DELETE FILE'],
    ['📥 GET FILE', '🔄 RESTART ALL']
]).resize();

bot.start((ctx) => {
    ctx.reply("🚀 **TITAN UNIVERSAL HOST READY**\n\n- Send .js or .py files to host.", mainKeyboard);
});

bot.on('document', async (ctx) => {
    const file = ctx.message.document;
    const name = file.file_name;
    const userId = ctx.from.id;

    if (!name.endsWith('.js') && !name.endsWith('.py')) {
        return ctx.reply("❌ Error: Only .js and .py are supported.");
    }

    ctx.reply(`📥 Downloading \`${name}\`...`);

    try {
        const fileLink = await ctx.telegram.getFileLink(file.file_id);
        const response = await axios({ url: fileLink.href, responseType: 'arraybuffer' });
        const uniqueName = `${userId}_${name}`;
        fs.writeFileSync(uniqueName, response.data);

        if (!userFiles[userId]) userFiles[userId] = [];
        if (!userFiles[userId].includes(name)) userFiles[userId].push(name);
        fs.writeFileSync('user_db.json', JSON.stringify(userFiles, null, 2));

        ctx.reply(`✅ Hosted: \`${name}\` is live.`);
        runUserBot(userId, name, uniqueName);
    } catch (e) { ctx.reply("❌ Error downloading file."); }
});

bot.hears('📥 GET FILE', (ctx) => {
    const files = userFiles[ctx.from.id] || [];
    if (files.length === 0) return ctx.reply("No files found.");
    const buttons = files.map(f => [Markup.button.callback(`📥 Get ${f}`, `get_${f}`)]);
    ctx.reply("Choose file:", Markup.inlineKeyboard(buttons));
});

bot.action(/get_(.+)/, async (ctx) => {
    const fileName = ctx.match[1];
    const unique = `${ctx.from.id}_${fileName}`;
    if (fs.existsSync(unique)) {
        await ctx.replyWithDocument({ source: unique, filename: fileName });
    }
});

function runUserBot(userId, originalName, uniqueName) {
    if (activeProcesses[uniqueName]) activeProcesses[uniqueName].kill();
    let cmd = originalName.endsWith('.js') ? 'node' : 'python3';
    activeProcesses[uniqueName] = spawn(cmd, [uniqueName]);
}

bot.launch();
console.log("SERVER LIVE...");
