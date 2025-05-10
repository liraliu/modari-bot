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
            content: `
You are a Discord content moderation engine. You are strict, but only flag messages that clearly contain harmful, abusive, violent, sexually explicit, predatory, or extremely inappropriate content. Ignore slang, jokes, sarcasm, and mild emotional language.

Your response must be exactly one word: "safe" or "unsafe".

Message: "${content}"
`
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
