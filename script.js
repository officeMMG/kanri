/* ===== アイコン表示ラベル ===== */
const ICON_LABELS = {
  measure: '測量（三脚・望遠鏡）',
  design: '設計（図面・コンパス）',
  research: '調査（虫眼鏡・波形）',
  entry: '未経験者向け',
  experienced: '経験者向け',
  schedule: '週休カレンダー',
  insurance: '保険シールド',
  certification: '資格書類',
  transport: '車両',
  salary: '上昇グラフ',
  training: 'OJT・人物',
};

/* ===== コンテンツタイプ別スキーマ ===== */
const SCHEMAS = {
  business: {
    label: '事業内容',
    order: ['title', 'iconKey', 'items', 'note', 'order'],
    fields: {
      title: { label: 'タイトル', type: 'text', required: true },
      iconKey: { label: 'アイコン', type: 'icon' },
      items: { label: '項目（1行に1つ）', type: 'list' },
      note: { label: '補足（例：など）', type: 'text' },
      order: { label: '表示順（数字が小さい順に表示）', type: 'number', required: true },
    },
    listTitle: c => c.title,
    listSub: c => splitLines(c.items).join(' / '),
  },
  jobs: {
    label: '募集職種',
    order: ['title', 'iconKey', 'tags', 'duties', 'salaryBase', 'salaryDaily', 'age', 'qualification', 'qualificationNote', 'experience', 'careerPath', 'highlights', 'order'],
    fields: {
      title: { label: 'タイトル', type: 'text', required: true },
      iconKey: { label: 'アイコン', type: 'icon' },
      tags: { label: 'タグ（カンマ区切り　例：未経験者歓迎, 正社員）', type: 'csv' },
      duties: { label: '仕事内容（1行に1つ）', type: 'list' },
      salaryBase: { label: '基本給', type: 'text' },
      salaryDaily: { label: '日給', type: 'text' },
      age: { label: '年齢', type: 'text' },
      qualification: { label: '必要な資格・免許', type: 'text' },
      qualificationNote: { label: '資格・免許の補足（1行に1つ・任意）', type: 'list' },
      experience: { label: '必要な経験', type: 'text' },
      careerPath: { label: 'キャリアパス（任意）', type: 'textarea' },
      highlights: { label: '活躍できる方（1行に1つ・任意）', type: 'list' },
      order: { label: '表示順', type: 'number', required: true },
    },
    listTitle: c => c.title,
    listSub: c => splitCsv(c.tags).join(' / '),
  },
  benefits: {
    label: '待遇・福利厚生',
    order: ['title', 'iconKey', 'description', 'order'],
    fields: {
      title: { label: 'タイトル', type: 'text', required: true },
      iconKey: { label: 'アイコン', type: 'icon' },
      description: { label: '説明', type: 'textarea' },
      order: { label: '表示順', type: 'number', required: true },
    },
    listTitle: c => c.title,
    listSub: c => c.description || '',
  },
  voices: {
    label: '先輩の声',
    order: ['name', 'role', 'lead', 'quote', 'avatar', 'order'],
    fields: {
      name: { label: 'お名前', type: 'text', required: true },
      role: { label: '役職・経歴', type: 'text' },
      lead: { label: '見出しの一言（任意。空ならコメントから自動で作成。LPでは2行に分けて表示）', type: 'text' },
      quote: { label: 'コメント', type: 'textarea' },
      avatar: { label: 'アバター絵文字（任意）', type: 'text' },
      order: { label: '表示順', type: 'number', required: true },
    },
    listTitle: c => c.name,
    listSub: c => c.role || '',
  },
};

let currentType = 'business';
let currentItems = [];
let editingId = null;

const els = {
  tabs: document.getElementById('admin-tabs'),
  panelTitle: document.getElementById('panel-title'),
  btnAdd: document.getElementById('btn-add'),
  statusMsg: document.getElementById('status-msg'),
  cardList: document.getElementById('card-list'),
  overlay: document.getElementById('modal-overlay'),
  modalTitle: document.getElementById('modal-title'),
  form: document.getElementById('item-form'),
  formError: document.getElementById('form-error'),
  modalClose: document.getElementById('modal-close'),
  btnCancel: document.getElementById('btn-cancel'),
};

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* microCMSの「テキストエリア」フィールドは配列ではなく1本の文字列として保存されるため、
   「1行に1つ」「カンマ区切り」の項目は表示時にこちらで分割する */
function splitLines(str) {
  return String(str ?? '').split('\n').map(s => s.trim()).filter(Boolean);
}
function splitCsv(str) {
  return String(str ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

function setStatus(msg, isError = false) {
  els.statusMsg.textContent = msg;
  els.statusMsg.classList.toggle('error', isError);
}

/* ===== タブ切り替え ===== */
els.tabs.addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  switchType(btn.dataset.type);
});

function switchType(type) {
  currentType = type;
  [...els.tabs.children].forEach(b => b.classList.toggle('active', b.dataset.type === type));

  if (type === 'inquiries') {
    els.panelTitle.textContent = 'お問い合わせ';
    els.btnAdd.style.display = 'none';
    loadInquiries();
    return;
  }

  if (type === 'media') {
    els.panelTitle.textContent = 'サイト画像';
    els.btnAdd.style.display = 'none';
    loadMedia();
    return;
  }

  els.btnAdd.style.display = '';
  els.panelTitle.textContent = SCHEMAS[type].label;
  loadList();
}

/* ===== お問い合わせ一覧 ===== */
const JOB_LABELS = {
  'surveyor-entry': '測量士・測量士補（正社員）未経験者採用',
  'surveyor-exp': '測量士・測量士補（正社員）経験者採用',
  surveyor: '測量士・測量士補（正社員）',
  drone: 'ドローンオペレーター（正社員）',
  'assist-full': '測量補助・事務スタッフ（正社員）',
  'assist-part': '測量補助・事務スタッフ（パート）',
  other: 'その他・一般問い合わせ',
};

let currentInquiries = [];

async function loadInquiries() {
  setStatus('読み込み中…');
  els.cardList.innerHTML = '';
  try {
    const res = await fetch('/api/inquiries');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const data = await res.json();
    currentInquiries = data.contents || [];
    renderInquiries();
    setStatus(`${currentInquiries.length}件`);
  } catch (err) {
    console.error(err);
    setStatus(`読み込みに失敗しました: ${err.message}`, true);
  }
}

function renderInquiries() {
  if (currentInquiries.length === 0) {
    els.cardList.innerHTML = '<div class="empty-state">お問い合わせはまだありません。</div>';
    return;
  }
  els.cardList.innerHTML = currentInquiries.map(inq => {
    const isDone = inq.status === 'done';
    const createdAt = inq.created_at ? new Date(inq.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '';
    return `
    <div class="inquiry-row ${isDone ? 'is-done' : 'is-new'}" data-id="${inq.id}">
      <div class="inquiry-head">
        <div class="inquiry-meta">
          <strong>${escapeHtml(inq.name)}</strong>
          <div><a href="mailto:${escapeHtml(inq.email)}">${escapeHtml(inq.email)}</a>${inq.tel ? ` ／ ${escapeHtml(inq.tel)}` : ''}</div>
          <div>応募職種: ${escapeHtml(JOB_LABELS[inq.job] || inq.job || '-')} ／ 受信: ${escapeHtml(createdAt)}</div>
        </div>
        <span class="status-badge ${isDone ? 'is-done' : 'is-new'}">${isDone ? '対応済み' : '未対応'}</span>
      </div>
      <div class="inquiry-message">${escapeHtml(inq.message)}</div>
      <div class="inquiry-actions">
        <button type="button" class="btn-edit" data-inquiry-action="toggle" data-id="${inq.id}" data-next="${isDone ? 'new' : 'done'}">${isDone ? '未対応に戻す' : '対応済みにする'}</button>
        <button type="button" class="btn-danger" data-inquiry-action="delete" data-id="${inq.id}">削除</button>
      </div>
    </div>`;
  }).join('');
}

els.cardList.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-inquiry-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.inquiryAction === 'toggle') {
    try {
      const res = await fetch(`/api/inquiries?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: btn.dataset.next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await loadInquiries();
    } catch (err) {
      console.error(err);
      setStatus(`更新に失敗しました: ${err.message}`, true);
    }
  }
  if (btn.dataset.inquiryAction === 'delete') {
    const inq = currentInquiries.find(i => i.id === id);
    if (!confirm(`「${inq ? inq.name : id}」さんのお問い合わせを削除します。よろしいですか？`)) return;
    try {
      const res = await fetch(`/api/inquiries?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await loadInquiries();
      setStatus('削除しました');
    } catch (err) {
      console.error(err);
      setStatus(`削除に失敗しました: ${err.message}`, true);
    }
  }
});

/* ===== 一覧取得・描画 ===== */
async function loadList() {
  setStatus('読み込み中…');
  els.cardList.innerHTML = '';
  try {
    const res = await fetch(`/api/content/${currentType}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const data = await res.json();
    currentItems = (data.contents || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderList();
    setStatus(`${currentItems.length}件`);
  } catch (err) {
    console.error(err);
    setStatus(`読み込みに失敗しました: ${err.message}`, true);
  }
}

function renderList() {
  const schema = SCHEMAS[currentType];
  if (currentItems.length === 0) {
    els.cardList.innerHTML = '<div class="empty-state">まだ登録がありません。「＋ 新規追加」から作成してください。</div>';
    return;
  }
  els.cardList.innerHTML = currentItems.map(item => {
    const iconSvg = item.iconKey && typeof ICONS !== 'undefined' && ICONS[item.iconKey] ? ICONS[item.iconKey] : '';
    return `
    <div class="card-row" data-id="${item.id}">
      <div class="card-row-main">
        <span class="card-order">${escapeHtml(item.order ?? '-')}</span>
        ${iconSvg ? `<span class="card-icon">${iconSvg}</span>` : ''}
        <div class="card-text">
          <div class="card-title">${escapeHtml(schema.listTitle(item))}</div>
          <div class="card-sub">${escapeHtml(schema.listSub(item))}</div>
        </div>
      </div>
      <div class="card-row-actions">
        <button type="button" class="btn-edit" data-action="edit" data-id="${item.id}">編集</button>
        <button type="button" class="btn-danger" data-action="delete" data-id="${item.id}">削除</button>
      </div>
    </div>`;
  }).join('');
}

els.cardList.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') openForm(currentItems.find(i => i.id === id));
  if (btn.dataset.action === 'delete') deleteItem(id);
});

/* ===== フォーム生成 ===== */
function fieldToFormValue(type, key, value) {
  // list/csv も含めmicroCMS上は全部プレーンな文字列として保存されるため、そのまま表示する
  return value ?? '';
}

function formValueToField(type, raw) {
  if (type === 'number') return raw === '' ? null : Number(raw);
  return raw.trim();
}

function buildFormFields(schema, item) {
  return schema.order.map(key => {
    const def = schema.fields[key];
    const value = item ? item[key] : (def.type === 'number' ? '' : '');
    const id = `f-${key}`;
    let control = '';

    if (def.type === 'textarea' || def.type === 'list') {
      control = `<textarea class="field-control" id="${id}" name="${key}">${escapeHtml(fieldToFormValue(def.type, key, value))}</textarea>`;
    } else if (def.type === 'icon') {
      const keys = (typeof ICON_KEYS_BY_TYPE !== 'undefined' && ICON_KEYS_BY_TYPE[currentType]) || [];
      control = `<select class="field-control" id="${id}" name="${key}">` +
        keys.map(k => `<option value="${k}" ${value === k ? 'selected' : ''}>${escapeHtml(ICON_LABELS[k] || k)}</option>`).join('') +
        `</select>`;
    } else if (def.type === 'number') {
      control = `<input class="field-control" type="number" id="${id}" name="${key}" value="${escapeHtml(value)}" ${def.required ? 'required' : ''}>`;
    } else {
      control = `<input class="field-control" type="text" id="${id}" name="${key}" value="${escapeHtml(fieldToFormValue(def.type, key, value))}" ${def.required ? 'required' : ''}>`;
    }

    return `<div class="field-group">
      <label for="${id}">${escapeHtml(def.label)}</label>
      ${control}
    </div>`;
  }).join('');
}

function openForm(item) {
  const schema = SCHEMAS[currentType];
  editingId = item ? item.id : null;
  document.getElementById('modal-title').textContent = item ? `${schema.label}を編集` : `${schema.label}を新規追加`;
  els.form.innerHTML = buildFormFields(schema, item);
  els.formError.textContent = '';
  els.overlay.classList.add('open');
}

function closeForm() {
  els.overlay.classList.remove('open');
  editingId = null;
}

els.btnAdd.addEventListener('click', () => openForm(null));
els.modalClose.addEventListener('click', closeForm);
els.btnCancel.addEventListener('click', closeForm);
els.overlay.addEventListener('click', e => { if (e.target === els.overlay) closeForm(); });

els.form.addEventListener('submit', async e => {
  e.preventDefault();
  const schema = SCHEMAS[currentType];
  const payload = {};
  for (const key of schema.order) {
    const def = schema.fields[key];
    const raw = els.form.elements[key].value;
    payload[key] = formValueToField(def.type, raw);
  }

  const saveBtn = document.getElementById('btn-save');
  saveBtn.disabled = true;
  els.formError.textContent = '';
  try {
    const url = editingId ? `/api/content/${currentType}?id=${editingId}` : `/api/content/${currentType}`;
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    closeForm();
    await loadList();
    setStatus('保存しました');
  } catch (err) {
    console.error(err);
    els.formError.textContent = `保存に失敗しました: ${err.message}`;
  } finally {
    saveBtn.disabled = false;
  }
});

async function deleteItem(id) {
  const item = currentItems.find(i => i.id === id);
  const schema = SCHEMAS[currentType];
  const label = item ? schema.listTitle(item) : id;
  if (!confirm(`「${label}」を削除します。よろしいですか？`)) return;
  try {
    const res = await fetch(`/api/content/${currentType}?id=${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    await loadList();
    setStatus('削除しました');
  } catch (err) {
    console.error(err);
    setStatus(`削除に失敗しました: ${err.message}`, true);
  }
}

/* ===== サイト画像（microCMSのオブジェクト形式API「media」） =====
   未登録の項目は、LPに入っている元の画像・文言がそのまま表示される */
const MEDIA_SECTIONS = [
  { title: 'HERO下：流れる写真の帯', items: [
    { key: 'gallery', kind: 'gallery', label: '写真（左から順に流れます）' },
  ] },
  { title: '私たちについて：重なった写真', items: [
    { key: 'env1', kind: 'image', label: '写真1（最初に一番上に出る写真）' },
    { key: 'env1Caption', kind: 'text', label: '写真1の説明文' },
    { key: 'env2', kind: 'image', label: '写真2' },
    { key: 'env2Caption', kind: 'text', label: '写真2の説明文' },
    { key: 'env3', kind: 'image', label: '写真3' },
    { key: 'env3Caption', kind: 'text', label: '写真3の説明文' },
    { key: 'env4', kind: 'image', label: '写真4' },
    { key: 'env4Caption', kind: 'text', label: '写真4の説明文' },
  ] },
  { title: '目指せる環境：写真4枚（上から順）', items: [
    { key: 'reason1', kind: 'image', label: '写真1「未経験から、技術職へ」' },
    { key: 'reason1Note', kind: 'textarea', label: '写真1の手書きメモ（改行するとLPでも改行。矢印は今の写真に合わせた固定の線です）' },
    { key: 'reason2', kind: 'image', label: '写真2「新しい技術に触れる」' },
    { key: 'reason3', kind: 'image', label: '写真3「社会を支える仕事」' },
    { key: 'reason3Note', kind: 'textarea', label: '写真3の手書きメモ（改行するとLPでも改行。矢印は今の写真に合わせた固定の線です）' },
    { key: 'reason4', kind: 'image', label: '写真4「一生モノの技術を、その手に。」' },
  ] },
  { title: '仕事を知る：業務の写真', items: [
    { key: 'bizSurvey', kind: 'image', label: '測量' },
    { key: 'bizDesign', kind: 'image', label: '設計' },
    { key: 'bizResearch', kind: 'image', label: '調査' },
  ] },
  { title: '帯・バナー', items: [
    { key: 'statementBanner', kind: 'image', label: '帯「今日の測量が、明日の街をつくる。」の背景' },
    { key: 'recruitBanner', kind: 'image', label: '募集要項の上の横長写真' },
    { key: 'recruitBannerCaption', kind: 'text', label: '横長写真の説明文' },
    { key: 'ctaBanner', kind: 'image', label: '帯「あなたの一歩が、未来の街をつくる。」の背景' },
  ] },
  { title: 'フッター', items: [
    { key: 'footerPhoto', kind: 'image', label: 'フッターの写真' },
  ] },
];
const MEDIA_ITEMS = MEDIA_SECTIONS.flatMap(s => s.items);

let mediaDraft = {};
let mediaUploading = 0;

function thumbUrl(url) {
  return /^https:\/\/images\.microcms-assets\.io\//.test(url) ? `${url}?w=480&fm=webp&q=70` : url;
}

async function loadMedia() {
  setStatus('読み込み中…');
  els.cardList.innerHTML = '';
  try {
    const res = await fetch('/api/media');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const data = await res.json();
    mediaDraft = {};
    MEDIA_ITEMS.forEach(({ key, kind }) => {
      const v = data[key];
      if (kind === 'gallery') mediaDraft[key] = (v || []).map(m => m.url);
      else if (kind === 'image') mediaDraft[key] = v && v.url ? v.url : '';
      else mediaDraft[key] = v ?? '';
    });
    renderMedia();
    setStatus('写真を選ぶとすぐアップロードされます。最後に「保存してLPに反映」を押してください。');
  } catch (err) {
    console.error(err);
    setStatus(`読み込みに失敗しました: ${err.message}`, true);
  }
}

function mediaSlotHtml(item) {
  const { key, kind, label } = item;
  const id = `m-${key}`;
  if (kind === 'text' || kind === 'textarea') {
    const control = kind === 'text'
      ? `<input class="field-control" type="text" id="${id}" data-media-key="${key}" value="${escapeHtml(mediaDraft[key])}" placeholder="空欄のときはLPに入っている元の文言を表示">`
      : `<textarea class="field-control" id="${id}" data-media-key="${key}" placeholder="空欄のときはLPに入っている元の文言を表示">${escapeHtml(mediaDraft[key])}</textarea>`;
    return `<div class="field-group media-text"><label for="${id}">${escapeHtml(label)}</label>${control}</div>`;
  }
  if (kind === 'gallery') {
    const list = mediaDraft[key];
    const thumbs = list.map((url, i) => `
      <div class="gallery-thumb">
        <img src="${escapeHtml(thumbUrl(url))}" alt="" loading="lazy">
        <div class="gallery-thumb-actions">
          <button type="button" class="btn-edit" data-media-action="left" data-index="${i}" ${i === 0 ? 'disabled' : ''} aria-label="左へ">←</button>
          <button type="button" class="btn-edit" data-media-action="right" data-index="${i}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="右へ">→</button>
          <button type="button" class="btn-danger" data-media-action="remove" data-index="${i}" aria-label="外す">✕</button>
        </div>
      </div>`).join('');
    return `
      <div class="media-gallery">
        <div class="media-label">${escapeHtml(label)}</div>
        ${list.length ? '' : '<p class="media-empty-note">未登録：LPに入っている元の写真を表示中</p>'}
        <div class="gallery-grid">${thumbs}</div>
        <label class="btn-secondary media-pick">＋ 写真を追加<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-media-file="${key}"></label>
      </div>`;
  }
  const url = mediaDraft[key];
  return `
    <div class="media-slot">
      <div class="media-thumb">${url ? `<img src="${escapeHtml(thumbUrl(url))}" alt="" loading="lazy">` : '<span>未登録<br>LPに入っている<br>元の写真を表示中</span>'}</div>
      <div class="media-slot-body">
        <div class="media-label">${escapeHtml(label)}</div>
        <label class="btn-secondary media-pick">${url ? '写真を変更' : '写真を選ぶ'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-media-file="${key}"></label>
      </div>
    </div>`;
}

function renderMedia() {
  els.cardList.innerHTML = MEDIA_SECTIONS.map(sec => `
    <section class="media-section">
      <h3>${escapeHtml(sec.title)}</h3>
      ${sec.items.map(mediaSlotHtml).join('')}
    </section>`).join('') + `
    <div class="media-savebar">
      <p class="media-savebar-note">保存すると、LPには1分ほどで反映されます。</p>
      <button type="button" class="btn-primary" data-media-action="save">保存してLPに反映</button>
    </div>`;
}

// 大きな写真はブラウザで長辺2400pxまで縮小し、JPEGにしてから送る（送信サイズの上限対策）
async function resizeImage(file, maxSide = 2400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  const data = await new Promise(r => {
    const reader = new FileReader();
    reader.onload = () => r(String(reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data };
}

async function uploadImage(file) {
  const payload = await resizeImage(file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return (await res.json()).url;
}

els.cardList.addEventListener('change', async e => {
  const input = e.target.closest('input[data-media-file]');
  if (!input || !input.files.length) return;
  const key = input.dataset.mediaFile;
  const files = [...input.files];
  mediaUploading++;
  setStatus(`アップロード中…（${files.length}枚）`);
  try {
    for (const file of files) {
      const url = await uploadImage(file);
      if (Array.isArray(mediaDraft[key])) mediaDraft[key].push(url);
      else mediaDraft[key] = url;
    }
    renderMedia();
    setStatus('アップロードしました。「保存してLPに反映」を押すとLPに出ます。');
  } catch (err) {
    console.error(err);
    setStatus(`アップロードに失敗しました: ${err.message}`, true);
  } finally {
    mediaUploading--;
  }
});

els.cardList.addEventListener('input', e => {
  const field = e.target.closest('[data-media-key]');
  if (field) mediaDraft[field.dataset.mediaKey] = field.value;
});

els.cardList.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-media-action]');
  if (!btn) return;
  const action = btn.dataset.mediaAction;
  const list = mediaDraft.gallery;
  const i = Number(btn.dataset.index);
  if (action === 'left' || action === 'right') {
    const j = action === 'left' ? i - 1 : i + 1;
    [list[i], list[j]] = [list[j], list[i]];
    renderMedia();
    return;
  }
  if (action === 'remove') {
    list.splice(i, 1);
    renderMedia();
    return;
  }
  if (action === 'save') {
    if (mediaUploading) { setStatus('アップロードが終わってから保存してください。', true); return; }
    const payload = {};
    MEDIA_ITEMS.forEach(({ key, kind }) => {
      const v = mediaDraft[key];
      if (kind === 'image') { if (v) payload[key] = v; }
      else if (kind === 'gallery') payload[key] = v;
      else payload[key] = String(v ?? '').trim();
    });
    btn.disabled = true;
    try {
      const res = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setStatus('保存しました。LPには1分ほどで反映されます。');
    } catch (err) {
      console.error(err);
      setStatus(`保存に失敗しました: ${err.message}`, true);
    } finally {
      btn.disabled = false;
    }
  }
});

/* ===== 初期化 ===== */
switchType('business');
