/**
 * WDMC ERP 資料庫實例
 * 使用共用 adapter，未來只需改 type: 'pg' 即可遷移
 */
const path = require('path');
const { createAdapter } = require('../../shared/db-adapter');

const db = createAdapter({
  type: process.env.DB_TYPE || 'json',
  dataDir: path.join(__dirname, '..', 'data'),
  connectionString: process.env.DATABASE_URL || '',
  collections: {
    users: [],
    departments: [],
    customers: [],
    customer_cases: [],
    proposals: [],
    quotations: [],
    contracts: [],
    projects: [],
    project_tasks: [],
    project_milestones: [],
    project_documents: [],
    vendors: [],
    purchase_orders: [],
    purchase_receipts: [],
    revenues: [],
    expenses: [],
    invoices: [],
    assets: [],
    asset_borrows: [],
    knowledge_base: [],
    activity_logs: [],
    notifications: [],
    system_settings: [],
    calendar_events: [],
    schedules: [],
    checklists: [],
    checklist_items: [],
    files: [],
    approvals: [],
    workers: [],
    labor_reports: [],
    labor_report_workers: [],
    payment_requests: [],
    expense_proofs: [],
    // Phase 2: 倉庫管理
    inventory_movements: [],
    inventory_movement_details: [],
    inventory_counts: [],
    inventory_count_details: [],
    goods_receipts: [],
    goods_receipt_details: [],
    deposits: [],
    // Phase 3: 主檔
    quotation_items: [],
    proposal_items: [],
    event_categories: [],
    po_categories: [],
    resources: [],
    // Phase 4: 活動文件
    event_flows: [],
    hardware_requirements: [],
    kickoff_forms: [],
    review_forms: [],
    project_simulations: [],
    project_simulation_details: [],
    project_templates: [],
    // Phase 5: 活動損益
    profit_loss: [],
    profit_loss_details: [],
    profit_loss_sub_details: [],
    bonus_roles: [],
    bonus_allocations: [],
    proposal_items: [],
    // Form Builder
    form_schemas: [],
    form_records: [],
    form_folders: []
  }
});

module.exports = db;
