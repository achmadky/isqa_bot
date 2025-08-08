// api/bot.js
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // your group chat ID, e.g., -1001234567890
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID; // your topic/thread ID inside the group

const verificationTimeoutMs = 60 * 1000; // 1 minute
const pendingVerifications = new Map();

export default async function handler(req, res) {
  try {
    const body = req.body;

    // New users joined
    if (body.message?.new_chat_members) {
      for (const member of body.message.new_chat_members) {
        if (member.is_bot) continue;

        // Send verification request message in rules topic
        await sendMessage(
          CHAT_ID,
          `👋 Welcome ${member.first_name}! Please reply with "I Agree" within 1 minute to verify.`,
          RULES_TOPIC_ID
        );

        // Track pending verification
        pendingVerifications.set(member.id, Date.now());

        // Schedule kick if no verification within time limit
        setTimeout(async () => {
          if (pendingVerifications.has(member.id)) {
            try {
              await kickUser(CHAT_ID, member.id);

              await sendMessage(
                CHAT_ID,
                `🚫 ${member.first_name} was removed for not verifying in time.`,
                RULES_TOPIC_ID
              );

              pendingVerifications.delete(member.id);
            } catch (err) {
              console.error("Error kicking user:", err.message);
            }
          }
        }, verificationTimeoutMs);
      }
    }

    // Handle user messages to verify
    if (body.message?.text) {
      const userId = body.message.from.id;
      const text = body.message.text.trim().toLowerCase();

      if (text === "i agree" && pendingVerifications.has(userId)) {
        pendingVerifications.delete(userId);

        await sendMessage(
          CHAT_ID,
          `✅ ${body.message.from.first_name} has verified successfully!`,
          RULES_TOPIC_ID
        );
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).send("Error");
  }
}

async function sendMessage(chatId, text, messageThreadId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
    message_thread_id: messageThreadId,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Failed to send message:", errText);
  }
}

async function kickUser(chatId, userId) {
  // Ban the user (kick)
  let response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/banChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      revoke_messages: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to ban user: ${errText}`);
  }

  // Immediately unban to allow rejoin
  response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/unbanChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      only_if_banned: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to unban user: ${errText}`);
  }
}
