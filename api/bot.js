import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// The group/chat ID where your rules are posted
const CHAT_ID = process.env.CHAT_ID; 
// The topic ID for the rules (thread ID in supergroup)
const RULES_TOPIC_ID = process.env.RULES_TOPIC_ID;

bot.onText(/\/rules/, (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

  bot.sendMessage(
    CHAT_ID,
    `📜 Rules:\n1. Be nice\n2. No spam\n3. Follow group guidelines\n\n${username}, please react with 👍 to agree.`,
    {
      message_thread_id: Number(RULES_TOPIC_ID), // send inside topic
    }
  ).then((sentMessage) => {
    const messageId = sentMessage.message_id;

    // Track reaction timeout
    setTimeout(() => {
      // This is just a placeholder since Telegram's Bot API doesn't
      // natively give "reaction list" yet, so you'd handle this via callback queries
      // or a custom "Agree" button instead of actual emoji reaction.
      bot.sendMessage(
        CHAT_ID,
        `⏳ ${username} did not react in time and will be removed.`,
        { message_thread_id: Number(RULES_TOPIC_ID) }
      );

      bot.kickChatMember(CHAT_ID, userId);
    }, 60_000);
  });
});
