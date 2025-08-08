const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID;

async function restrictUser(chatId, userId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/restrictChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
      },
    }),
  });
}

async function unrestrictUser(chatId, userId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/restrictChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      permissions: {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: true,
        can_pin_messages: false,
      },
    }),
  });
}

export default async function handler(req, res) {
  try {
    const body = req.body;

    if (body.message?.new_chat_members) {
      for (const member of body.message.new_chat_members) {
        if (member.is_bot) continue;

        console.log(`[User Joined] id=${member.id}, name=${member.first_name}`);

        // Restrict new user
        await restrictUser(CHAT_ID, member.id);

        await sendMessage(
          CHAT_ID,
          `👋 Welcome ${member.first_name}! Please reply with "I Agree" to verify and gain full access.`,
          RULES_TOPIC_ID
        );
      }
    }

    if (body.message?.text) {
      const userId = body.message.from.id;
      const text = body.message.text.trim().toLowerCase();

      if (text === "i agree") {
        console.log(`[Verification Attempt] id=${userId}`);

        // Unrestrict user
        await unrestrictUser(CHAT_ID, userId);

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
