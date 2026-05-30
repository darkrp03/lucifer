const axios = require('axios');

const BASE_URL = 'https://open.faceit.com/data/v4';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
  },
});

async function getPlayer(nickname) {
  const { data } = await client.get('/players', { params: { nickname } });
  return data;
}

async function getLatestMatch(playerId, game = 'cs2') {
  const { data } = await client.get(`/players/${playerId}/history`, {
    params: { game, limit: 1 },
  });
  return data.items?.[0] ?? null;
}

async function getMatchDetails(matchId) {
  const { data } = await client.get(`/matches/${matchId}`);
  return data;
}

async function getPlayerStats(playerId, game = 'cs2') {
  const { data } = await client.get(`/players/${playerId}/stats/${game}`);
  return data;
}

module.exports = { getPlayer, getLatestMatch, getMatchDetails, getPlayerStats };
