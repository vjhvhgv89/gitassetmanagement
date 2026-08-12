/**
 * Employee Dashboard View
 * Simplified task checklist view for Store Employees to see assets assigned to their store and pending maintenance.
 */

const EmpDashboardView = {
  viewMode: 'list', // 'list' (List Form) or 'grid' (Grid Cards)

  setViewMode(mode) {
    this.viewMode = mode;
    App.renderCurrentView();
  },

  render() {
    const user = Auth.getUser();
    if (!user || !user.storeId) {
      return `<div class="empty-state">Error: Store session invalid. Please log in again.</div>`;
    }

    // STRICT SCOPING: Only assets assigned to logged in store
    const storeAssets = storage.getAssets()
      .filter(a => Utils.isAssetAssignedToUserStore(a, user))
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

      <!-- MY MAINTENANCE TASK LIST FORM -->
      <div class="card-box">
        <div class="card-box-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 class="card-box-title">My Maintenance Checklist</h2>
            <p class="card-box-desc">What do I need to do today for my store equipment?</p>
          </div>
          <div class="view-toggle-btns" style="display: flex; gap: 6px;">
            <button class="btn btn-sm ${this.viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}" onclick="EmpDashboardView.setViewMode('list')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              List Form
            </button>
            <button class="btn btn-sm ${this.viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}" onclick="EmpDashboardView.setViewMode('grid')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Grid View
            </button>
          </div>
        </div>

        ${this.viewMode === 'list' ? this.renderChecklistList(storeAssets, user) : this.renderChecklistGrid(storeAssets, todayStr)}
      </div>
    `;
  },

  renderChecklistList(storeAssets, user) {
    if (storeAssets.length === 0) {
      return `<div class="empty-state">No equipment currently assigned to ${Utils.escapeHtml(user.storeName)}.</div>`;
    }

    return `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px;">Photo</th>
              <th>Task / Equipment Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Scheduled Due Date</th>
              <th>Cycle</th>
              <th>Status</th>
              <th style="text-align: right; min-width: 170px;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${storeAssets.map(asset => `
              <tr class="${asset.isCompleted ? 'row-completed' : ''}">
                <td>
                  <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" style="width: 42px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;" alt="Thumb" onerror="this.src=Utils.getDefaultAssetImage()" />
                </td>
                <td>
                  <strong class="asset-title-link" style="font-size: 0.92rem;" onclick="EmpDetailsView.openModal('${asset.id}')">${Utils.escapeHtml(asset.name)}</strong>
                  <div class="text-subtle" style="font-size: 0.78rem;">ID: ${Utils.escapeHtml(asset.serialId)}</div>
                  ${asset.rejectionReason && !asset.isCompleted ? `
                    <div style="margin-top: 4px; font-size: 0.76rem; color: #991b1b; background: #fef2f2; border: 1px solid #fca5a5; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                      ⚠️ <strong>Admin Revision Requested:</strong> ${Utils.escapeHtml(asset.rejectionReason)}
                    </div>
                  ` : ''}
                </td>
                <td>
                  <span class="category-pill" style="font-size: 0.78rem;">${Utils.escapeHtml(asset.category)}</span>
                </td>
                <td>
                  <span class="text-subtle" style="font-size: 0.85rem;">📍 ${Utils.escapeHtml(asset.location)}</span>
                </td>
                <td>
                  <strong style="font-size: 0.88rem;">${Utils.formatDate(asset.dueDate)}</strong>
                  <div class="text-subtle" style="font-size: 0.78rem;">${Utils.getRelativeDateDisplay(asset.dueDate, asset.isCompleted)}</div>
                  <div class="text-subtle" style="font-size: 0.75rem; color: #2563eb;">Next: <strong>${Utils.formatDate(asset.nextDueDate || Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays))}</strong></div>
                </td>
                <td>
                  <span class="text-subtle" style="font-size: 0.82rem;">${Utils.escapeHtml(Utils.getCycleDisplay(asset))}</span>
                </td>
                <td>
                  <span class="badge ${asset.statusInfo.badgeClass}" style="font-size: 0.78rem;">${asset.statusInfo.label}</span>
                </td>
                <td style="text-align: right;">
                  <div class="action-btn-group" style="justify-content: flex-end; gap: 6px;">
                    ${
                      asset.isCompleted
                        ? `<span class="badge badge-completed" style="font-size: 0.78rem; padding: 6px 10px;">✓ Completed</span>`
                        : `<button class="btn btn-primary btn-sm" onclick="App.openEmpCompletionModal('${asset.id}')">Mark Completed</button>`
                    }
                    <button class="btn btn-outline btn-sm" onclick="EmpDetailsView.openModal('${asset.id}')">Details</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderChecklistGrid(storeAssets, todayStr) {
    if (storeAssets.length === 0) {
      return `<div class="empty-state">No equipment currently assigned to store.</div>`;
    }

    return `
      <div class="task-checklist-grid">
        ${storeAssets.map(asset => `
          <div class="task-card ${asset.isCompleted ? 'task-card-completed' : ''}">
            <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" class="task-img" alt="Asset Photo" onerror="this.src=Utils.getDefaultAssetImage()" />
            
            <div class="task-card-body">
              <div class="task-card-header">
                <span class="badge ${asset.statusInfo.badgeClass}">${asset.statusInfo.label}</span>
                <span class="category-pill">${Utils.escapeHtml(asset.category)}</span>
              </div>

              <h3 class="task-title" onclick="EmpDetailsView.openModal('${asset.id}')">${Utils.escapeHtml(asset.name)}</h3>
              <p class="task-location">📍 ${Utils.escapeHtml(asset.location)} (ID: ${Utils.escapeHtml(asset.serialId)})</p>

              ${asset.rejectionReason && !asset.isCompleted ? `
                <div style="margin-bottom: 12px; font-size: 0.82rem; padding: 8px 10px; border-radius: 6px; background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;">
                  ⚠️ <strong>Admin Revision Requested:</strong> ${Utils.escapeHtml(asset.rejectionReason)}
                </div>
              ` : ''}

              <div class="task-dates">
                <div>
                  <span class="spec-label">Scheduled Due Date:</span>
                  <strong>${Utils.formatDate(asset.dueDate)}</strong> (${Utils.getRelativeDateDisplay(asset.dueDate, asset.isCompleted)})
                </div>
                <div>
                  <span class="spec-label">Cycle:</span>
                  <span>${Utils.escapeHtml(Utils.getCycleDisplay(asset))}</span>
                </div>
                <div>
                  <span class="spec-label">Next Maintenance:</span>
                  <strong style="color: #2563eb;">${Utils.formatDate(asset.nextDueDate || Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays))}</strong>
                </div>
              </div>

              <div class="task-card-footer">
                ${
                  asset.isCompleted
                    ? `
                      <div class="completed-done-banner">
                        ✓ Maintenance Completed on ${Utils.formatDate(asset.lastCompletedDate)}
                        ${asset.lastCompletedBy ? `<div style="font-size: 0.78rem; font-weight: normal; margin-top: 2px;">By: ${Utils.escapeHtml(asset.lastCompletedBy)}</div>` : ''}
                      </div>
                      ${asset.cycle !== 'No Repeat' && asset.nextDueDate ? `
                        <button class="btn btn-sm btn-outline btn-block" style="margin-top: 8px;" onclick="App.advanceToNextCycle('${asset.id}')">
                          Start Next Cycle (Scheduled: ${Utils.formatDate(asset.nextDueDate)})
                        </button>
                      ` : ''}
                    `
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
        `).join('')}
      </div>
    `;
  }
};
