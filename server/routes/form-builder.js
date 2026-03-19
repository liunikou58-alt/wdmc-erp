/**
 * 表單建構器引擎
 *
 * 核心功能：
 * 1. Schema 設計（欄位定義、排版、子表格、權限）
 * 2. Records CRUD（動態資料存取）
 * 3. 公式引擎（SUM / IF / COUNT / CONCAT...）
 * 4. 連結載入引擎（跨表 autocomplete + auto-fill）
 * 5. 自動編號
 * 6. 資料夾管理
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

/* ═══════════════════════════════════════════
   欄位類型定義
   ═══════════════════════════════════════════ */

const FIELD_TYPES = {
  text:      { label: '單行文字',  icon: '📝' },
  textarea:  { label: '多行文字',  icon: '📄' },
  number:    { label: '數字',     icon: '🔢' },
  currency:  { label: '金額',     icon: '💰' },
  date:      { label: '日期',     icon: '📅' },
  datetime:  { label: '日期時間',  icon: '🕐' },
  select:    { label: '下拉選項',  icon: '📋' },
  multisel:  { label: '多選',     icon: '☑️' },
  radio:     { label: '單選',     icon: '⭕' },
  checkbox:  { label: '勾選',     icon: '✅' },
  file:      { label: '檔案上傳',  icon: '📎' },
  image:     { label: '圖片',     icon: '🖼️' },
  signature: { label: '手寫簽名',  icon: '✍️' },
  formula:   { label: '公式計算',  icon: '🧮' },
  link:      { label: '連結載入',  icon: '🔗' },
  auto_num:  { label: '自動編號',  icon: '#️⃣' },
  user:      { label: '系統用戶',  icon: '👤' },
  email:     { label: 'Email',   icon: '📧' },
  phone:     { label: '電話',     icon: '📞' },
  url:       { label: '網址',     icon: '🌐' },
  color:     { label: '顏色',     icon: '🎨' },
  rating:    { label: '評分',     icon: '⭐' },
  divider:   { label: '分隔線',   icon: '➖' },
  header:    { label: '段落標題',  icon: '📌' },
};

/* ═══════════════════════════════════════════
   公式引擎
   ═══════════════════════════════════════════ */

function evalFormula(formulaStr, record, subtableData) {
  try {
    const ctx = {
      SUM: (arr) => (Array.isArray(arr) ? arr : [arr]).reduce((s, v) => s + (Number(v) || 0), 0),
      AVG: (arr) => { const a = Array.isArray(arr) ? arr : [arr]; return a.length ? ctx.SUM(a) / a.length : 0; },
      COUNT: (arr) => (Array.isArray(arr) ? arr : [arr]).length,
      MAX: (...args) => { const flat = args.flat(); return flat.length ? Math.max(...flat.map(Number).filter(n => !isNaN(n))) : 0; },
      MIN: (...args) => { const flat = args.flat(); return flat.length ? Math.min(...flat.map(Number).filter(n => !isNaN(n))) : 0; },
      IF: (cond, t, f) => cond ? t : f,
      CONCAT: (...args) => args.join(''),
      ROUND: (v, d = 0) => Number(Number(v).toFixed(d)),
      ABS: (v) => Math.abs(Number(v) || 0),
      TODAY: () => new Date().toISOString().slice(0, 10),
      NOW: () => new Date().toISOString(),
      YEAR: (d) => d ? new Date(d).getFullYear() : new Date().getFullYear(),
      MONTH: (d) => d ? new Date(d).getMonth() + 1 : new Date().getMonth() + 1,
    };

    // 1. 解析子表格引用: SUM(subtable_key.field_key)
    let processed = formulaStr;
    const stRegex = /(\w+)\((\w+)\.(\w+)\)/g;
    let match;
    while ((match = stRegex.exec(formulaStr)) !== null) {
      const [full, func, stKey, fieldKey] = match;
      const stRows = subtableData?.[stKey] || [];
      const values = stRows.map(row => row[fieldKey]);
      if (ctx[func]) {
        processed = processed.replace(full, String(ctx[func](values)));
      }
    }

    // 2. 替換 ${field} 引用
    processed = processed.replace(/\$\{(\w+)\}/g, (_, key) => {
      const val = record[key];
      return val !== undefined && val !== null ? String(Number(val) || 0) : '0';
    });

    // 3. 替換裸欄位名（只替換確定存在於 record 中的 key，避免誤替換函數名）
    const fnNames = new Set(Object.keys(ctx));
    const reserved = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
    Object.keys(record).forEach(key => {
      if (fnNames.has(key) || reserved.has(key)) return;
      // 用 word boundary 精確匹配
      const keyRegex = new RegExp(`\\b${key}\\b`, 'g');
      const val = record[key];
      const numVal = val !== undefined && val !== null ? String(Number(val) || 0) : '0';
      processed = processed.replace(keyRegex, numVal);
    });

    // 4. 安全執行
    const fn = new Function(...Object.keys(ctx), `"use strict"; return (${processed})`);
    return fn(...Object.values(ctx));
  } catch (e) {
    return `#ERR: ${e.message}`;
  }
}

// 自動編號生成
function generateAutoNumber(pattern, schemaId) {
  const now = new Date();
  const records = db.find('form_records', r => r.schema_id === schemaId);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = (pattern || 'NO-{YYYYMM}-{NNN}')
    .replace('{YYYY}', yyyy).replace('{YY}', String(yyyy).slice(2))
    .replace('{MM}', mm).replace('{YYYYMM}', `${yyyy}${mm}`);

  const base = prefix.replace(/{N+}/, '');
  const existing = records.filter(r => (r.record_no || '').startsWith(base));
  const nMatch = pattern?.match(/{(N+)}/);
  const width = nMatch ? nMatch[1].length : 3;
  const seq = existing.length + 1;
  return prefix.replace(/{N+}/, String(seq).padStart(width, '0'));
}

/* ═══════════════════════════════════════════
   資料夾管理
   ═══════════════════════════════════════════ */

router.get('/folders', auth, (req, res) => {
  res.json(db.getAll('form_folders').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
});

router.post('/folders', auth, (req, res) => {
  const { name, icon, parent_id, menu_group } = req.body;
  const folder = db.insert('form_folders', {
    id: uuidv4(), name: name || '新資料夾', icon: icon || '📁',
    sort_order: db.getAll('form_folders').length, parent_id: parent_id || null,
    menu_group: menu_group || '預設頁籤組',
  });
  res.status(201).json(folder);
});

router.put('/folders/:id', auth, (req, res) => {
  res.json(db.update('form_folders', req.params.id, req.body));
});

router.delete('/folders/:id', auth, (req, res) => {
  db.remove('form_folders', req.params.id);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════
   Schema 管理（表單設計）
   ═══════════════════════════════════════════ */

router.get('/field-types', auth, (req, res) => {
  res.json(FIELD_TYPES);
});

router.get('/schemas', auth, (req, res) => {
  const { folder_id } = req.query;
  let schemas = db.getAll('form_schemas').filter(s => s.is_active !== false);
  if (folder_id) schemas = schemas.filter(s => s.folder_id === folder_id);
  const enriched = schemas.map(s => {
    const recordCount = db.find('form_records', r => r.schema_id === s.id).length;
    const folder = s.folder_id ? db.getById('form_folders', s.folder_id) : null;
    return { ...s, record_count: recordCount, folder_name: folder?.name || '' };
  });
  res.json(enriched);
});

router.get('/schemas/:id', auth, (req, res) => {
  const schema = db.getById('form_schemas', req.params.id);
  if (!schema) return res.status(404).json({ error: '表單不存在' });
  res.json(schema);
});

router.post('/schemas', auth, (req, res) => {
  const { name, icon, folder_id, description, fields, layout, subtables, permissions, auto_number } = req.body;
  const schema = db.insert('form_schemas', {
    id: uuidv4(), name: name || '新表單', icon: icon || '📋',
    folder_id: folder_id || null, description: description || '',
    fields: fields || [], layout: layout || { columns: 2 },
    subtables: subtables || [], permissions: permissions || {},
    auto_number: auto_number || null, // { pattern: 'QT-{YYYYMM}-{NNN}' }
    created_by: req.user.id, is_active: true, version: 1,
  });
  logActivity(db, null, req.user.id, 'create_form_schema', `建立表單「${name}」`);
  res.status(201).json(schema);
});

router.put('/schemas/:id', auth, (req, res) => {
  const schema = db.getById('form_schemas', req.params.id);
  if (!schema) return res.status(404).json({ error: '不存在' });
  const updates = { ...req.body, version: (schema.version || 1) + 1 };
  delete updates.id; delete updates.created_at; delete updates.created_by;
  res.json(db.update('form_schemas', req.params.id, updates));
});

router.delete('/schemas/:id', auth, (req, res) => {
  const records = db.find('form_records', r => r.schema_id === req.params.id);
  if (records.length > 0) {
    // 軟刪除：已有資料的表單不真的刪
    db.update('form_schemas', req.params.id, { is_active: false });
    return res.json({ success: true, soft: true, message: `表單含 ${records.length} 筆資料，已停用` });
  }
  db.remove('form_schemas', req.params.id);
  res.json({ success: true });
});

// POST /schemas/:id/duplicate — 複製表單
router.post('/schemas/:id/duplicate', auth, (req, res) => {
  const src = db.getById('form_schemas', req.params.id);
  if (!src) return res.status(404).json({ error: '不存在' });
  const copy = db.insert('form_schemas', {
    id: uuidv4(), name: `${src.name} (副本)`, icon: src.icon,
    folder_id: src.folder_id, description: src.description,
    fields: JSON.parse(JSON.stringify(src.fields)),
    layout: JSON.parse(JSON.stringify(src.layout)),
    subtables: JSON.parse(JSON.stringify(src.subtables || [])),
    permissions: JSON.parse(JSON.stringify(src.permissions || {})),
    auto_number: src.auto_number ? JSON.parse(JSON.stringify(src.auto_number)) : null,
    created_by: req.user.id, is_active: true, version: 1,
  });
  res.status(201).json(copy);
});

/* ═══════════════════════════════════════════
   Records CRUD（動態資料）
   ═══════════════════════════════════════════ */

router.get('/data/:schemaId', auth, (req, res) => {
  const schema = db.getById('form_schemas', req.params.schemaId);
  if (!schema) return res.status(404).json({ error: '表單不存在' });

  let records = db.find('form_records', r => r.schema_id === req.params.schemaId);

  // 篩選支援
  const { where, sort, order, limit } = req.query;
  if (where) {
    try {
      const filters = JSON.parse(where);
      Object.entries(filters).forEach(([key, val]) => {
        records = records.filter(r => (r.data || {})[key] == val);
      });
    } catch (e) {}
  }

  // 排序
  if (sort) {
    const dir = order === 'asc' ? 1 : -1;
    records.sort((a, b) => {
      const av = (a.data || {})[sort] || '', bv = (b.data || {})[sort] || '';
      return typeof av === 'number' ? (av - bv) * dir : String(av).localeCompare(String(bv)) * dir;
    });
  } else {
    records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (limit) records = records.slice(0, Number(limit));

  const creator = (uid) => { const u = db.getById('users', uid); return u?.display_name || ''; };
  res.json(records.map(r => ({ ...r, created_by_name: creator(r.created_by) })));
});

router.get('/data/:schemaId/:id', auth, (req, res) => {
  const record = db.getById('form_records', req.params.id);
  if (!record || record.schema_id !== req.params.schemaId) return res.status(404).json({ error: '紀錄不存在' });
  res.json(record);
});

router.post('/data/:schemaId', auth, (req, res) => {
  const schema = db.getById('form_schemas', req.params.schemaId);
  if (!schema) return res.status(404).json({ error: '表單不存在' });

  const { data, subtable_data } = req.body;

  // 處理公式欄位
  const computed = computeFormulas(schema, data || {}, subtable_data || {});

  // 自動編號
  let recordNo = '';
  if (schema.auto_number?.pattern) {
    recordNo = generateAutoNumber(schema.auto_number.pattern, schema.id);
  }

  const record = db.insert('form_records', {
    id: uuidv4(), schema_id: req.params.schemaId,
    record_no: recordNo,
    data: { ...data, ...computed },
    subtable_data: subtable_data || {},
    created_by: req.user.id, status: 'active', is_locked: false,
  });

  logActivity(db, null, req.user.id, 'create_form_record',
    `在「${schema.name}」新增紀錄 ${recordNo || record.id.slice(0, 8)}`);

  res.status(201).json(record);
});

router.put('/data/:schemaId/:id', auth, (req, res) => {
  const record = db.getById('form_records', req.params.id);
  if (!record) return res.status(404).json({ error: '不存在' });
  if (record.is_locked) return res.status(403).json({ error: '紀錄已鎖定' });

  const schema = db.getById('form_schemas', req.params.schemaId);
  const { data, subtable_data } = req.body;

  const merged = { ...record.data, ...(data || {}) };
  const mergedSt = { ...record.subtable_data, ...(subtable_data || {}) };
  const computed = computeFormulas(schema, merged, mergedSt);

  const updated = db.update('form_records', req.params.id, {
    data: { ...merged, ...computed },
    subtable_data: mergedSt,
  });
  res.json(updated);
});

router.delete('/data/:schemaId/:id', auth, (req, res) => {
  const record = db.getById('form_records', req.params.id);
  if (!record) return res.status(404).json({ error: '不存在' });
  if (record.is_locked) return res.status(403).json({ error: '紀錄已鎖定' });
  db.remove('form_records', req.params.id);
  res.json({ success: true });
});

// PUT /data/:schemaId/:id/lock — 鎖定紀錄
router.put('/data/:schemaId/:id/lock', auth, (req, res) => {
  res.json(db.update('form_records', req.params.id, { is_locked: true }));
});

router.put('/data/:schemaId/:id/unlock', auth, (req, res) => {
  res.json(db.update('form_records', req.params.id, { is_locked: false }));
});

/* ═══════════════════════════════════════════
   公式計算（用於儲存時 + 即時計算）
   ═══════════════════════════════════════════ */

function computeFormulas(schema, data, subtableData) {
  if (!schema?.fields) return {};
  const computed = {};
  const fields = Array.isArray(schema.fields) ? schema.fields : [];

  fields.forEach(f => {
    if (f.type === 'formula' && f.formula) {
      computed[f.key] = evalFormula(f.formula, data, subtableData);
    }
  });

  // 子表格公式
  (schema.subtables || []).forEach(st => {
    const rows = subtableData?.[st.key] || [];
    (st.fields || []).forEach(f => {
      if (f.type === 'formula' && f.formula) {
        rows.forEach((row, i) => {
          if (!subtableData[st.key]) subtableData[st.key] = [];
          if (!subtableData[st.key][i]) subtableData[st.key][i] = row;
          subtableData[st.key][i][f.key] = evalFormula(f.formula, row, {});
        });
      }
    });
  });

  return computed;
}

// POST /calculate — 即時公式計算（前端用）
router.post('/calculate', auth, (req, res) => {
  const { schema_id, data, subtable_data } = req.body;
  const schema = db.getById('form_schemas', schema_id);
  if (!schema) return res.status(404).json({ error: '表單不存在' });
  const computed = computeFormulas(schema, data || {}, subtable_data || {});
  res.json(computed);
});

/* ═══════════════════════════════════════════
   連結載入引擎
   ═══════════════════════════════════════════ */

router.get('/link-load/:schemaId/:fieldKey', auth, (req, res) => {
  const { q } = req.query;
  const schema = db.getById('form_schemas', req.params.schemaId);
  if (!schema) return res.status(404).json({ error: '表單不存在' });

  const field = (schema.fields || []).find(f => f.key === req.params.fieldKey);
  if (!field || field.type !== 'link') return res.status(400).json({ error: '非連結欄位' });

  const { link_schema_id, link_display_field, link_load_fields } = field;
  if (!link_schema_id) return res.json([]);

  // 從目標表單搜尋
  let targetRecords = db.find('form_records', r => r.schema_id === link_schema_id);

  if (q && q.length >= 1) {
    const kw = q.toLowerCase();
    targetRecords = targetRecords.filter(r => {
      const displayVal = (r.data || {})[link_display_field] || '';
      return String(displayVal).toLowerCase().includes(kw);
    });
  }

  // 返回搜尋結果 + 可載入的欄位值
  const results = targetRecords.slice(0, 20).map(r => {
    const loadable = {};
    (link_load_fields || []).forEach(mapping => {
      loadable[mapping.target_key] = (r.data || {})[mapping.source_key] || '';
    });
    return {
      id: r.id,
      display: (r.data || {})[link_display_field] || '',
      load_data: loadable,
    };
  });

  res.json(results);
});

/* ═══════════════════════════════════════════
   PDF 列印
   ═══════════════════════════════════════════ */

const PRINT_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Microsoft JhengHei','Noto Sans TC',sans-serif;padding:40px;color:#1e293b;font-size:13px}
  .header{text-align:center;margin-bottom:30px;border-bottom:3px solid #4f46e5;padding-bottom:16px}
  .header h1{font-size:20px;color:#4f46e5}
  .header .no{font-size:11px;color:#94a3b8;margin-top:4px}
  .fields{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
  .field{border:1px solid #e2e8f0;border-radius:6px;padding:10px}
  .field .label{font-size:11px;color:#64748b;margin-bottom:2px}
  .field .value{font-size:13px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#f1f5f9;padding:8px;font-size:11px;border:1px solid #e2e8f0;text-align:left}
  td{padding:8px;font-size:12px;border:1px solid #e2e8f0}
  .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:30px;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{body{padding:20px}}
`;

router.get('/print/:schemaId/:id', auth, (req, res) => {
  const schema = db.getById('form_schemas', req.params.schemaId);
  const record = db.getById('form_records', req.params.id);
  if (!schema || !record) return res.status(404).json({ error: '不存在' });

  const fields = schema.fields || [];
  const data = record.data || {};
  const subtableData = record.subtable_data || {};

  let fieldsHtml = fields.filter(f => !['divider','header'].includes(f.type)).map(f => {
    let val = data[f.key] ?? '-';
    if (f.type === 'currency') val = `$${Number(val || 0).toLocaleString()}`;
    if (f.type === 'checkbox') val = val ? '✅' : '❌';
    return `<div class="field"><div class="label">${f.label}</div><div class="value">${val}</div></div>`;
  }).join('');

  let subtablesHtml = (schema.subtables || []).map(st => {
    const rows = subtableData[st.key] || [];
    if (!rows.length) return '';
    const stFields = st.fields || [];
    return `<h3 style="font-size:14px;margin:16px 0 8px">${st.label || st.key}</h3><table>
      <thead><tr>${stFields.map(f => `<th>${f.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${stFields.map(f => `<td>${row[f.key] ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }).join('');

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${schema.name} - ${record.record_no || record.id.slice(0,8)}</title><style>${PRINT_CSS}</style></head><body>
    <div class="header"><h1>${schema.icon || '📋'} ${schema.name}</h1><div class="no">${record.record_no || ''} · ${new Date(record.created_at).toLocaleDateString('zh-TW')}</div></div>
    <div class="fields">${fieldsHtml}</div>${subtablesHtml}
    <div class="footer">由 WDMC ERP 表單建構器生成 · ${new Date().toLocaleDateString('zh-TW')}</div>
    <script>window.print()</script></body></html>`);
});

module.exports = router;
