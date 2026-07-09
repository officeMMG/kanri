const { microcmsRequest } = require('../../lib/microcms');

const ENDPOINTS = new Set(['business', 'jobs', 'benefits', 'voices']);

module.exports = async function handler(req, res) {
  const { type, id } = req.query;

  if (!ENDPOINTS.has(type)) {
    return res.status(404).json({ error: 'Unknown content type' });
  }

  try {
    if (req.method === 'GET') {
      if (id) {
        const data = await microcmsRequest(`/${type}/${id}`);
        return res.status(200).json(data);
      }
      const data = await microcmsRequest(`/${type}?limit=100&orders=order`);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const data = await microcmsRequest(`/${type}`, { method: 'POST', body: req.body });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      const data = await microcmsRequest(`/${type}/${id}`, { method: 'PATCH', body: req.body });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      await microcmsRequest(`/${type}/${id}`, { method: 'DELETE' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`content/${type} error:`, err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
