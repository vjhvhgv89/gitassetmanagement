/**
 * Employee Dashboard View
 * Simplified task checklist view for Store Employees to see assets assigned to their store and pending maintenance.
 */

const EmpDashboardView = {
  render() {
    const user = Auth.getUser();
    if (!user || !user.storeId) {
      return `<div class="empty-state">Error: Store session invalid. Please log in again.</div>`;
    }

    // Filter assets assigned STRICTLY to this store
    const allAssets = storage.getAssets();
    const storeAssets = allAssets
      .filter(a => a.storeId === user.storeId)
      .map(asset => ({
        ...asset,
        statusInfo: Utils.calculateStatus(asset)
      }));

    const totalAssets = storeAssets.length;
    let dueTodayCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    storeAssets.forEach(a => {
      if (a.statusInfo.key === 'COMPLETED') completedCount++;
      else if (a.statusInfo.key === 'DUE_TODAY') dueTodayCount++;
      else if (a.statusInfo.key === 'DUE_SOON') dueSoonCount++;
      else if (a.statusInfo.key === 'OVERDUE') overdueCount++;
    });

    const todayStr = Utils.getTodayStr();

    // Priority maintenance items: Overdue, Due Today, Due Soon first
    const pendingAssets = storeAssets.filter(a => !a.isCompleted);
    pendingAssets.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Store Maintenance Task List</h1>
          <p class="view-subtitle">Store: <strong>${Utils.escapeHtml(user.storeName)}</strong> (${Utils.escapeHtml(user.storeCode)})</p>
        </div>
      </div>

      <!-- EMPLOYEE SUMMARY METRIC CARDS -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon bg-blue-light">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          </div>
          <div class="metric-info">
            <span class="metric-label">My Store Assets</span>
            <span class="metric-value">${totalAssets}</span>
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

      <!-- MY MAINTENANCE TASK LIST -->
      <div class="card-box">
        <div class="card-box-header">
          <div>
            <h2 class="card-box-title">My Maintenance Checklist</h2>
            <p class="card-box-desc">What do I need to do today for my store equipment?</p>
          </div>
        </div>

        <div class="task-checklist-grid">
          ${
            storeAssets.length === 0
              ? `<div class="empty-state">No equipment currently assigned to ${Utils.escapeHtml(user.storeName)}.</div>`
              : storeAssets.map(asset => {
                  // DATE VALIDATION RULE: Employee CANNOT complete maintenance before scheduled date
                  // Today < Scheduled Date
                  const isFutureDate = new Date(asset.dueDate) > new Date(todayStr);
                  const canComplete = !asset.isCompleted && !isFutureDate;

                  return `
                    <div class="task-card ${asset.isCompleted ? 'task-card-completed' : ''}">
                      <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" class="task-img" alt="Asset Photo" onerror="this.src=Utils.getDefaultAssetImage()" />
                      
                      <div class="task-card-body">
                        <div class="task-card-header">
                          <span class="badge ${asset.statusInfo.badgeClass}">${asset.statusInfo.label}</span>
                          <span class="category-pill">${Utils.escapeHtml(asset.category)}</span>
                        </div>

                        <h3 class="task-title" onclick="EmpDetailsView.openModal('${asset.id}')">${Utils.escapeHtml(asset.name)}</h3>
                        <p class="task-location">📍 ${Utils.escapeHtml(asset.location)} (ID: ${Utils.escapeHtml(asset.serialId)})</p>

                        <div class="task-dates">
                          <div>
                            <span class="spec-label">Scheduled Due Date:</span>
                            <strong>${Utils.formatDate(asset.dueDate)}</strong> (${Utils.getRelativeDateDisplay(asset.dueDate, asset.isCompleted)})
                          </div>
                          <div>
                            <span class="spec-label">Cycle:</span>
                            <span>${Utils.escapeHtml(asset.cycle)}</span>
                          </div>
                        </div>

                        <div class="task-card-footer">
                          ${
                            asset.isCompleted
                              ? `<div class="completed-done-banner">✓ Completed on ${Utils.formatDate(asset.lastCompletedDate)}</div>`
                              : `
                                <button class="btn btn-primary btn-block" onclick="App.openEmpCompletionModal('${asset.id}')">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                  Mark as Completed
                                </button>
                              `
                          }

                          <button class="btn btn-outline btn-block" style="margin-top: 8px;" onclick="EmpDetailsView.openModal('${asset.id}')">
                            View Details & Discussion
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')
          }
        </div>
      </div>
    `;
  }
};
