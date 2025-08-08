// api/bot.js
import axios from "axios";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // Group ID (e.g., -100123456789)
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID; // Topic ID in group

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const update = req.body;
  console.log("📩 Incoming update:", JSON.stringify(update, null, 2));

  try {
    // Detect when a new member joins
    if (update.message?.new_chat_members?.length > 0) {
      const user = update.message.new_chat_members[0];

      const mention = `[${user.first_name}](tg://user?id=${user.id})`;
      const rulesText = `${mention}, please read and react to the rules within 1 minute or you'll be removed. ✅`;

      // Send rules message to the topic
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        message_thread_id: RULES_TOPIC_ID ? Number(RULES_TOPIC_ID) : undefined,
        text: rulesText,
        parse_mode: "Markdown"
      });

      console.log(`📨 Rules message sent for ${user.id} in topic ${RULES_TOPIC_ID || "(no topic)"}`);

      // Wait 1 minute, then kick
      setTimeout(async () => {
        console.log(`⏳ 1 minute passed, kicking user ${user.id} (no reaction check implemented).`);

        try {
          await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/kickChatMember`, {
            chat_id: CHAT_ID,
            user_id: user.id
          });

          console.log(`💥 User ${user.id} kicked.`);
        } catch (kickErr) {
          console.error(`❌ Failed to kick ${user.id}:`, kickErr.response?.data || kickErr.message);
        }
      }, 60 * 1000);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error in handler:", error.response?.data || error.message);
    res.status(500).send("Error");
  }
}
