const axios = require('axios');

async function checkMessage(content) {
  try {
    console.log("Sending to AI:", content);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',  // test model
        messages: [
          {
            role: 'user',
            content: `Is this message inappropriate for Discord? Reply only with "safe" or "unsafe": "${content}"`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI moderation failed:", err.response?.data || err.message);
    return "safe"; // fallback to safe on error
  }
}

module.exports = { checkMessage };
