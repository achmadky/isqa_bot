const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID;

const verificationTimeoutMs = 60 * 1000; // 1 minute
const pendingVerifications = new Map();

export default async function handler(req, res) {
  try {
    const body = req.body;

    if (body.message?.new_chat_members) {
      for (const member of body.message.new_chat_members) {
        if (member.is_bot) continue;

        await sendMessage(
          CHAT_ID,
          `👋 Welcome ${member.first_name}!\nPlease reply with "I Agree" within 1 minute to verify.`,
          RULES_TOPIC_ID
        );

        pendingVerifications.set(member.id, Date.now());

        setTimeout(async () => {
          if (pendingVerifications.has(member.id)) {
            try {
              await kickUser(CHAT_ID, member.id);
              await sendMessage(CHAT_ID, `🚫 ${member.first_name} was removed for not verifying in time.`, RULES_TOPIC_ID);
              pendingVerifications.delete(member.id);
            } catch {
              // silently ignore errors
            }
          }
        }, verificationTimeoutMs);
      }
    }

    if (body.message?.text) {
      const userId = body.message.from.id;
      const text = body.message.text.trim().toLowerCase();

      if (text === "i agree" && pendingVerifications.has(userId)) {
        pendingVerifications.delete(userId);
        await sendMessage(CHAT_ID, `✅ ${body.message.from.first_name} has verified successfully!`, RULES_TOPIC_ID);
      }
    }

    res.status(200).send("OK");
  } catch {
    res.status(500).send("Error");
  }
}

async function sendMessage(chatId, text, messageThreadId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = { chat_id: chatId, text, message_thread_id: messageThreadId };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function kickUser(chatId, userId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/kickChatMember`;
  const payload = { chat_id: chatId, user_id: userId };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
