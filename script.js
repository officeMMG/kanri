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
    order: ['name', 'role', 'quote', 'avatar', 'order'],
    fields: {
      name: { label: 'お名前', type: 'text', required: true },
      role: { label: '役職・経歴', type: 'text' },
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
  els.panelTitle.textContent = SCHEMAS[type].label;
  loadList();
}

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

/* ===== 初期化 ===== */
switchType('business');
