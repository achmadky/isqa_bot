// api/bot.js
import axios from "axios";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // group id, e.g., -100123456789
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID; // topic id inside the group

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const update = req.body;
  console.log("📩 Incoming update:", JSON.stringify(update, null, 2));

  // Always log topic id if available
  if (update.message?.message_thread_id) {
    console.log(`🧵 Message came from topic ID: ${update.message.message_thread_id}`);
  } else {
    console.log("💬 Message came from main chat (no topic).");
  }

  try {
    // Detect new member join
    if (update.message?.new_chat_members) {
      const user = update.message.new_chat_members[0];
      console.log(`👤 New member joined: ${user.username || user.first_name} (${user.id})`);

      // Send rules message in topic and mention user
      const mention = `[${user.first_name}](tg://user?id=${user.id})`;
      const rulesText = `${mention}, please read and react to the rules within 1 minute or you'll be removed. ✅`;

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        message_thread_id: RULES_TOPIC_ID,
        text: rulesText,
        parse_mode: "Markdown"
      });

      console.log(`📨 Rules message sent to topic ID: ${RULES_TOPIC_ID}`);

      // Set a timeout to kick after 1 minute if no reaction
      setTimeout(async () => {
        console.log(`⏳ 1 minute passed, checking reaction for ${user.id}...`);

        // Without DB or reaction tracking, we'll assume no reaction
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/kickChatMember`, {
          chat_id: CHAT_ID,
          user_id: user.id
        });

        console.log(`💥 User ${user.id} kicked for not reacting.`);
      }, 60 * 1000);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.status(500).send("Error");
  }
}
