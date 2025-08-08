const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID;

const verifiedUsers = new Set();

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

async function sendMessageWithButton(chatId, text, messageThreadId, userId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    message_thread_id: messageThreadId,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Agree",
            callback_data: `verify_${userId}`,
          },
        ],
      ],
    },
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

async function answerCallback(callbackQueryId, text, showAlert = false) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

export default async function handler(req, res) {
  try {
    const body = req.body;

    // New user joined
    if (body.message?.new_chat_members) {
      for (const member of body.message.new_chat_members) {
        if (member.is_bot) continue;

        console.log(`[User Joined] id=${member.id}, name=${member.first_name}`);

        await restrictUser(CHAT_ID, member.id);

        await sendMessageWithButton(
          CHAT_ID,
          `👋 Welcome ${member.first_name}! Please tap the ✅ Agree button below to verify.`,
          RULES_TOPIC_ID,
          member.id
        );
      }
    }

    // Handle callback queries (button clicks)
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const fromUser = body.callback_query.from;

      if (callbackData === `verify_${fromUser.id}`) {
        if (verifiedUsers.has(fromUser.id)) {
          // Already verified
          await answerCallback(body.callback_query.id, "You are already verified.");
        } else {
          // Verify user
          await unrestrictUser(CHAT_ID, fromUser.id);
          verifiedUsers.add(fromUser.id);

          await answerCallback(body.callback_query.id, "You have been verified! 🎉");

          await sendMessage(
            CHAT_ID,
            `✅ ${fromUser.first_name} has verified successfully!`,
            RULES_TOPIC_ID
          );
        }
      } else {
        await answerCallback(body.callback_query.id, "Invalid or expired verification.", true);
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Handler Error]:", error);
    res.status(500).send("Error");
  }
}
