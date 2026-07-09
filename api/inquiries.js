const { supabaseRequest } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const data = await supabaseRequest('/inquiries?select=*&order=created_at.desc');
      return res.status(200).json({ contents: data });
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { status } = req.body || {};
      if (!['new', 'done'].includes(status)) {
        return res.status(400).json({ error: 'status must be "new" or "done"' });
      }
      const data = await supabaseRequest(`/inquiries?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { status },
        headers: { Prefer: 'return=representation' },
      });
      return res.status(200).json({ contents: data });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      await supabaseRequest(`/inquiries?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('inquiries error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
