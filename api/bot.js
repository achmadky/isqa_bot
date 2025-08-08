const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID;

const verificationTimeoutMs = Number(process.env.VERIFICATION_TIMEOUT_SECONDS ?? "15") * 1000;

const pendingVerifications = new Map();

export default async function handler(req, res) {
  try {
    const body = req.body;

    if (body.message?.new_chat_members) {
      for (const member of body.message.new_chat_members) {
        if (member.is_bot) continue;

        console.log(`[User Joined] id=${member.id}, name=${member.first_name}`);

        await sendMessage(
          CHAT_ID,
          `👋 Welcome ${member.first_name}! Please reply with "I Agree" within ${verificationTimeoutMs / 1000} seconds to verify.`,
          RULES_TOPIC_ID
        );

        pendingVerifications.set(member.id, Date.now());

        setTimeout(async () => {
          if (pendingVerifications.has(member.id)) {
            console.log(`[Verification Failed] id=${member.id}, name=${member.first_name} - kicking user`);

            try {
              await kickUser(CHAT_ID, member.id);

              await sendMessage(
                CHAT_ID,
                `🚫 ${member.first_name} was removed for not verifying in time.`,
                RULES_TOPIC_ID
              );

              pendingVerifications.delete(member.id);
            } catch (err) {
              console.error(`[Kick Error] id=${member.id}, error:`, err.message);
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

        console.log(`[Verified] id=${userId}, name=${body.message.from.first_name}`);

        await sendMessage(
          CHAT_ID,
          `✅ ${body.message.from.first_name} has verified successfully!`,
          RULES_TOPIC_ID
        );
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Handler Error]:", error);
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
    console.error("[Send Message Failed]:", errText);
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
