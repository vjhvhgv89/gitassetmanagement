/**
 * Store Employee Profile View Component (100% Read-Only)
 * Store Employees can view their assigned profile information, but CANNOT edit profile or password credentials.
 * Only System Admin can edit store profiles or reset passwords.
 */

const EmpProfileView = {
  render() {
    const user = Auth.getUser();
    if (!user) {
      return `<div class="empty-state">Session expired. Please log in again.</div>`;
    }

    const store = storage.getStores().find(s => s.id === user.storeId) || {};

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Store Staff Profile</h1>
          <p class="view-subtitle">Assigned profile specifications for <strong>${Utils.escapeHtml(user.storeName)}</strong></p>
        </div>
      </div>

      <div class="card-box" style="max-width: 720px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <h3 class="card-box-title">Account & Location Specifications</h3>
          <span class="badge badge-completed">Read-Only Employee Access</span>
        </div>

        <div class="spec-grid-2col" style="gap: 20px; margin-bottom: 24px;">
          <div>
            <span class="spec-label">Assigned Employee / Manager:</span>
            <strong class="spec-val" style="font-size: 1.05rem;">${Utils.escapeHtml(user.name)}</strong>
          </div>
          <div>
            <span class="spec-label">Assigned Store Name:</span>
            <strong class="spec-val" style="font-size: 1.05rem;">${Utils.escapeHtml(user.storeName)}</strong>
          </div>
          <div>
            <span class="spec-label">Store Code:</span>
            <strong class="code-badge" style="font-size: 0.95rem;">${Utils.escapeHtml(user.storeCode || store.code || 'N/A')}</strong>
          </div>
          <div>
            <span class="spec-label">Account Username:</span>
            <strong class="spec-val"><code>${Utils.escapeHtml(user.username)}</code></strong>
          </div>
          <div>
            <span class="spec-label">Permission Role:</span>
            <span class="badge badge-due-today">Store Employee</span>
          </div>
          <div>
            <span class="spec-label">Manager Email:</span>
            <span class="spec-val">${Utils.escapeHtml(store.email || 'N/A')}</span>
          </div>
          <div>
            <span class="spec-label">Account Status:</span>
            <span class="badge badge-completed">${Utils.escapeHtml(store.status || 'Active')}</span>
          </div>
          <div>
            <span class="spec-label">Account Creation Date:</span>
            <span class="spec-val">${Utils.formatDate(store.createdAt ? store.createdAt.split('T')[0] : Utils.getTodayStr())}</span>
          </div>
        </div>

        <!-- READ ONLY SECURITY NOTICE BANNER -->
        <div style="padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); display: flex; align-items: flex-start; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem;">Admin Managed Profile</strong>
            <p style="margin: 4px 0 0 0; font-size: 0.88rem; color: #475569;">
              Store staff cannot edit profile details or change account passwords. All store profile configurations, manager names, and password resets are managed exclusively by the System Admin.
            </p>
            <p style="margin: 6px 0 0 0; font-size: 0.84rem; color: #64748b;">
              To request changes to your name, email, or password, please contact your System Administrator.
            </p>
          </div>
        </div>
      </div>
    `;
  }
};
