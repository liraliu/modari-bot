require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { checkMessage } = require('./ai');
const { supabase } = require('./supabase');

// 📊 Live stats (persisted from Supabase on startup)
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

// ✅ On bot startup
client.once('ready', async () => {
  console.log(`🚨 Modari AI is online as ${client.user.tag}`);

  // 🔁 Sync stats from Supabase
  const { data, error } = await supabase
    .from('modari_stats')
    .select('scanned, flagged')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("❌ Failed to fetch stats from Supabase:", error);
  } else {
    totalMessagesScanned = data.scanned || 0;
    totalFlaggedMessages = data.flagged || 0;
    console.log(`🔁 Loaded stats: ${totalMessagesScanned} scanned, ${totalFlaggedMessages} flagged`);
  }
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

  // 🔍 AI moderation
  totalMessagesScanned++;

  // ✅ Only update scanned if local value is higher
  const { data: currentStats, error: fetchError } = await supabase
    .from('modari_stats')
    .select('scanned')
    .eq('id', 1)
    .single();

  if (!fetchError && totalMessagesScanned > currentStats.scanned) {
    const { error: scanUpdateError } = await supabase
      .from('modari_stats')
      .update({
        scanned: totalMessagesScanned,
        timestamp: new Date().toISOString()
      })
      .eq('id', 1);

    if (scanUpdateError) {
      console.error("❌ Failed to update scanned count:", scanUpdateError);
    }
  }

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

    // ✅ Only update flagged if local value is higher
    const { data: currentFlagStats, error: fetchFlagError } = await supabase
      .from('modari_stats')
      .select('flagged')
      .eq('id', 1)
      .single();

    if (!fetchFlagError && totalFlaggedMessages > currentFlagStats.flagged) {
      const { error: updateError } = await supabase.from('modari_stats').update({
        flagged: totalFlaggedMessages,
        timestamp: new Date().toISOString()
      }).eq('id', 1);

      if (updateError) {
        console.error("❌ Failed to update flagged count:", updateError);
      }
    }

    console.log(`[AI-FLAGGED] ${message.author.tag}: ${content}`);
  }
});

// 🔐 Login to Discord
client.login(process.env.TOKEN);
