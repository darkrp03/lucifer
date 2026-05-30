require('dotenv').config();

const { Telegraf } = require('telegraf');
const { setNotifyFn, watch, unwatch, listWatched } = require('./monitor');
const { addWatcher, removeWatcher, getAllWatchers } = require('./db');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const channelId = process.env.TELEGRAM_CHANNEL_ID;

setNotifyFn((text) => {
  if (!channelId) {
    console.warn('[bot] TELEGRAM_CHANNEL_ID is not set');
    return;
  }
  bot.telegram.sendMessage(channelId, text, { parse_mode: 'HTML' })
    .catch((err) => console.error('[bot] channel send error:', err.message));
});

bot.start((ctx) =>
  ctx.reply(
    'FACEIT match tracker 🎮\n\n' +
      '/watch <player> — start watching a player\n' +
      '/unwatch <player> — stop watching a player\n' +
      '/list — show watched players',
  ),
);

bot.help((ctx) =>
  ctx.reply(
    '/watch <player> — start watching a player\n' +
      '/unwatch <player> — stop watching a player\n' +
      '/list — show watched players',
  ),
);

bot.command('watch', async (ctx) => {
  const nickname = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!nickname) return ctx.reply('Usage: /watch <player_nickname>');

  await ctx.reply(`Looking up ${nickname}...`);

  try {
    const { nickname: canonical, added } = await watch(nickname);
    if (!added) {
      return ctx.reply(`Already watching <b>${canonical}</b>.`, { parse_mode: 'HTML' });
    }
    addWatcher(canonical);
    ctx.reply(`Watching <b>${canonical}</b> — notifications will be sent to the channel.`, {
      parse_mode: 'HTML',
    });
  } catch (err) {
    if (err.response?.status === 404) {
      ctx.reply(`Player "${nickname}" not found on FACEIT.`);
    } else {
      console.error('[bot] watch error:', err.message);
      ctx.reply('Failed to add player. Please try again.');
    }
  }
});

bot.command('unwatch', async (ctx) => {
  const nickname = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!nickname) return ctx.reply('Usage: /unwatch <player_nickname>');

  const removed = unwatch(nickname);
  if (removed) {
    removeWatcher(removed);
    ctx.reply(`Stopped watching <b>${removed}</b>.`, { parse_mode: 'HTML' });
  } else {
    ctx.reply(`Not watching "${nickname}".`);
  }
});

bot.command('list', (ctx) => {
  const players = listWatched();
  if (!players.length) return ctx.reply('Not watching anyone.');
  ctx.reply('Watching:\n' + players.map((p) => `• ${p}`).join('\n'));
});

// Restore saved watchers after restart
for (const nickname of getAllWatchers()) {
  watch(nickname).catch((err) =>
    console.error(`[db] Failed to restore "${nickname}":`, err.message),
  );
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('Bot started. Poll interval:', process.env.POLL_INTERVAL_MS ?? '30000', 'ms');
