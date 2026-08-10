/**
 * Dashboard View
 * Summary cards, upcoming maintenance list, recent activity feed.
 */

const DashboardView = {
  render() {
    const assets = storage.getAssets();
    const stores = storage.getStores();
    const activities = storage.getActivityLogs().slice(0, 8); // Top 8 recent activities

    // Calculate metrics
    let totalAssets = assets.length;
    let totalStores = stores.length;
    let dueTodayCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    const assetsWithStatus = assets.map(asset => {
      const statusInfo = Utils.calculateStatus(asset);
      if (statusInfo.key === 'COMPLETED') completedCount++;
      else if (statusInfo.key === 'DUE_TODAY') dueTodayCount++;
      else if (statusInfo.key === 'DUE_SOON') dueSoonCount++;
      else if (statusInfo.key === 'OVERDUE') overdueCount++;
      return { ...asset, statusInfo };
    });

    // Upcoming Maintenance: Filter out completed, sort by due date ascending
    const upcomingMaintenance = assetsWithStatus
      .filter(a => !a.isCompleted)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Admin Dashboard</h1>
          <p class="view-subtitle">Overview of stores, asset status, and upcoming maintenance tasks.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="App.openAssetModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Add New Asset
          </button>
        </div>
      </div>

      <!-- SUMMARY CARDS GRID -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon bg-blue-light">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">Total Assets</span>
            <span class="metric-value">${totalAssets}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon bg-indigo-light">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">Total Stores</span>
            <span class="metric-value">${totalStores}</span>
          </div>
        </div>

        <div class="metric-card card-due-today">
          <div class="metric-icon bg-blue-tag">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">Due Today</span>
            <span class="metric-value color-due-today">${dueTodayCount}</span>
          </div>
        </div>

        <div class="metric-card card-due-soon">
          <div class="metric-icon bg-orange-tag">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">Due Soon</span>
            <span class="metric-value color-due-soon">${dueSoonCount}</span>
          </div>
        </div>

        <div class="metric-card card-overdue">
          <div class="metric-icon bg-red-tag">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">Overdue</span>
            <span class="metric-value color-overdue">${overdueCount}</span>
          </div>
        </div>

        <div class="metric-card card-completed">
          <div class="metric-icon bg-green-tag">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">Completed</span>
            <span class="metric-value color-completed">${completedCount}</span>
          </div>
        </div>
      </div>

      <!-- MAIN DASHBOARD CONTENT (2 COLUMNS) -->
      <div class="dashboard-grid">
        <!-- UPCOMING MAINTENANCE TABLE -->
        <div class="card-box">
          <div class="card-box-header">
            <div>
              <h2 class="card-box-title">Upcoming & Due Maintenance</h2>
              <p class="card-box-desc">Pending scheduled asset services requiring attention</p>
            </div>
            <a href="#maintenance" class="btn btn-secondary btn-sm">View All Maintenance</a>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Store</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style="text-align: right; min-width: 175px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${
                  upcomingMaintenance.length === 0
                    ? `<tr><td colspan="5" class="empty-state">No pending maintenance found. All items up to date!</td></tr>`
                    : upcomingMaintenance.map(asset => `
                        <tr>
                          <td>
                            <div class="asset-cell">
                              <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" class="asset-thumb" alt="Asset" onerror="this.src=Utils.getDefaultAssetImage()" />
                              <div>
                                <strong class="asset-title-link" onclick="App.showAssetDetails('${asset.id}')">${Utils.escapeHtml(asset.name)}</strong>
                                <div class="text-subtle">${Utils.escapeHtml(asset.serialId)} • ${Utils.escapeHtml(asset.category)}</div>
                              </div>
                            </div>
                          </td>
                          <td>${Utils.escapeHtml(asset.storeName)}</td>
                          <td>
                            <strong>${Utils.formatDate(asset.dueDate)}</strong>
                            <div class="text-subtle">${Utils.getRelativeDateDisplay(asset.dueDate)}</div>
                          </td>
                          <td>
                            <span class="badge ${asset.statusInfo.badgeClass}">
                              ${asset.statusInfo.label}
                            </span>
                          </td>
                          <td style="text-align: right;">
                            <div class="action-btn-group">
                              <button class="btn btn-primary btn-sm" onclick="App.openOverrideModal('${asset.id}')">Complete</button>
                              <button class="btn btn-outline btn-sm" onclick="App.showAssetDetails('${asset.id}')">Details</button>
                            </div>
                          </td>
                        </tr>
                      `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- RECENT ACTIVITIES FEED -->
        <div class="card-box">
          <div class="card-box-header">
            <div>
              <h2 class="card-box-title">Recent Activities</h2>
              <p class="card-box-desc">Latest log updates across stores & maintenance</p>
            </div>
            <a href="#activity-logs" class="btn btn-secondary btn-sm">View All Logs</a>
          </div>

          <div class="activity-feed">
            ${
              activities.length === 0
                ? `<div class="empty-state">No recent activity logs.</div>`
                : activities.map(act => `
                    <div class="activity-item">
                      <div class="activity-icon-bullet"></div>
                      <div class="activity-content">
                        <div class="activity-header">
                          <span class="activity-action">${Utils.escapeHtml(act.action)}</span>
                          <span class="activity-time">${Utils.escapeHtml(act.date)} ${Utils.escapeHtml(act.time)}</span>
                        </div>
                        <p class="activity-details">${Utils.escapeHtml(act.details)}</p>
                        <div class="activity-meta">
                          <span>User: <strong>${Utils.escapeHtml(act.user)}</strong> (${Utils.escapeHtml(act.role)})</span>
                          <span>•</span>
                          <span>Store: ${Utils.escapeHtml(act.store)}</span>
                        </div>
                      </div>
                    </div>
                  `).join('')
            }
          </div>
        </div>
      </div>
    `;
  }
};
