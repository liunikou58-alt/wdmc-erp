const API = '/api';
function getToken() { return localStorage.getItem('erp_token'); }

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '請求失敗');
  return data;
}

export const api = {
  // Auth
  getUsers: () => request('/auth/users'),
  createUser: (d) => request('/auth/users', { method: 'POST', body: JSON.stringify(d) }),
  updateUser: (id, d) => request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  getDepartments: () => request('/auth/departments'),
  createDepartment: (d) => request('/auth/departments', { method: 'POST', body: JSON.stringify(d) }),
  getSettings: () => request('/auth/settings'),
  updateSetting: (key, value) => request(`/auth/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  getActivities: () => request('/auth/activities'),

  // Customers
  getCustomers: () => request('/customers'),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (d) => request('/customers', { method: 'POST', body: JSON.stringify(d) }),
  updateCustomer: (id, d) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  getCases: (cid) => request(`/customers/${cid}/cases`),
  createCase: (cid, d) => request(`/customers/${cid}/cases`, { method: 'POST', body: JSON.stringify(d) }),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (d) => request('/projects', { method: 'POST', body: JSON.stringify(d) }),
  updateProject: (id, d) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getProjectTasks: (pid) => request(`/projects/${pid}/tasks`),
  createProjectTask: (pid, d) => request(`/projects/${pid}/tasks`, { method: 'POST', body: JSON.stringify(d) }),
  updateProjectTask: (pid, tid, d) => request(`/projects/${pid}/tasks/${tid}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProjectTask: (pid, tid) => request(`/projects/${pid}/tasks/${tid}`, { method: 'DELETE' }),

  // Proposals
  getProposals: () => request('/proposals'),
  getProposal: (id) => request(`/proposals/${id}`),
  createProposal: (d) => request('/proposals', { method: 'POST', body: JSON.stringify(d) }),
  updateProposal: (id, d) => request(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProposal: (id) => request(`/proposals/${id}`, { method: 'DELETE' }),
  convertProposal: (id) => request(`/proposals/${id}/convert`, { method: 'POST' }),

  // Vendors
  getVendors: () => request('/vendors'),
  createVendor: (d) => request('/vendors', { method: 'POST', body: JSON.stringify(d) }),
  updateVendor: (id, d) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),
  getAllPOs: () => request('/vendors/po/all'),
  createPO: (d) => request('/vendors/po', { method: 'POST', body: JSON.stringify(d) }),
  updatePO: (id, d) => request(`/vendors/po/${id}`, { method: 'PUT', body: JSON.stringify(d) }),

  // Finance
  getFinanceSummary: () => request('/finance/summary'),
  getRevenues: () => request('/finance/revenues'),
  createRevenue: (d) => request('/finance/revenues', { method: 'POST', body: JSON.stringify(d) }),
  getExpenses: () => request('/finance/expenses'),
  createExpense: (d) => request('/finance/expenses', { method: 'POST', body: JSON.stringify(d) }),
  getInvoices: () => request('/finance/invoices'),
  createInvoice: (d) => request('/finance/invoices', { method: 'POST', body: JSON.stringify(d) }),

  // BI
  getBIOverview: () => request('/bi/overview'),
  getBIProjects: () => request('/bi/project-analysis'),
  getBICustomers: () => request('/bi/customer-analysis'),
  getBIRevenue: () => request('/bi/revenue-analysis'),
  getBIDepartments: () => request('/bi/department-analysis'),

  // Knowledge
  _request: (url) => request(url),
  getKnowledge: (cat) => request(cat ? `/knowledge?category=${cat}` : '/knowledge'),
  createKnowledge: (d) => request('/knowledge', { method: 'POST', body: JSON.stringify(d) }),
  deleteKnowledge: (id) => request(`/knowledge/${id}`, { method: 'DELETE' }),

  // Assets
  getAssets: () => request('/assets'),
  createAsset: (d) => request('/assets', { method: 'POST', body: JSON.stringify(d) }),
  deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),

  // Contracts
  getContracts: () => request('/contracts'),
  createContract: (d) => request('/contracts', { method: 'POST', body: JSON.stringify(d) }),
  updateContract: (id, d) => request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteContract: (id) => request(`/contracts/${id}`, { method: 'DELETE' }),

  // Bridge
  getBridgeStatus: () => request('/bridge/status'),
  getBridgePFProjects: () => request('/bridge/proposalflow/projects'),
  importFromPF: (pfId) => request(`/bridge/proposalflow/import/${pfId}`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  getUnreadCount: () => request('/notifications/unread-count'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/batch/read-all', { method: 'PUT' }),

  // Calendar
  getCalendar: (start, end) => request(`/calendar?start=${start}&end=${end}`),
  addCalendarEvent: (d) => request('/calendar', { method: 'POST', body: JSON.stringify(d) }),

  // Schedules
  getSchedules: (params) => request('/schedules' + (params ? `?${new URLSearchParams(params)}` : '')),
  getScheduleConflicts: () => request('/schedules/conflicts'),
  getAvailability: (date) => request(`/schedules/availability?date=${date}`),
  createSchedule: (d) => request('/schedules', { method: 'POST', body: JSON.stringify(d) }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),

  // Checklists
  getChecklists: (params) => request('/checklists' + (params ? `?${new URLSearchParams(params)}` : '')),
  getChecklist: (id) => request(`/checklists/${id}`),
  createChecklist: (d) => request('/checklists', { method: 'POST', body: JSON.stringify(d) }),
  deleteChecklist: (id) => request(`/checklists/${id}`, { method: 'DELETE' }),
  addChecklistItem: (cid, d) => request(`/checklists/${cid}/items`, { method: 'POST', body: JSON.stringify(d) }),
  toggleChecklistItem: (itemId) => request(`/checklists/items/${itemId}/toggle`, { method: 'PUT' }),
  getChecklistTemplates: () => request('/checklists/templates/list'),

  // Files
  getFiles: (cat) => request(cat ? `/files?category=${cat}` : '/files'),
  uploadFile: (d) => request('/files/upload', { method: 'POST', body: JSON.stringify(d) }),
  deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),

  // Approvals
  getApprovals: (params) => request(`/approvals${params || ''}`),
  getApprovalStats: () => request('/approvals/stats'),
  createApproval: (d) => request('/approvals', { method: 'POST', body: JSON.stringify(d) }),
  approveApproval: (id, d) => request(`/approvals/${id}/approve`, { method: 'PUT', body: JSON.stringify(d) }),
  rejectApproval: (id, d) => request(`/approvals/${id}/reject`, { method: 'PUT', body: JSON.stringify(d) }),

  // Reports (open in new tab for printing)
  printQuotation: (id) => window.open(`/api/reports/quotation/${id}`, '_blank'),
  printContract: (id) => window.open(`/api/reports/contract/${id}`, '_blank'),
  printPO: (id) => window.open(`/api/reports/purchase-order/${id}`, '_blank'),
  printFinanceReport: (month) => window.open(`/api/reports/finance-report?month=${month}`, '_blank'),
  printProject: (id) => window.open(`/api/reports/project/${id}`, '_blank'),

  // BI Overview
  getBIOverview: () => request('/bi/overview'),

  // Workers (工作人員主檔)
  getWorkersList: () => request('/workers'),
  searchWorkers: (q) => request(`/workers/search?q=${encodeURIComponent(q)}`),
  getWorker: (id) => request(`/workers/${id}`),
  createWorker: (d) => request('/workers', { method: 'POST', body: JSON.stringify(d) }),
  updateWorker: (id, d) => request(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteWorker: (id) => request(`/workers/${id}`, { method: 'DELETE' }),

  // Labor Reports (勞報單)
  getLaborReports: (params) => request('/labor-reports' + (params ? `?${new URLSearchParams(params)}` : '')),
  getLaborStats: () => request('/labor-reports/stats'),
  getLaborReport: (id) => request(`/labor-reports/${id}`),
  createLaborReport: (d) => request('/labor-reports', { method: 'POST', body: JSON.stringify(d) }),
  updateLaborReport: (id, d) => request(`/labor-reports/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteLaborReport: (id) => request(`/labor-reports/${id}`, { method: 'DELETE' }),
  addWorkerToReport: (id, d) => request(`/labor-reports/${id}/workers`, { method: 'POST', body: JSON.stringify(d) }),
  closeLaborReport: (id) => request(`/labor-reports/${id}/close`, { method: 'PUT' }),
  reopenLaborReport: (id) => request(`/labor-reports/${id}/reopen`, { method: 'PUT' }),
  printLaborReport: (id) => window.open(`/api/labor-reports/${id}/pdf`, '_blank'),

  // Payments (請付款/零用金)
  getPayments: (params) => request('/payments' + (params ? `?${new URLSearchParams(params)}` : '')),
  getPaymentStats: () => request('/payments/stats'),
  createPayment: (d) => request('/payments', { method: 'POST', body: JSON.stringify(d) }),
  updatePayment: (id, d) => request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  approvePayment: (id) => request(`/payments/${id}/approve`, { method: 'PUT' }),
  rejectPayment: (id, d) => request(`/payments/${id}/reject`, { method: 'PUT', body: JSON.stringify(d || {}) }),
  markPaymentPaid: (id) => request(`/payments/${id}/pay`, { method: 'PUT' }),
  deletePayment: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
  getExpenseProofs: () => request('/payments/expense-proofs/list'),
  createExpenseProof: (d) => request('/payments/expense-proofs', { method: 'POST', body: JSON.stringify(d) }),
  verifyExpenseProof: (id) => request(`/payments/expense-proofs/${id}/verify`, { method: 'PUT' }),

  // Inventory (物品管理)
  getInventoryMovements: () => request('/inventory/movements'),
  inventoryCheckout: (d) => request('/inventory/checkout', { method: 'POST', body: JSON.stringify(d) }),
  inventoryCheckin: (d) => request('/inventory/checkin', { method: 'POST', body: JSON.stringify(d) }),
  getInventoryCounts: () => request('/inventory/counts'),
  createInventoryCount: (d) => request('/inventory/counts', { method: 'POST', body: JSON.stringify(d) }),
  getInventoryReceipts: () => request('/inventory/receipts'),
  createGoodsReceipt: (d) => request('/inventory/receipts', { method: 'POST', body: JSON.stringify(d) }),

  // Deposits (保證金)
  getDeposits: (params) => request('/deposits' + (params ? `?${new URLSearchParams(params)}` : '')),
  getDepositStats: () => request('/deposits/stats'),
  createDeposit: (d) => request('/deposits', { method: 'POST', body: JSON.stringify(d) }),
  returnDeposit: (id) => request(`/deposits/${id}/return`, { method: 'PUT' }),

  // Resources (資源名單)
  getResources: (type) => request('/resources' + (type ? `?type=${type}` : '')),
  getResourceStats: () => request('/resources/stats/summary'),
  createResource: (d) => request('/resources', { method: 'POST', body: JSON.stringify(d) }),
  updateResource: (id, d) => request(`/resources/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteResource: (id) => request(`/resources/${id}`, { method: 'DELETE' }),

  // Quotation Items (活動項目主檔)
  getQuotationItems: (params) => request('/quotation-items' + (params ? `?${new URLSearchParams(params)}` : '')),
  createQuotationItem: (d) => request('/quotation-items', { method: 'POST', body: JSON.stringify(d) }),
  updateQuotationItem: (id, d) => request(`/quotation-items/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteQuotationItem: (id) => request(`/quotation-items/${id}`, { method: 'DELETE' }),

  // Event Documents
  getEventFlow: (pid) => request(`/event-docs/${pid}/flow`),
  createEventFlow: (pid, d) => request(`/event-docs/${pid}/flow`, { method: 'POST', body: JSON.stringify(d) }),
  getHardwareReqs: (pid) => request(`/event-docs/${pid}/hardware`),
  createHardwareReq: (pid, d) => request(`/event-docs/${pid}/hardware`, { method: 'POST', body: JSON.stringify(d) }),
  getKickoff: (pid) => request(`/event-docs/${pid}/kickoff`),
  createKickoff: (pid, d) => request(`/event-docs/${pid}/kickoff`, { method: 'POST', body: JSON.stringify(d) }),
  getReview: (pid) => request(`/event-docs/${pid}/review`),
  createReview: (pid, d) => request(`/event-docs/${pid}/review`, { method: 'POST', body: JSON.stringify(d) }),

  // Form Builder
  formBuilderGetFolders: () => request('/form-builder/folders'),
  formBuilderCreateFolder: (d) => request('/form-builder/folders', { method: 'POST', body: JSON.stringify(d) }),
  formBuilderGetSchemas: (folderId) => request('/form-builder/schemas' + (folderId ? `?folder_id=${folderId}` : '')),
  formBuilderGetSchema: (id) => request(`/form-builder/schemas/${id}`),
  formBuilderCreateSchema: (d) => request('/form-builder/schemas', { method: 'POST', body: JSON.stringify(d) }),
  formBuilderUpdateSchema: (id, d) => request(`/form-builder/schemas/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  formBuilderDeleteSchema: (id) => request(`/form-builder/schemas/${id}`, { method: 'DELETE' }),
  formBuilderDuplicateSchema: (id) => request(`/form-builder/schemas/${id}/duplicate`, { method: 'POST' }),
  formBuilderGetRecords: (sid) => request(`/form-builder/data/${sid}`),
  formBuilderGetRecord: (sid, id) => request(`/form-builder/data/${sid}/${id}`),
  formBuilderCreateRecord: (sid, d) => request(`/form-builder/data/${sid}`, { method: 'POST', body: JSON.stringify(d) }),
  formBuilderUpdateRecord: (sid, id, d) => request(`/form-builder/data/${sid}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  formBuilderDeleteRecord: (sid, id) => request(`/form-builder/data/${sid}/${id}`, { method: 'DELETE' }),
  formBuilderCalculate: (d) => request('/form-builder/calculate', { method: 'POST', body: JSON.stringify(d) }),
  formBuilderLinkLoad: (sid, fk, q) => request(`/form-builder/link-load/${sid}/${fk}?q=${encodeURIComponent(q)}`),

  // ═══ 活動損益 ═══
  getProfitLoss: (params) => request('/profit-loss' + (params ? '?' + new URLSearchParams(params) : '')),
  getProfitLossStats: () => request('/profit-loss/stats'),
  getProfitLossById: (id) => request(`/profit-loss/${id}`),
  createProfitLoss: (d) => request('/profit-loss', { method: 'POST', body: JSON.stringify(d) }),
  updateProfitLoss: (id, d) => request(`/profit-loss/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProfitLoss: (id) => request(`/profit-loss/${id}`, { method: 'DELETE' }),
  getPLDetails: (id) => request(`/profit-loss/${id}/details`),
  createPLDetail: (id, d) => request(`/profit-loss/${id}/details`, { method: 'POST', body: JSON.stringify(d) }),
  updatePLDetail: (detailId, d) => request(`/profit-loss/details/${detailId}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePLDetail: (detailId) => request(`/profit-loss/details/${detailId}`, { method: 'DELETE' }),
  linkPLFromProposal: (proposalId) => request(`/profit-loss/link/from-proposal/${proposalId}`, { method: 'POST' }),
  linkPLLabor: (id) => request(`/profit-loss/${id}/link/labor`, { method: 'POST' }),
  linkPLPurchase: (id) => request(`/profit-loss/${id}/link/purchase`, { method: 'POST' }),

  // ═══ 報價子表 ═══
  getProposalItems: (id) => request(`/proposals/${id}/items`),
  createProposalItem: (id, d) => request(`/proposals/${id}/items`, { method: 'POST', body: JSON.stringify(d) }),
  updateProposalItem: (id, itemId, d) => request(`/proposals/${id}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProposalItem: (id, itemId) => request(`/proposals/${id}/items/${itemId}`, { method: 'DELETE' }),

  // ═══ 匯出 ═══
  exportPayroll: (params) => API + '/export/payroll' + (params ? '?' + new URLSearchParams(params) : ''),
  exportProfitLoss: () => API + '/export/profit-loss',
  exportPLDetails: (id) => API + `/export/profit-loss/${id}/details`,
  exportProposal: (id) => API + `/export/proposal/${id}`,
  exportLabor: () => API + '/export/labor',
  exportVendorSettlement: () => API + '/export/vendor-settlement',

  // ═══ 檔案上傳 ═══
  uploadFile: (d) => request('/files/upload', { method: 'POST', body: JSON.stringify(d) }),
  getFiles: (params) => request('/files' + (params ? '?' + new URLSearchParams(params) : '')),
  deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),

  // ═══ 採購單 ═══
  getPurchaseOrders: () => request('/purchase-orders'),
  getPOStats: () => request('/purchase-orders/stats'),
  createPO: (d) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(d) }),
  updatePO: (id, d) => request(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePO: (id) => request(`/purchase-orders/${id}`, { method: 'DELETE' }),
  getPOItems: (id) => request(`/purchase-orders/${id}/items`),
  createPOItem: (id, d) => request(`/purchase-orders/${id}/items`, { method: 'POST', body: JSON.stringify(d) }),
  deletePOItem: (poId, itemId) => request(`/purchase-orders/${poId}/items/${itemId}`, { method: 'DELETE' }),
  poToPayment: (id) => request(`/purchase-orders/${id}/to-payment`, { method: 'POST' }),
  poToPL: (id) => request(`/purchase-orders/${id}/to-pl`, { method: 'POST' }),
  getPODeposits: () => request('/purchase-orders/deposits'),
  createPODeposit: (d) => request('/purchase-orders/deposits', { method: 'POST', body: JSON.stringify(d) }),

  // ═══ 物品管理 (出入庫) ═══
  getMovements: () => request('/inventory/movements'),
  checkout: (d) => request('/inventory/checkout', { method: 'POST', body: JSON.stringify(d) }),
  checkin: (d) => request('/inventory/checkin', { method: 'POST', body: JSON.stringify(d) }),
  getCounts: () => request('/inventory/counts'),
  createCount: (d) => request('/inventory/counts', { method: 'POST', body: JSON.stringify(d) }),
  completeCount: (id, d) => request(`/inventory/counts/${id}/complete`, { method: 'PUT', body: JSON.stringify(d) }),
  getReceipts: () => request('/inventory/receipts'),
  createReceipt: (d) => request('/inventory/receipts', { method: 'POST', body: JSON.stringify(d) }),

  // ═══ PDF ═══
  exportPDF: (id) => API + `/export/proposal/${id}/pdf`,

  // ═══ 流程觸發 ═══
  proposalToAll: (id) => request(`/proposals/${id}/to-all`, { method: 'POST' }),
  updatePayment: (id, d) => request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
};
