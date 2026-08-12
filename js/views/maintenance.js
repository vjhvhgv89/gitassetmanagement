/**
 * Maintenance Monitoring View Component
 * Monitor asset service schedules with Filter tabs, Table view, and interactive Calendar view.
 */

const MaintenanceView = {
  activeTab: 'ALL', // ALL, UPCOMING, DUE_SOON, DUE_TODAY, OVERDUE, COMPLETED
  viewMode: 'table', // table or calendar
  calendarMonth: 7, // 0-indexed (7 = August)
  calendarYear: 2026,

  render() {
    let assets = storage.getAssets();

    // Map computed status
    assets = assets.map(asset => ({
      ...asset,
      statusInfo: Utils.calculateStatus(asset),
      nextDueDate: Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays)
    }));

    // Tab Filter
    if (this.activeTab !== 'ALL') {
      assets = assets.filter(a => a.statusInfo.key === this.activeTab);
    }

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Maintenance Monitoring</h1>
          <p class="view-subtitle">Track scheduled, overdue, and completed asset maintenance cycles.</p>
        </div>
        <div class="header-actions">
          <div class="view-toggle-btns">
            <button class="btn ${this.viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}" onclick="MaintenanceView.setViewMode('table')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Table View
            </button>
            <button class="btn ${this.viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}" onclick="MaintenanceView.setViewMode('calendar')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Calendar View
            </button>
          </div>
        </div>
      </div>

      <!-- FILTER TABS -->
      <div class="maintenance-tabs">
        <button class="tab-btn ${this.activeTab === 'ALL' ? 'active' : ''}" onclick="MaintenanceView.setTab('ALL')">
          All Schedules
        </button>
        <button class="tab-btn tab-overdue ${this.activeTab === 'OVERDUE' ? 'active' : ''}" onclick="MaintenanceView.setTab('OVERDUE')">
          Overdue <span class="tab-badge bg-red-tag">Red</span>
        </button>
        <button class="tab-btn tab-due-today ${this.activeTab === 'DUE_TODAY' ? 'active' : ''}" onclick="MaintenanceView.setTab('DUE_TODAY')">
          Due Today <span class="tab-badge bg-blue-tag">Blue</span>
        </button>
        <button class="tab-btn tab-due-soon ${this.activeTab === 'DUE_SOON' ? 'active' : ''}" onclick="MaintenanceView.setTab('DUE_SOON')">
          Due Soon <span class="tab-badge bg-orange-tag">Orange</span>
        </button>
        <button class="tab-btn tab-upcoming ${this.activeTab === 'UPCOMING' ? 'active' : ''}" onclick="MaintenanceView.setTab('UPCOMING')">
          Upcoming <span class="tab-badge bg-gray-tag">Gray</span>
        </button>
        <button class="tab-btn tab-completed ${this.activeTab === 'COMPLETED' ? 'active' : ''}" onclick="MaintenanceView.setTab('COMPLETED')">
          Completed <span class="tab-badge bg-green-tag">Green</span>
        </button>
      </div>

      ${this.viewMode === 'table' ? this.renderTable(assets) : this.renderCalendar(assets)}
    `;
  },

  setTab(tab) {
    this.activeTab = tab;
    App.renderCurrentView();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    App.renderCurrentView();
  },

  renderTable(assets) {
    return `
      <div class="card-box">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Store</th>
                <th>Maintenance Cycle</th>
                <th>Current Scheduled Due Date</th>
                <th>Status</th>
                <th>Last Completed</th>
                <th>Next Schedule</th>
                <th style="text-align: right; min-width: 175px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${assets.length === 0
        ? `<tr><td colspan="8" class="empty-state">No maintenance records found for selected filter tab.</td></tr>`
        : assets.map(asset => `
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
                        <td>
                          <strong>${Utils.escapeHtml(asset.storeName)}</strong>
                          <div class="text-subtle">${Utils.escapeHtml(asset.location)}</div>
                        </td>
                        <td>${Utils.escapeHtml(Utils.getCycleDisplay(asset))}</td>
                        <td>
                          <strong>${Utils.formatDate(asset.dueDate)}</strong>
                          <div class="text-subtle">${Utils.getRelativeDateDisplay(asset.dueDate, asset.isCompleted)}</div>
                        </td>
                        <td>
                          <span class="badge ${asset.statusInfo.badgeClass}">
                            ${asset.statusInfo.label}
                          </span>
                        </td>
                        <td>
                          <div>${Utils.formatDate(asset.lastCompletedDate)}</div>
                          ${(asset.lastProofPhoto || asset.lastCompletedBy) ? `
                            <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                              ${asset.lastProofPhoto ? `
                                <img src="${Utils.escapeHtml(asset.lastProofPhoto)}" style="width: 28px; height: 28px; border-radius: 4px; object-fit: cover; cursor: pointer; border: 1px solid #cbd5e1; transition: transform 0.15s ease;" title="Click to view full uploaded proof photo" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onclick="App.openImageModal('${Utils.escapeHtml(asset.lastProofPhoto.replace(/'/g, "\\'"))}')" />
                              ` : ''}
                              <span class="text-subtle" style="font-size: 0.74rem;">${Utils.escapeHtml(asset.lastCompletedBy || '')}</span>
                            </div>
                          ` : ''}
                        </td>
                        <td>${asset.cycle === 'No Repeat' ? 'No Repeat' : Utils.formatDate(asset.nextDueDate)}</td>
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
    `;
  },

  renderCalendar(assets) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const year = this.calendarYear;
    const month = this.calendarMonth;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map assets by date string in this month
    const assetsByDate = {};
    assets.forEach(asset => {
      if (asset.dueDate) {
        if (!assetsByDate[asset.dueDate]) assetsByDate[asset.dueDate] = [];
        assetsByDate[asset.dueDate].push(asset);
      }
    });

    let calendarDaysHtml = '';
    // Empty prefix padding
    for (let i = 0; i < firstDay; i++) {
      calendarDaysHtml += `<div class="calendar-day day-empty"></div>`;
    }

    const todayStr = Utils.getTodayStr();

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAssets = assetsByDate[dateStr] || [];
      const isToday = dateStr === todayStr;

      calendarDaysHtml += `
        <div class="calendar-day ${isToday ? 'day-today' : ''}">
          <div class="day-number">${day} ${isToday ? '<span class="today-tag">Today</span>' : ''}</div>
          <div class="day-events">
            ${dayAssets.map(ast => `
              <div class="calendar-event-pill event-${ast.statusInfo.key.toLowerCase()}" onclick="App.showAssetDetails('${ast.id}')" title="${Utils.escapeHtml(ast.name)} (${Utils.escapeHtml(ast.storeName)})">
                <span class="event-dot"></span>
                <span class="event-title">${Utils.escapeHtml(ast.name)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="card-box">
        <div class="calendar-header">
          <div class="calendar-title">
            <h2>${monthNames[month]} ${year}</h2>
          </div>
          <div class="calendar-nav">
            <button class="btn btn-secondary btn-sm" onclick="MaintenanceView.changeMonth(-1)">‹ Prev Month</button>
            <button class="btn btn-secondary btn-sm" onclick="MaintenanceView.changeMonth(1)">Next Month ›</button>
          </div>
        </div>

        <div class="calendar-grid">
          <div class="calendar-day-header">Sun</div>
          <div class="calendar-day-header">Mon</div>
          <div class="calendar-day-header">Tue</div>
          <div class="calendar-day-header">Wed</div>
          <div class="calendar-day-header">Thu</div>
          <div class="calendar-day-header">Fri</div>
          <div class="calendar-day-header">Sat</div>
          ${calendarDaysHtml}
        </div>
      </div>
    `;
  },

  changeMonth(dir) {
    this.calendarMonth += dir;
    if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    } else if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    }
    App.renderCurrentView();
  }
};
