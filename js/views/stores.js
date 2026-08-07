/**
 * Store Management View
 * Manage store employee accounts (Create, Edit, Reset Password, Activate, Deactivate, Delete).
 */

const StoresView = {
  searchQuery: '',
  statusFilter: 'ALL',

  render() {
    let stores = storage.getStores();

    // Filtering
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      stores = stores.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.managerName && s.managerName.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }

    if (this.statusFilter !== 'ALL') {
      stores = stores.filter(s => s.status === this.statusFilter);
    }

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Store Management</h1>
          <p class="view-subtitle">Manage store locations and store manager accounts.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="StoresView.openStoreModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Create Store Account
          </button>
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="card-box" style="margin-bottom: 24px;">
        <div class="filter-toolbar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              class="form-control search-field" 
              placeholder="Search store name, code, manager, or username..." 
              value="${Utils.escapeHtml(this.searchQuery)}"
              oninput="StoresView.handleSearch(this.value)"
            />
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Status:</label>
            <select class="form-control" onchange="StoresView.handleFilterStatus(this.value)">
              <option value="ALL" ${this.statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="Active" ${this.statusFilter === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${this.statusFilter === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <!-- STORE TABLE -->
      <div class="card-box">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Store Code</th>
                <th>Store Name</th>
                <th>Manager & Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Date Created</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                stores.length === 0
                  ? `<tr><td colspan="7" class="empty-state">No store accounts found matching your criteria.</td></tr>`
                  : stores.map(store => `
                      <tr>
                        <td><strong class="code-badge">${Utils.escapeHtml(store.code)}</strong></td>
                        <td>
                          <strong>${Utils.escapeHtml(store.name)}</strong>
                        </td>
                        <td>
                          <div>${Utils.escapeHtml(store.managerName || 'Not Assigned')}</div>
                          <div class="text-subtle">User: <code>${Utils.escapeHtml(store.username)}</code></div>
                        </td>
                        <td>${Utils.escapeHtml(store.email || 'N/A')}</td>
                        <td>
                          <span class="badge ${store.status === 'Active' ? 'badge-completed' : 'badge-upcoming'}">
                            ${store.status}
                          </span>
                        </td>
                        <td>${Utils.formatDate(store.createdAt.split('T')[0])}</td>
                        <td style="text-align: right;">
                          <div class="action-btn-group">
                            ${
                              store.status === 'Active'
                                ? `<button class="btn btn-secondary btn-sm" title="Deactivate" onclick="StoresView.toggleStatus('${store.id}', 'Inactive')">Deactivate</button>`
                                : `<button class="btn btn-primary btn-sm" title="Activate" onclick="StoresView.toggleStatus('${store.id}', 'Active')">Activate</button>`
                            }
                            <button class="btn btn-outline btn-sm" title="Edit Store" onclick="StoresView.openStoreModal('${store.id}')">Edit</button>
                            <button class="btn btn-outline btn-sm" title="Reset Password" onclick="StoresView.promptResetPassword('${store.id}')">Reset Pass</button>
                            <button class="btn btn-danger btn-sm" title="Delete Store" onclick="StoresView.deleteStore('${store.id}')">Delete</button>
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

  handleSearch(val) {
    this.searchQuery = val;
    App.renderCurrentView();
  },

  handleFilterStatus(val) {
    this.statusFilter = val;
    App.renderCurrentView();
  },

  toggleStatus(storeId, newStatus) {
    const store = storage.getStores().find(s => s.id === storeId);
    if (store) {
      store.status = newStatus;
      storage.saveStore(store);
      storage.logActivity(`Store Account ${newStatus}`, `Changed store ${store.name} status to ${newStatus}.`, store.name, 'N/A');
      Utils.showToast(`Store ${store.name} is now ${newStatus}.`, 'success');
      App.renderCurrentView();
    }
  },

  deleteStore(storeId) {
    const store = storage.getStores().find(s => s.id === storeId);
    if (!store) return;
    if (confirm(`Are you sure you want to delete store "${store.name}" (${store.code})? This action cannot be undone.`)) {
      storage.deleteStore(storeId);
      storage.logActivity('Store Deleted', `Deleted store account for ${store.name} (${store.code}).`, store.name, 'N/A');
      Utils.showToast(`Store "${store.name}" deleted successfully.`, 'info');
      App.renderCurrentView();
    }
  },

  promptResetPassword(storeId) {
    const store = storage.getStores().find(s => s.id === storeId);
    if (!store) return;

    const newPass = prompt(`Reset Password for store username "${store.username}" (${store.name}):`, 'newpass123');
    if (newPass !== null && newPass.trim() !== '') {
      store.password = newPass.trim();
      storage.saveStore(store);
      storage.logActivity('Admin Reset Store Password', `Reset password for store account username: ${store.username}`, store.name, 'N/A');
      Utils.showToast(`Password for "${store.name}" updated successfully!`, 'success');
    }
  },

  openStoreModal(storeId = null) {
    const store = storeId ? storage.getStores().find(s => s.id === storeId) : null;
    const isEdit = !!store;

    const modalHtml = `
      <div class="modal-overlay" id="storeModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>${isEdit ? 'Edit Store Account' : 'Create Store Account'}</h3>
            <button class="modal-close-btn" onclick="App.closeModal('storeModal')">&times;</button>
          </div>
          <form onsubmit="StoresView.handleSaveStore(event, '${storeId || ''}')">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Store Code <span class="required">*</span></label>
                  <input type="text" id="storeCode" class="form-control" required placeholder="e.g. STR-105" value="${Utils.escapeHtml(store ? store.code : '')}" />
                  <small class="form-help">Must be unique per store.</small>
                </div>

                <div class="form-group">
                  <label class="form-label">Store Name <span class="required">*</span></label>
                  <input type="text" id="storeName" class="form-control" required placeholder="e.g. Eastside Plaza Outlet" value="${Utils.escapeHtml(store ? store.name : '')}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Account Username <span class="required">*</span></label>
                  <input type="text" id="storeUsername" class="form-control" required placeholder="e.g. store_eastside" value="${Utils.escapeHtml(store ? store.username : '')}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Account Password <span class="required">*</span></label>
                  <input type="text" id="storePassword" class="form-control" required placeholder="Enter password" value="${Utils.escapeHtml(store ? store.password : 'password123')}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Store Manager Name (Optional)</label>
                  <input type="text" id="storeManager" class="form-control" placeholder="e.g. John Doe" value="${Utils.escapeHtml(store ? store.managerName || '' : '')}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Manager Email (Optional)</label>
                  <input type="email" id="storeEmail" class="form-control" placeholder="e.g. manager@store.com" value="${Utils.escapeHtml(store ? store.email || '' : '')}" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">Account Status</label>
                  <select id="storeStatus" class="form-control">
                    <option value="Active" ${!store || store.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Inactive" ${store && store.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('storeModal')">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Update Store' : 'Create Store'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    App.showModal(modalHtml);
  },

  handleSaveStore(event, storeId) {
    event.preventDefault();
    const code = document.getElementById('storeCode').value.trim();
    const name = document.getElementById('storeName').value.trim();
    const username = document.getElementById('storeUsername').value.trim();
    const password = document.getElementById('storePassword').value.trim();
    const managerName = document.getElementById('storeManager').value.trim();
    const email = document.getElementById('storeEmail').value.trim();
    const status = document.getElementById('storeStatus').value;

    const allStores = storage.getStores();

    // Check unique Store Code rule
    const codeExists = allStores.some(s => s.code.toLowerCase() === code.toLowerCase() && s.id !== storeId);
    if (codeExists) {
      alert(`Error: Store Code "${code}" is already in use by another store. Store Code must be unique!`);
      return;
    }

    const storeObj = {
      id: storeId || undefined,
      code,
      name,
      username,
      password,
      managerName,
      email,
      status
    };

    storage.saveStore(storeObj);
    const actionName = storeId ? 'Admin Edited Store' : 'Admin Created Store';
    storage.logActivity(actionName, `${actionName}: ${name} (${code})`, name, 'N/A');
    
    Utils.showToast(`Store account "${name}" saved successfully!`, 'success');
    App.closeModal('storeModal');
    App.renderCurrentView();
  }
};
