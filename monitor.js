const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const { getPlayer, getLatestMatch, getMatchDetails } = require('./faceit');

const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '30000', 10);

// watchers: Map<playerId, { nickname, lastMatchId, timer }>
const watchers = new Map();

let notifyFn = null;

function setNotifyFn(fn) {
  notifyFn = fn;
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMatchSummary(nickname, match, details, elo) {
  const score = details?.results?.score;
  const map = details?.voting?.map?.pick?.[0] ?? 'unknown map';
  const competitionName = match.competition_name ?? '';
  const region = details?.region ?? '';
  const teams = details?.teams ?? {};

  let scoreText = '';
  if (score) {
    const [t1, t2] = Object.values(score);
    scoreText = `\nScore: ${t1} — ${t2}`;
  }

  let teamText = '';
  const teamNames = Object.values(teams).map((t) => esc(t.name));
  if (teamNames.length === 2) {
    teamText = `\n${teamNames[0]} vs ${teamNames[1]}`;
  }

  let eloText = '';
  if (elo && elo !== 'Unknown') {
    eloText = `\n⭐ ELO: ${elo}`;
  }

  return (
    `🎮 <b>${esc(nickname)}</b> finished a match!\n` +
    `🗺 Map: ${esc(map)}` +
    `${teamText}` +
    `${scoreText}\n` +
    `🏆 ${esc(competitionName)}${region ? ` (${esc(region)})` : ''}` +
    `${eloText}\n` +
    `🔗 <a href="https://www.faceit.com/en/cs2/room/${match.match_id}">Match room</a>`
  );
}

async function pollPlayer(playerId) {
  const watcher = watchers.get(playerId);
  if (!watcher) return;

  try {
    const match = await getLatestMatch(playerId);
    if (!match) return;

    const { match_id, finished_at } = match;

    if (match_id !== watcher.lastMatchId && finished_at) {
      watcher.lastMatchId = match_id;

      let details = null;
      try {
        details = await getMatchDetails(match_id);
      } catch (_) {}

      let elo = null;
      try {
        const playerData = await getPlayer(watcher.nickname);
        elo = playerData?.games?.cs2?.faceit_elo ?? 'Unknown';
      } catch (_) {}

      const text = buildMatchSummary(watcher.nickname, match, details, elo);
      notifyFn?.(text);
    }
  } catch (err) {
    console.error(`[monitor] poll error for ${watcher?.nickname}:`, err.message);
  }

  watcher.timer = setTimeout(() => pollPlayer(playerId), POLL_MS);
}

async function watch(nickname) {
  const playerData = await getPlayer(nickname);
  const playerId = playerData.player_id;
  const canonicalNick = playerData.nickname;

  if (watchers.has(playerId)) {
    return { nickname: canonicalNick, added: false };
  }

  const firstMatch = await getLatestMatch(playerId);
  watchers.set(playerId, {
    nickname: canonicalNick,
    lastMatchId: firstMatch?.match_id ?? null,
    timer: setTimeout(() => pollPlayer(playerId), POLL_MS),
  });

  return { nickname: canonicalNick, added: true };
}

function unwatch(nickname) {
  for (const [playerId, watcher] of watchers) {
    if (watcher.nickname.toLowerCase() === nickname.toLowerCase()) {
      clearTimeout(watcher.timer);
      watchers.delete(playerId);
      return watcher.nickname;
    }
  }
  return false;
}

function listWatched() {
  return [...watchers.values()].map((w) => w.nickname);
}

module.exports = { setNotifyFn, watch, unwatch, listWatched };
