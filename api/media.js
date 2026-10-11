const { microcmsRequest } = require('../lib/microcms');

// サイト画像（microCMSのオブジェクト形式API「media」。1件だけなので id は持たない）
module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      try {
        const data = await microcmsRequest('/media');
        return res.status(200).json(data);
      } catch (err) {
        // まだ一度も公開していないと 404 になる。空として返す
        if (err.status === 404) return res.status(200).json({});
        throw err;
      }
    }

    if (req.method === 'PUT') {
      const data = await microcmsRequest('/media', { method: 'PATCH', body: req.body });
      return res.status(200).json(data);
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('media error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
