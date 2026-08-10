/**
 * Store Employee "My Assets" View Component
 * Scoped asset catalog showing only equipment assigned to the logged-in store.
 */

const EmpAssetsView = {
  searchQuery: '',
  filterCategory: 'ALL',
  filterStatus: 'ALL',

  render() {
    const user = Auth.getUser();
    if (!user || !user.storeId) {
      return `<div class="empty-state">Store session invalid. Please log in again.</div>`;
    }

    // STRICT SCOPING: Only assets for logged in store
    let assets = storage.getAssets().filter(a => a.storeId === user.storeId);

    assets = assets.map(a => ({
      ...a,
      statusInfo: Utils.calculateStatus(a)
    }));

    const categories = Array.from(new Set(assets.map(a => a.category))).filter(Boolean);

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      assets = assets.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.serialId.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      );
    }

    // Filters
    if (this.filterCategory !== 'ALL') {
      assets = assets.filter(a => a.category === this.filterCategory);
    }
    if (this.filterStatus !== 'ALL') {
      assets = assets.filter(a => a.statusInfo.key === this.filterStatus);
    }

    const todayStr = Utils.getTodayStr();

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">My Store Equipment</h1>
          <p class="view-subtitle">Store: <strong>${Utils.escapeHtml(user.storeName)}</strong> • Total Assets: ${assets.length}</p>
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
              placeholder="Search assets by name, ID, or area..." 
              value="${Utils.escapeHtml(this.searchQuery)}"
              oninput="EmpAssetsView.handleSearch(this.value)"
            />
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Category:</label>
            <select class="form-control" onchange="EmpAssetsView.handleFilterCategory(this.value)">
              <option value="ALL" ${this.filterCategory === 'ALL' ? 'selected' : ''}>All Categories</option>
              ${categories.map(c => `<option value="${c}" ${this.filterCategory === c ? 'selected' : ''}>${Utils.escapeHtml(c)}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Status:</label>
            <select class="form-control" onchange="EmpAssetsView.handleFilterStatus(this.value)">
              <option value="ALL" ${this.filterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="OVERDUE" ${this.filterStatus === 'OVERDUE' ? 'selected' : ''}>Overdue (Red)</option>
              <option value="DUE_TODAY" ${this.filterStatus === 'DUE_TODAY' ? 'selected' : ''}>Due Today (Blue)</option>
              <option value="DUE_SOON" ${this.filterStatus === 'DUE_SOON' ? 'selected' : ''}>Due Soon (Orange)</option>
              <option value="UPCOMING" ${this.filterStatus === 'UPCOMING' ? 'selected' : ''}>Upcoming (Gray)</option>
              <option value="COMPLETED" ${this.filterStatus === 'COMPLETED' ? 'selected' : ''}>Completed (Green)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- MY ASSETS CARDS GRID -->
      <div class="task-checklist-grid">
        ${
          assets.length === 0
            ? `<div class="empty-state">No equipment matches your search filter.</div>`
            : assets.map(asset => {
                const isFutureDate = new Date(asset.dueDate) > new Date(todayStr);

                return `
                  <div class="task-card">
                    <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" class="task-img" alt="Asset Photo" onerror="this.src=Utils.getDefaultAssetImage()" />
                    
                    <div class="task-card-body">
                      <div class="task-card-header">
                        <span class="badge ${asset.statusInfo.badgeClass}">${asset.statusInfo.label}</span>
                        <span class="condition-tag condition-${asset.condition.toLowerCase().replace(/\s+/g, '-')}">${Utils.escapeHtml(asset.condition)}</span>
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
                          <span class="spec-label">Category:</span>
                          <strong>${Utils.escapeHtml(asset.category)}</strong>
                        </div>
                        <div>
                          <span class="spec-label">Scheduled Date:</span>
                          <strong>${Utils.formatDate(asset.dueDate)}</strong>
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
                                Mark as Completed
                              </button>
                            `
                        }
                        <button class="btn btn-outline btn-block" style="margin-top: 8px;" onclick="EmpDetailsView.openModal('${asset.id}')">
                          View Details & History
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')
        }
      </div>
    `;
  },

  handleSearch(val) {
    this.searchQuery = val;
    App.renderCurrentView();
  },

  handleFilterCategory(val) {
    this.filterCategory = val;
    App.renderCurrentView();
  },

  handleFilterStatus(val) {
    this.filterStatus = val;
    App.renderCurrentView();
  }
};
