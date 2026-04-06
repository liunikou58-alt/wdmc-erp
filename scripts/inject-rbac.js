/**
 * RBAC Injection Script
 * Automatically adds requirePermission middleware to all route files
 */
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'server', 'routes');

// Map route file → module name in ERP_PERMISSIONS
const ROUTE_MODULE_MAP = {
  'customers.js': 'customers',
  'proposals.js': 'proposals',
  'contracts.js': 'contracts',
  'events.js': 'events',
  'projects.js': 'projects',
  'vendors.js': 'vendors',
  'finance.js': 'finance',
  'payments.js': 'payments',
  'deposits.js': 'deposits',
  'profit-loss.js': 'profit_loss',
  'bi.js': 'bi',
  'journal.js': 'journal',
  'inventory.js': 'inventory',
  'assets.js': 'assets',
  'workers.js': 'workers',
  'labor-reports.js': 'labor_reports',
  'calendar.js': 'calendar',
  'schedules.js': 'schedules',
  'checklists.js': 'checklists',
  'files.js': 'files',
  'approvals.js': 'approvals',
  'reports.js': 'reports',
  'knowledge.js': 'knowledge',
  'resources.js': 'resources',
  'form-builder.js': 'form_builder',
  'notifications.js': 'notifications',
  'quotation-items.js': 'quotation_items',
  'event-docs.js': 'event_docs',
  'purchase-orders.js': 'purchase_orders',
  'bonuses.js': 'bonuses',
  'esign.js': 'esign',
  'export.js': 'reports',
  'bridge.js': 'settings',
  'public-share.js': 'public_share',
};

// HTTP method → permission action
const METHOD_ACTION = {
  'get': 'view',
  'post': 'create',
  'put': 'edit',
  'patch': 'edit',
  'delete': 'delete',
};

let totalFiles = 0;
let totalRoutes = 0;

for (const [filename, moduleName] of Object.entries(ROUTE_MODULE_MAP)) {
  const filepath = path.join(routesDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  SKIP: ${filename} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;
  let routeCount = 0;

  // Step 1: Ensure requirePermission is imported
  if (!content.includes('requirePermission')) {
    // Update the auth import to include requirePermission
    if (content.includes("{ auth, logActivity }")) {
      content = content.replace(
        "{ auth, logActivity }",
        "{ auth, logActivity, requirePermission }"
      );
      modified = true;
    } else if (content.includes("{ auth }")) {
      content = content.replace(
        "{ auth }",
        "{ auth, requirePermission }"
      );
      modified = true;
    }
  }

  // Step 2: Inject requirePermission into route handlers
  // Match patterns like: router.get('/', auth, (req, res) =>
  // But NOT if requirePermission is already there
  const routePattern = /router\.(get|post|put|patch|delete)\(([^,]+),\s*auth,\s*(?!requirePermission|requireMinRole|role\()/g;

  content = content.replace(routePattern, (match, method, pathArg) => {
    const action = METHOD_ACTION[method] || 'view';

    // Special cases: stats endpoints should use 'view'
    if (pathArg.includes('stats')) {
      routeCount++;
      return `router.${method}(${pathArg}, auth, requirePermission('${moduleName}', 'view'),`;
    }

    // Approve endpoints
    if (pathArg.includes('approve') || pathArg.includes('sign')) {
      routeCount++;
      return `router.${method}(${pathArg}, auth, requirePermission('${moduleName}', 'approve'),`;
    }

    routeCount++;
    return `router.${method}(${pathArg}, auth, requirePermission('${moduleName}', '${action}'),`;
  });

  if (routeCount > 0) modified = true;

  if (modified) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ ${filename}: ${routeCount} routes injected (module: ${moduleName})`);
    totalFiles++;
    totalRoutes += routeCount;
  } else {
    console.log(`⏭️  ${filename}: already has RBAC or no changes needed`);
  }
}

console.log(`\n📊 Summary: ${totalFiles} files modified, ${totalRoutes} routes injected`);
