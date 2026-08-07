/**
 * Activity Logs View Component
 * Audit trail of all administrative and employee system actions.
 */

const ActivityLogsView = {
  searchQuery: '',
  filterRole: 'ALL',
  filterStore: 'ALL',

  render() {
    let logs = storage.getActivityLogs();
    const stores = storage.getStores();

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      logs = logs.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q) ||
        l.asset.toLowerCase().includes(q) ||
        l.store.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (this.filterRole !== 'ALL') {
      logs = logs.filter(l => l.role === this.filterRole);
    }

    // Store filter
    if (this.filterStore !== 'ALL') {
      logs = logs.filter(l => l.store === this.filterStore);
    }

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Activity Logs</h1>
          <p class="view-subtitle">Comprehensive audit trail of system events, edits, and maintenance updates.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="ActivityLogsView.exportLogsCSV()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Logs CSV
          </button>
        </div>
      </div>

      <!-- SEARCH & FILTER TOOLBAR -->
      <div class="card-box" style="margin-bottom: 24px;">
        <div class="filter-toolbar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              class="form-control search-field" 
              placeholder="Search action, details, asset, or user..." 
              value="${Utils.escapeHtml(this.searchQuery)}"
              oninput="ActivityLogsView.handleSearch(this.value)"
            />
          </div>

          <div class="filter-group">
            <label class="form-label-inline">User Role:</label>
            <select class="form-control" onchange="ActivityLogsView.handleFilterRole(this.value)">
              <option value="ALL" ${this.filterRole === 'ALL' ? 'selected' : ''}>All Roles</option>
              <option value="Admin" ${this.filterRole === 'Admin' ? 'selected' : ''}>Admin</option>
              <option value="Store Manager" ${this.filterRole === 'Store Manager' ? 'selected' : ''}>Store Manager</option>
              <option value="System" ${this.filterRole === 'System' ? 'selected' : ''}>System Auto Alert</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Store:</label>
            <select class="form-control" onchange="ActivityLogsView.handleFilterStore(this.value)">
              <option value="ALL" ${this.filterStore === 'ALL' ? 'selected' : ''}>All Stores</option>
              ${stores.map(s => `<option value="${s.name}" ${this.filterStore === s.name ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- LOGS TABLE -->
      <div class="card-box">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User & Role</th>
                <th>Store</th>
                <th>Asset</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${
                logs.length === 0
                  ? `<tr><td colspan="6" class="empty-state">No activity logs found.</td></tr>`
                  : logs.map(l => `
                      <tr>
                        <td>
                          <strong>${Utils.escapeHtml(l.date)}</strong>
                          <div class="text-subtle">${Utils.escapeHtml(l.time)}</div>
                        </td>
                        <td>
                          <strong>${Utils.escapeHtml(l.user)}</strong>
                          <div class="text-subtle"><span class="badge ${l.role === 'Admin' ? 'badge-due-today' : 'badge-upcoming'}">${Utils.escapeHtml(l.role)}</span></div>
                        </td>
                        <td>${Utils.escapeHtml(l.store)}</td>
                        <td><strong>${Utils.escapeHtml(l.asset)}</strong></td>
                        <td><span class="action-tag">${Utils.escapeHtml(l.action)}</span></td>
                        <td style="max-width: 320px;">${Utils.escapeHtml(l.details)}</td>
                      </tr>
                    `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  handleSearch(val) {
    this.searchQuery = val;
    App.renderCurrentView();
  },

  handleFilterRole(val) {
    this.filterRole = val;
    App.renderCurrentView();
  },

  handleFilterStore(val) {
    this.filterStore = val;
    App.renderCurrentView();
  },

  exportLogsCSV() {
    const logs = storage.getActivityLogs();
    const rows = [
      ['Date', 'Time', 'User', 'Role', 'Store', 'Asset', 'Action', 'Details']
    ];

    logs.forEach(l => {
      rows.push([l.date, l.time, l.user, l.role, l.store, l.asset, l.action, l.details]);
    });

    Utils.downloadCSV('Activity_Logs_' + Utils.getTodayStr() + '.csv', rows);
    Utils.showToast('Activity logs exported to CSV!', 'success');
  }
};
