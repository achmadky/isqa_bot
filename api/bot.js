// /api/bot.js

export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("📩 Incoming update:", JSON.stringify(req.body, null, 2));

    const msg = req.body.message;

    if (msg) {
      const chatId = msg.chat?.id;
      const topicId = msg.message_thread_id || null;
      const text = msg.text || '';

      console.log(`💬 Chat ID: ${chatId}`);
      if (topicId) {
        console.log(`🧵 Topic ID: ${topicId}`);
      } else {
        console.log(`⚠️ No Topic ID found (message not in a topic)`);
      }
      console.log(`📝 Message text: ${text}`);

      // If you want to send reply to RULES_TOPIC_ID from env
      if (process.env.RULES_TOPIC_ID && chatId && text.toLowerCase() === '/rules') {
        const replyText = "📜 Here are the rules for this group...";
        await sendMessage(chatId, replyText, process.env.RULES_TOPIC_ID);
      }
    }

    res.status(200).send('ok');
  } else {
    res.status(200).send('Bot running...');
  }
}

// Helper function to send a message to a specific topic
async function sendMessage(chatId, text, topicId) {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    message_thread_id: Number(topicId)
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("📤 Sent message:", data);
    return data;
  } catch (err) {
    console.error("❌ Error sending message:", err);
  }
}
