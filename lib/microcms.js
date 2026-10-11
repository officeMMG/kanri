const BASE_PATH = '/api/v1';

function baseUrl() {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  if (!domain) throw new Error('MICROCMS_SERVICE_DOMAIN is not set');
  return `https://${domain}.microcms.io${BASE_PATH}`;
}

async function microcmsRequest(path, { method = 'GET', body } = {}) {
  const apiKey = process.env.MICROCMS_API_KEY;
  if (!apiKey) throw new Error('MICROCMS_API_KEY is not set');

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      'X-MICROCMS-API-KEY': apiKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error((data && data.message) || `microCMS error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// メディア（画像）をmicroCMSにアップロードする（マネジメントAPI。キーに「メディアのアップロード」権限が必要）
async function microcmsUploadMedia(fileName, buffer, mimeType) {
  const apiKey = process.env.MICROCMS_API_KEY;
  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  if (!apiKey || !domain) throw new Error('MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY is not set');

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), fileName);
  const res = await fetch(`https://${domain}.microcms-management.io${BASE_PATH}/media`, {
    method: 'POST',
    headers: { 'X-MICROCMS-API-KEY': apiKey },
    body: form,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error((data && data.message) || `microCMS upload error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

module.exports = { microcmsRequest, microcmsUploadMedia };
