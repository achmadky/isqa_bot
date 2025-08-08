// api/bot.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;

    // Replace with your group or channel chat_id
    const CHAT_ID = process.env.CHAT_ID; 

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ error: 'BOT_TOKEN or CHAT_ID missing in environment variables' });
    }

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const tgRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message
      })
    });

    const data = await tgRes.json();

    if (!data.ok) {
      return res.status(500).json({ error: 'Failed to send message', details: data });
    }

    return res.status(200).json({ success: true, result: data.result });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
