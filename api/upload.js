const { microcmsUploadMedia } = require('../lib/microcms');

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// 画像のアップロード。ブラウザ側で縮小した画像を { name, type, data(base64) } で受け取り、microCMSのメディアに登録する
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, type, data } = req.body || {};
  if (!name || !ALLOWED_TYPES.has(type) || !data) {
    return res.status(400).json({ error: 'JPEG / PNG / WebP の画像を選んでください' });
  }

  try {
    const safeName = String(name).replace(/[^\w.-]+/g, '_').slice(-80) || 'image.jpg';
    const result = await microcmsUploadMedia(safeName, Buffer.from(data, 'base64'), type);
    return res.status(201).json(result);
  } catch (err) {
    console.error('upload error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
