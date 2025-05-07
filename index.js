require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// 🚨 List of sketchy or harmful phrases
const flaggedWords = [
  'send nudes', "what's your age", 'where do you live', 'i can help you', 
  "don't tell anyone", 'secret', "i won't tell your parents", 
  "don't tell your parents", 
  'cut yourself', 'kill yourself', 'kys', 'rape', 'suicide'
];

// 📊 Live stats
let totalMessagesScanned = 0;
let totalFlaggedMessages = 0;
const flaggedUsers = new Set();

// 🛠️ Create the bot client with message-reading permissions
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ✅ On bot ready
client.once('ready', () => {
  console.log(`🚨 Modari AI is online as ${client.user.tag}`);
});

// 🧠 Single message handler (scanning + stats command)
client.on('messageCreate', message => {
  if (message.author.bot) return;

  // 📊 Show stats command
  if (message.content === '/modari-stats') {
    const statsMessage = `
📊 **ModariBot Live Stats**
- Messages Scanned: ${totalMessagesScanned}
- Messages Flagged: ${totalFlaggedMessages}
- Unique Users Flagged: ${flaggedUsers.size}
    `;
    message.channel.send(statsMessage);
    return;
  }

  // 🚨 Scan message for harmful content
  totalMessagesScanned++;
  const content = message.content.toLowerCase();

  for (let word of flaggedWords) {
    if (content.includes(word)) {
      message.delete().catch(console.error);
      message.channel.send(`⚠️ <@${message.author.id}>, your message was flagged and removed for safety.`);
      flaggedUsers.add(message.author.id);
      totalFlaggedMessages++;
      console.log(`[FLAGGED] ${message.author.tag}: ${message.content}`);
      break; // only trigger once per message
    }
  }
});

// 🔐 Login with token
client.login(process.env.TOKEN);
