const { applyCors } = require('./_lib/cors');
const { games } = require('./_lib/games-data');

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.status(200).json(games);
};
