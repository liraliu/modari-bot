require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { checkMessage } = require('./ai');
const { supabase } = require('./supabase');

// 📊 Live stats
let totalMessagesScanned = 0;
let totalFlaggedMessages = 0;
const flaggedUsers = new Set();

// 🛠️ Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ✅ When bot is ready
client.once('ready', () => {
  console.log(`🚨 Modari AI is online as ${client.user.tag}`);
});

// 🧠 Handle messages
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content;

  // 📊 Stats command
  if (content.toLowerCase() === '/modari-stats') {
    const statsMessage = `
📊 **ModariBot Live Stats**
- Messages Scanned: ${totalMessagesScanned}
- Messages Flagged: ${totalFlaggedMessages}
- Unique Users Flagged: ${flaggedUsers.size}
    `;
    message.channel.send(statsMessage);
    return;
  }

  // 🔍 AI-based moderation
  totalMessagesScanned++;

  const result = await checkMessage(content);

  if (result.toLowerCase() === "unsafe") {
    message.delete().catch(err => {
      console.error("❌ Failed to delete message:", err);
    });

    message.channel.send(`⚠️ <@${message.author.id}>, your message was flagged and removed for safety.`);
    flaggedUsers.add(message.author.id);
    totalFlaggedMessages++;

    const { error: insertError } = await supabase.from('flagged_messages').insert([{
      user_id: message.author.id,
      username: message.author.tag,
      content: message.content,
      timestamp: new Date().toISOString()
    }]);

    if (insertError) {
      console.error("❌ Supabase insert failed:", insertError);
    } else {
      console.log("✅ Flagged message logged to Supabase.");
    }

    console.log(`[AI-FLAGGED] ${message.author.tag}: ${content}`);
  }

  // 📈 Real-time stat update
  const { error: updateError } = await supabase.from('modari_stats').update({
    scanned: totalMessagesScanned,
    flagged: totalFlaggedMessages,
    timestamp: new Date().toISOString()
  }).eq('id', 1);

  if (updateError) {
    console.error("❌ Failed to update stats:", updateError);
  }
});

// 🔐 Login to Discord
client.login(process.env.TOKEN);
