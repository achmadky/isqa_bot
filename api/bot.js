import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);
const pendingUsers = new Map();

bot.on('new_chat_members', async (ctx) => {
  const userId = ctx.message.new_chat_members[0].id;
  const firstName = ctx.message.new_chat_members[0].first_name;

  const rulesMessage = `
📜 Group Rules:
1. Be respectful
2. No spam
3. Stay on topic

Please react ✅ below within 1 minute to agree, or you will be removed.
  `;

  await ctx.reply(rulesMessage, {
    reply_markup: {
      inline_keyboard: [[{ text: '✅ Agree', callback_data: `agree:${userId}` }]]
    }
  });

  // Timer to kick after 1 minute if no agreement
  const timer = setTimeout(async () => {
    try {
      await ctx.kickChatMember(userId);
      await ctx.reply(`⏱ ${firstName} did not agree in time and was removed.`);
    } catch (err) {
      console.error('Kick error:', err);
    }
    pendingUsers.delete(userId);
  }, 60_000);

  pendingUsers.set(userId, timer);
});

bot.on('callback_query', async (ctx) => {
  const [action, userId] = ctx.callbackQuery.data.split(':');

  if (action === 'agree') {
    await ctx.answerCbQuery('✅ You agreed to the rules');
    await ctx.reply(`Welcome, ${ctx.from.first_name}!`);

    // Clear pending kick timer
    if (pendingUsers.has(Number(userId))) {
      clearTimeout(pendingUsers.get(Number(userId)));
      pendingUsers.delete(Number(userId));
    }
  }
});

export default async function handler(req, res) {
  try {
    await bot.handleUpdate(req.body, res);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
}
