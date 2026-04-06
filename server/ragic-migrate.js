/**
 * Ragic → WDMC管理中心 快速遷移（結構 + 每表 10 筆範例）
 * 直接批次寫入 JSON，跳過 db adapter 的逐筆 I/O
 */
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const uid = () => uuidv4();
const EXPORT_DIR = path.join(__dirname, '..', '..', 'wddata', 'ragic-export');
const SCHEMA_FILE = path.join(EXPORT_DIR, '_schema.json');
const DATA_DIR = path.join(__dirname, '..', 'data');
const MAX_RECORDS_PER_TABLE = 10;

// 讀取現有資料
function readJson(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}
function writeJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

// 頁籤→資料夾
const TAB_FOLDERS = {
  '瓦當麥可': { name: '📋 報價管理', icon: '📋', order: 1 },
  '客戶廠商資料': { name: '👥 客戶廠商', icon: '👥', order: 2 },
  '🗳️物品管理': { name: '📦 物品管理', icon: '📦', order: 3 },
  '🧮採購管理': { name: '🛒 採購管理', icon: '🛒', order: 4 },
  '零用金申請': { name: '💵 零用金/請付款', icon: '💵', order: 5 },
  '勞報單': { name: '📝 勞報單', icon: '📝', order: 6 },
  '🧰工具箱': { name: '🔧 工具箱', icon: '🔧', order: 7 },
  '活動資料': { name: '📂 活動資料', icon: '📂', order: 8 },
  '📦專案管理': { name: '📊 專案管理', icon: '📊', order: 9 },
  '活動損益表': { name: '📈 活動損益', icon: '📈', order: 10 },
  '🛠️硬體管理': { name: '🔩 硬體管理', icon: '🔩', order: 11 },
  '會計檢視': { name: '🧾 會計檢視', icon: '🧾', order: 12 },
  '硬體部門庫存列表': { name: '📋 硬體庫存', icon: '📋', order: 13 },
  '零用金記錄表': { name: '💰 零用金記錄', icon: '💰', order: 14 },
  'Ragic系統管理': { name: '⚙️ 系統管理', icon: '⚙️', order: 15 },
};

function mapFieldType(t) {
  const m = { text:'text', currency:'currency', number:'number', date:'date', select:'select',
    checkbox:'checkbox', textarea:'textarea', image:'image', file:'file', signature:'signature',
    signature_base64:'signature', email:'email', phone:'phone', address:'text', auto_number:'text',
    key:'text', rating:'rating' };
  return m[t] || 'text';
}

function isSystemField(name) {
  if (['權限群組','權限群組2','建立人','建立日期','更新人','更新日期','更新日期2','RAGIC_ID'].includes(name)) return true;
  if (/[�]/.test(name)) return true;
  return false;
}

function getIcon(name) {
  if (name.includes('報價')) return '💰';
  if (name.includes('客戶')) return '👤';
  if (name.includes('廠商')) return '🏢';
  if (name.includes('物品') || name.includes('庫存')) return '📦';
  if (name.includes('採購')) return '🛒';
  if (name.includes('勞報')) return '📝';
  if (name.includes('損益')) return '📈';
  if (name.includes('專案') || name.includes('任務')) return '📊';
  if (name.includes('請付款') || name.includes('零用金')) return '💵';
  if (name.includes('硬體')) return '🔩';
  if (name.includes('模擬') || name.includes('模版')) return '🔧';
  if (name.includes('資源') || name.includes('表演') || name.includes('藝人')) return '🎤';
  if (name.includes('證明') || name.includes('支出')) return '🧾';
  if (name.includes('保證金') || name.includes('押金')) return '💎';
  if (name.includes('機器人')) return '🤖';
  if (name.includes('攤販') || name.includes('市集')) return '🍽️';
  return '📄';
}

function safeName(n) {
  return (n || 'unnamed').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 80);
}

function main() {
  const start = Date.now();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Ragic → WDMC管理中心 快速遷移 (10筆/表)     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const ragicSchemas = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));

  // 清除舊的遷移資料
  let existingSchemas = readJson('form_schemas.json');
  let existingRecords = readJson('form_records.json');
  let existingFolders = readJson('form_folders.json');
  
  existingSchemas = existingSchemas.filter(s => !s.ragic_path);
  existingRecords = existingRecords.filter(r => r.created_by !== 'ragic-import');
  existingFolders = existingFolders.filter(f => !f.order || f.order < 1);
  
  console.log(`清除舊遷移資料完成\n`);

  // Phase 1: 建資料夾
  const folderMap = {};
  const newFolders = [...existingFolders];
  Object.entries(TAB_FOLDERS).forEach(([tab, config]) => {
    const id = uid();
    newFolders.push({ id, name: config.name, icon: config.icon, order: config.order, parent_id: null });
    folderMap[tab] = id;
    console.log(`  📁 ${config.name}`);
  });
  console.log(`\n✅ ${Object.keys(TAB_FOLDERS).length} 個資料夾\n`);

  // Phase 1: 建表單 schema + Phase 2: 匯入 10 筆
  const newSchemas = [...existingSchemas];
  const newRecords = [...existingRecords];
  let schemaCount = 0;
  let recordCount = 0;

  for (const s of ragicSchemas) {
    if (s.name.includes('➖➖➖')) continue;

    // 映射欄位
    const fields = [];
    if (s.fields) {
      for (const f of s.fields) {
        if (isSystemField(f.name)) continue;
        if (f.fill_rate < 1 && f.type === 'text') continue;
        const field = {
          key: f.name,
          type: mapFieldType(f.type),
          label: f.name,
          required: false,
          width: 1,
        };
        if (f.type === 'select' && f.options) {
          field.options = f.options.filter(o => o && o.trim());
        }
        fields.push(field);
      }
    }

    const schemaId = uid();
    const folderId = folderMap[s.tab] || null;

    newSchemas.push({
      id: schemaId,
      name: s.name,
      icon: getIcon(s.name),
      description: `Ragic: ${s.path} (原 ${s.records} 筆)`,
      fields,
      layout: { columns: fields.length > 10 ? 3 : 2 },
      subtables: [],
      auto_number: null,
      folder_id: folderId,
      ragic_path: s.path,
      ragic_tab: s.tab,
      created_by: 'system',
      is_active: true,
      version: 1,
    });

    schemaCount++;

    // 匯入最多 10 筆
    if (s.records > 0) {
      const tabDir = safeName(s.tab);
      const sheetFile = safeName(s.name);
      const jsonPath = path.join(EXPORT_DIR, tabDir, `${sheetFile}.json`);

      if (fs.existsSync(jsonPath)) {
        const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const records = (rawData.records || []).slice(0, MAX_RECORDS_PER_TABLE);

        for (const record of records) {
          const data = {};
          Object.entries(record).forEach(([key, val]) => {
            if (key.startsWith('_')) return;
            if (isSystemField(key)) return;
            if (typeof val === 'string' && val.length > 500 && val.startsWith('data:image')) {
              data[key] = '(簽名資料)';
            } else {
              data[key] = val;
            }
          });

          newRecords.push({
            id: uid(),
            schema_id: schemaId,
            record_no: record['_ragicId'] ? `RAGIC-${record['_ragicId']}` : null,
            data,
            subtable_data: {},
            created_by: 'ragic-import',
            status: 'active',
            is_locked: false,
            ragic_id: record['_ragicId'] || null,
          });
          recordCount++;
        }
      }
    }

    const recs = Math.min(s.records, MAX_RECORDS_PER_TABLE);
    console.log(`  📄 ${s.name} (${fields.length} 欄位, ${recs} 筆) → ${TAB_FOLDERS[s.tab]?.name || '未分類'}`);
  }

  // 一次性寫入
  console.log('\n💾 批次寫入 JSON...');
  writeJson('form_folders.json', newFolders);
  writeJson('form_schemas.json', newSchemas);
  writeJson('form_records.json', newRecords);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 遷移完成！');
  console.log('═'.repeat(50));
  console.log(`⏱️  耗時: ${elapsed} 秒`);
  console.log(`📁 資料夾: ${Object.keys(TAB_FOLDERS).length} 個`);
  console.log(`📄 表單: ${schemaCount} 張`);
  console.log(`📦 範例紀錄: ${recordCount} 筆 (每表最多 ${MAX_RECORDS_PER_TABLE} 筆)`);
  console.log(`🌐 打開 http://localhost:3002 → 自訂表單`);
  console.log('═'.repeat(50));
}

main();
