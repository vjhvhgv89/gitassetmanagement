/**
 * Reports & Analytics View Component
 * Asset & maintenance breakdown reports with CSV, Excel export, and print stylesheet functionality.
 */

const ReportsView = {
  filterStore: 'ALL',
  filterCategory: 'ALL',

  render() {
    let assets = storage.getAssets();
    const stores = storage.getStores();

    // Map computed statuses
    assets = assets.map(a => ({
      ...a,
      statusInfo: Utils.calculateStatus(a)
    }));

    if (this.filterStore !== 'ALL') {
      assets = assets.filter(a => a.storeId === this.filterStore);
    }
    if (this.filterCategory !== 'ALL') {
      assets = assets.filter(a => a.category === this.filterCategory);
    }

    // Aggregations
    const totalAssets = assets.length;
    const totalValuation = assets.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
    const completedCount = assets.filter(a => a.statusInfo.key === 'COMPLETED').length;
    const overdueCount = assets.filter(a => a.statusInfo.key === 'OVERDUE').length;
    const dueTodayCount = assets.filter(a => a.statusInfo.key === 'DUE_TODAY').length;
    const dueSoonCount = assets.filter(a => a.statusInfo.key === 'DUE_SOON').length;

    // Assets by Store breakdown
    const storeBreakdown = {};
    assets.forEach(a => {
      if (!storeBreakdown[a.storeName]) storeBreakdown[a.storeName] = 0;
      storeBreakdown[a.storeName]++;
    });

    // Assets by Category breakdown
    const categoryBreakdown = {};
    assets.forEach(a => {
      if (!categoryBreakdown[a.category]) categoryBreakdown[a.category] = 0;
      categoryBreakdown[a.category]++;
    });

    return `
      <div class="view-header print-hide">
        <div>
          <h1 class="view-title">System Reports & Analytics</h1>
          <p class="view-subtitle">Generate asset distribution, maintenance compliance, and store audit reports.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="ReportsView.exportCSV()">Export CSV</button>
          <button class="btn btn-secondary" onclick="ReportsView.exportExcel()">Export Excel</button>
          <button class="btn btn-primary" onclick="window.print()">Print Report</button>
        </div>
      </div>

      <!-- FILTER TOOLBAR -->
      <div class="card-box print-hide" style="margin-bottom: 24px;">
        <div class="filter-toolbar">
          <div class="filter-group">
            <label class="form-label-inline">Store Filter:</label>
            <select class="form-control" onchange="ReportsView.handleFilterStore(this.value)">
              <option value="ALL" ${this.filterStore === 'ALL' ? 'selected' : ''}>All Stores</option>
              ${stores.map(s => `<option value="${s.id}" ${this.filterStore === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Category Filter:</label>
            <select class="form-control" onchange="ReportsView.handleFilterCategory(this.value)">
              <option value="ALL" ${this.filterCategory === 'ALL' ? 'selected' : ''}>All Categories</option>
              <option value="POS Hardware">POS Hardware</option>
              <option value="Security">Security</option>
              <option value="Facilities">Facilities</option>
              <option value="Inventory Tools">Inventory Tools</option>
              <option value="Power & Electrical">Power & Electrical</option>
            </select>
          </div>
        </div>
      </div>

      <!-- PRINT HEADER (ONLY VISIBLE IN PRINT MODE) -->
      <div class="print-only-header" style="display: none; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 1.8rem; color: #111827;">Asset Management System - Official Report</h1>
        <p style="margin: 4px 0 0 0; color: #4b5563;">Generated on ${new Date().toLocaleString()} by System Administrator</p>
        <hr style="margin: 16px 0; border: 0; border-top: 2px solid #2563eb;" />
      </div>

      <!-- SUMMARY REPORT CARDS -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Filtered Assets</span>
            <span class="metric-value">${totalAssets}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Total Asset Valuation</span>
            <span class="metric-value" style="color: #2563eb;">${Utils.formatCurrency(totalValuation)}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Completed Services</span>
            <span class="metric-value color-completed">${completedCount}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Overdue Services</span>
            <span class="metric-value color-overdue">${overdueCount}</span>
          </div>
        </div>
      </div>

      <!-- BREAKDOWN GRIDS -->
      <div class="dashboard-grid" style="margin-top: 24px;">
        <!-- ASSETS BY STORE -->
        <div class="card-box">
          <h3 class="card-box-title" style="margin-bottom: 16px;">Assets Distribution by Store</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Store Location</th>
                  <th style="text-align: right;">Total Assets</th>
                  <th style="text-align: right;">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${
                  Object.keys(storeBreakdown).length === 0
                    ? `<tr><td colspan="3" class="empty-state">No assets found.</td></tr>`
                    : Object.entries(storeBreakdown).map(([storeName, count]) => {
                        const pct = totalAssets > 0 ? ((count / totalAssets) * 100).toFixed(1) : 0;
                        return `
                          <tr>
                            <td><strong>${Utils.escapeHtml(storeName)}</strong></td>
                            <td style="text-align: right;">${count}</td>
                            <td style="text-align: right;"><strong>${pct}%</strong></td>
                          </tr>
                        `;
                      }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- ASSETS BY CATEGORY -->
        <div class="card-box">
          <h3 class="card-box-title" style="margin-bottom: 16px;">Assets Breakdown by Category</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th style="text-align: right;">Total Count</th>
                  <th style="text-align: right;">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${
                  Object.keys(categoryBreakdown).length === 0
                    ? `<tr><td colspan="3" class="empty-state">No assets found.</td></tr>`
                    : Object.entries(categoryBreakdown).map(([catName, count]) => {
                        const pct = totalAssets > 0 ? ((count / totalAssets) * 100).toFixed(1) : 0;
                        return `
                          <tr>
                            <td><span class="category-pill">${Utils.escapeHtml(catName)}</span></td>
                            <td style="text-align: right;">${count}</td>
                            <td style="text-align: right;"><strong>${pct}%</strong></td>
                          </tr>
                        `;
                      }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- FULL ASSETS REPORT TABLE -->
      <div class="card-box" style="margin-top: 24px;">
        <h3 class="card-box-title" style="margin-bottom: 16px;">Master Asset Audit Register</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Store</th>
                <th>Location</th>
                <th>Value ($)</th>
                <th>Due Date</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                assets.map(a => `
                  <tr>
                    <td><code>${Utils.escapeHtml(a.serialId)}</code></td>
                    <td><strong>${Utils.escapeHtml(a.name)}</strong></td>
                    <td>${Utils.escapeHtml(a.category)}</td>
                    <td>${Utils.escapeHtml(a.storeName)}</td>
                    <td>${Utils.escapeHtml(a.location)}</td>
                    <td>${Utils.formatCurrency(a.cost)}</td>
                    <td>${Utils.formatDate(a.dueDate)}</td>
                    <td>${Utils.escapeHtml(a.condition)}</td>
                    <td><span class="badge ${a.statusInfo.badgeClass}">${a.statusInfo.label}</span></td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  handleFilterStore(val) {
    this.filterStore = val;
    App.renderCurrentView();
  },

  handleFilterCategory(val) {
    this.filterCategory = val;
    App.renderCurrentView();
  },

  exportCSV() {
    const assets = storage.getAssets();
    const rows = [
      ['Serial / ID', 'Asset Name', 'Category', 'Store', 'Location', 'Scheduled Due Date', 'Condition', 'Estimated Cost', 'Maintenance Cycle', 'Last Completed']
    ];

    assets.forEach(a => {
      rows.push([
        a.serialId,
        a.name,
        a.category,
        a.storeName,
        a.location,
        a.dueDate,
        a.condition,
        a.cost,
        a.cycle,
        a.lastCompletedDate
      ]);
    });

    Utils.downloadCSV('Asset_Report_' + Utils.getTodayStr() + '.csv', rows);
    Utils.showToast('Asset report CSV downloaded successfully!', 'success');
  },

  exportExcel() {
    this.exportCSV(); // Excel opens CSV natively
  }
};
