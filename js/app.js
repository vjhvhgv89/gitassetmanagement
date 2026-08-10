/**
 * Main Application Controller (App)
 * Router, Role-based shell manager (Admin vs Store Employee), Modal Controller, and Maintenance Completion Engine.
 */

const App = {
  currentRoute: 'dashboard',

  init() {
    if (!Auth.isLoggedIn()) {
      this.showLoginScreen();
    } else if (Auth.isAdmin()) {
      this.showAdminAppShell();
      this.initRouter();
    } else if (Auth.isEmployee()) {
      this.showEmployeeAppShell();
      this.initRouter();
    }

    // Hash change listener
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  // ----------------------------------------------------
  // LOGIN / PORTAL SHELL CONTROLLER
  // ----------------------------------------------------
  showLoginScreen() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('admin-app-shell').style.display = 'none';
    const empShell = document.getElementById('employee-app-shell');
    if (empShell) empShell.style.display = 'none';
  },

  showAdminAppShell() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('admin-app-shell').style.display = 'flex';
    const empShell = document.getElementById('employee-app-shell');
    if (empShell) empShell.style.display = 'none';
    this.updateHeaderUserInfo();
    this.updateUnreadCountBadge();
  },

  showEmployeeAppShell() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('admin-app-shell').style.display = 'none';
    const empShell = document.getElementById('employee-app-shell');
    if (empShell) empShell.style.display = 'flex';
    this.updateEmpHeaderUserInfo();
    this.updateEmpUnreadCountBadge();
  },

  handleLogin(event) {
    event.preventDefault();
    const userEl = document.getElementById('loginUsername');
    const passEl = document.getElementById('loginPassword');
    const errEl = document.getElementById('loginErrorMsg');

    const result = Auth.login(userEl.value, passEl.value);
    if (result.success) {
      errEl.style.display = 'none';
      if (result.role === 'Admin') {
        Utils.showToast('Welcome back, System Admin!', 'success');
        this.showAdminAppShell();
        window.location.hash = '#dashboard';
      } else {
        const user = Auth.getUser();
        Utils.showToast(`Welcome back, ${user.name}!`, 'success');
        this.showEmployeeAppShell();
        window.location.hash = '#emp-dashboard';
      }
      this.handleRoute();
    } else {
      errEl.textContent = result.message;
      errEl.style.display = 'block';
    }
  },

  togglePasswordVisibility() {
    const passEl = document.getElementById('loginPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passEl.type === 'password') {
      passEl.type = 'text';
      eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    } else {
      passEl.type = 'password';
      eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  },

  // ----------------------------------------------------
  // ROUTING & PERMISSION CONTROL
  // ----------------------------------------------------
  initRouter() {
    let rawHash = window.location.hash.replace('#', '');
    if (!rawHash) {
      window.location.hash = Auth.isAdmin() ? '#dashboard' : '#emp-dashboard';
    } else {
      this.handleRoute();
    }
  },

  handleRoute() {
    if (!Auth.isLoggedIn()) {
      this.showLoginScreen();
      return;
    }

    let rawHash = window.location.hash.replace('#', '');
    if (rawHash === 'logout') {
      Auth.logout();
      this.showLoginScreen();
      return;
    }

    // SECURITY CHECK: Employee cannot access Admin routes
    const adminOnlyRoutes = ['dashboard', 'stores', 'assets', 'maintenance', 'activity-logs', 'reports', 'settings'];
    if (Auth.isEmployee() && adminOnlyRoutes.includes(rawHash)) {
      Utils.showToast('Access Denied: Admin privileges required.', 'error');
      window.location.hash = '#emp-dashboard';
      return;
    }

    // SECURITY CHECK: Admin accessing employee default hash
    if (Auth.isAdmin() && rawHash.startsWith('emp-')) {
      window.location.hash = '#dashboard';
      return;
    }

    this.currentRoute = rawHash || (Auth.isAdmin() ? 'dashboard' : 'emp-dashboard');
    this.updateSidebarActiveState(this.currentRoute);
    this.renderCurrentView();
  },

  updateSidebarActiveState(route) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${route}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  toggleMobileSidebar() {
    const adminSidebar = document.querySelector('#admin-app-shell .sidebar');
    const empSidebar = document.querySelector('#employee-app-shell .sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    const targetSidebar = Auth.isAdmin() ? adminSidebar : empSidebar;
    if (targetSidebar) {
      targetSidebar.classList.toggle('sidebar-open');
      if (overlay) overlay.classList.toggle('active');
    }
  },

  closeMobileSidebar() {
    document.querySelectorAll('.sidebar').forEach(sb => sb.classList.remove('sidebar-open'));
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  renderCurrentView() {
    this.closeMobileSidebar();
    const container = Auth.isAdmin()
      ? document.getElementById('main-content')
      : document.getElementById('emp-main-content');

    if (!container) return;

    switch (this.currentRoute) {
      // ADMIN VIEWS
      case 'dashboard':
        container.innerHTML = DashboardView.render();
        break;
      case 'stores':
        container.innerHTML = StoresView.render();
        break;
      case 'assets':
        container.innerHTML = AssetsView.render();
        break;
      case 'maintenance':
        container.innerHTML = MaintenanceView.render();
        break;
      case 'notifications':
        container.innerHTML = NotificationsView.render();
        break;
      case 'activity-logs':
        container.innerHTML = ActivityLogsView.render();
        break;
      case 'reports':
        container.innerHTML = ReportsView.render();
        break;
      case 'settings':
        container.innerHTML = SettingsView.render();
        break;

      // STORE EMPLOYEE VIEWS
      case 'emp-dashboard':
        container.innerHTML = EmpDashboardView.render();
        break;
      case 'emp-assets':
        container.innerHTML = EmpAssetsView.render();
        break;
      case 'emp-notifications':
        container.innerHTML = EmpNotificationsView.render();
        break;
      case 'emp-profile':
        container.innerHTML = EmpProfileView.render();
        break;

      default:
        container.innerHTML = Auth.isAdmin() ? DashboardView.render() : EmpDashboardView.render();
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateHeaderUserInfo() {
    const user = Auth.getUser();
    const settings = storage.getSettings();
    const nameEl = document.getElementById('headerAdminName');
    const titleEl = document.getElementById('headerSystemTitle');
    if (nameEl) nameEl.textContent = settings.adminName || (user ? user.name : 'System Admin');
    if (titleEl) titleEl.textContent = settings.systemTitle || 'Simple Asset Management System - Admin';
  },

  updateEmpHeaderUserInfo() {
    const user = Auth.getUser();
    const nameEl = document.getElementById('headerEmpName');
    const storeEl = document.getElementById('headerEmpStore');
    if (nameEl && user) nameEl.textContent = user.name;
    if (storeEl && user) storeEl.textContent = `${user.storeName} (${user.storeCode})`;
  },

  updateUnreadCountBadge() {
    const notifs = storage.getNotifications();
    const unread = notifs.filter(n => !n.isRead).length;
    const badgeEl = document.getElementById('headerNotifBadge');
    if (badgeEl) {
      if (unread > 0) {
        badgeEl.textContent = unread;
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  },

  updateEmpUnreadCountBadge() {
    const user = Auth.getUser();
    if (!user) return;
    const notifs = storage.getNotifications().filter(n => !n.storeName || n.storeName === user.storeName || n.storeName === 'All Stores');
    const unread = notifs.filter(n => !n.isRead).length;
    const badgeEl = document.getElementById('headerEmpNotifBadge');
    if (badgeEl) {
      if (unread > 0) {
        badgeEl.textContent = unread;
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  },

  // ----------------------------------------------------
  // MODAL MANAGER
  // ----------------------------------------------------
  showModal(htmlContent) {
    this.closeAllModals();
    const wrapper = document.getElementById('modal-container');
    wrapper.innerHTML = htmlContent;
    document.body.style.overflow = 'hidden';
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
  },

  closeAllModals() {
    const wrapper = document.getElementById('modal-container');
    if (wrapper) wrapper.innerHTML = '';
    document.body.style.overflow = 'auto';
  },

  showAssetDetails(assetId) {
    if (Auth.isAdmin()) {
      const html = AssetDetailsView.renderModal(assetId);
      if (html) this.showModal(html);
    } else {
      EmpDetailsView.openModal(assetId);
    }
  },

  // ----------------------------------------------------
  // ADMIN OVERRIDE MODAL
  // ----------------------------------------------------
  openOverrideModal(assetId) {
    const asset = storage.getAssetById(assetId);
    if (!asset) return;

    const todayStr = Utils.getTodayStr();
    const history = storage.getMaintenanceHistory(asset.id || assetId);
    const latestRecord = history[0];

    const storeObj = storage.getStores().find(s => s.id === asset.storeId || s.name === asset.storeName);
    const storeManagerFallback = storeObj && storeObj.managerName ? `${storeObj.managerName} (${storeObj.name})` : '';
    const fallbackWorker = asset.lastCompletedBy || storeManagerFallback || 'Mario (Store Staff)';

    const defaultDate = (latestRecord && latestRecord.completedDate) ? latestRecord.completedDate : (asset.lastCompletedDate && asset.lastCompletedDate !== 'None' ? asset.lastCompletedDate : todayStr);
    const defaultWorker = (latestRecord && latestRecord.completedBy) ? latestRecord.completedBy : fallbackWorker;
    const defaultComments = (latestRecord && latestRecord.comments) ? latestRecord.comments : (asset.description || '');
    const defaultPhoto = (latestRecord && latestRecord.photos && latestRecord.photos[0]) ? latestRecord.photos[0] : asset.lastProofPhoto;

    const isEarly = new Date(asset.dueDate) > new Date(todayStr);

    const modalHtml = `
      <div class="modal-overlay" id="overrideModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Review / Complete Maintenance Task</h3>
            <button class="modal-close-btn" onclick="App.closeModal('overrideModal')">&times;</button>
          </div>
          <form onsubmit="App.handleSaveOverride(event, '${asset.id}')">
            <div class="modal-body">
              ${
                latestRecord ? `
                  <div class="alert-info-box" style="margin-bottom: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 12px; border-radius: 8px; font-size: 0.88rem;">
                    ✓ <strong>Employee Submitted Task Auto-Loaded:</strong> Showing data submitted by <strong>${Utils.escapeHtml(defaultWorker)}</strong> on <strong>${Utils.formatDate(defaultDate)}</strong>.
                  </div>
                ` : isEarly ? `
                  <div class="alert-warning-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                      <strong>Early Completion Notice:</strong>
                      <p style="margin: 2px 0 0 0; font-size: 0.88rem;">Scheduled for <strong>${Utils.formatDate(asset.dueDate)}</strong>.</p>
                    </div>
                  </div>
                ` : `
                  <p style="font-size: 0.95rem; color: #374151;">Reviewing service for <strong>${Utils.escapeHtml(asset.name)}</strong> (${Utils.escapeHtml(asset.storeName)}).</p>
                `
              }

              <div class="form-group" style="margin-top: 16px;">
                <label class="form-label">Completion Date <span class="required">*</span></label>
                <input type="date" id="overrideCompDate" class="form-control" required value="${defaultDate}" />
                <small class="form-help">Auto-filled with employee completed date (editable by Admin).</small>
              </div>

              <div class="form-group">
                <label class="form-label">Completed By (Worker / Technician Name) <span class="required">*</span></label>
                <input type="text" id="overrideWorkerName" class="form-control" required value="${Utils.escapeHtml(defaultWorker)}" placeholder="Enter name..." />
              </div>

              <div class="form-group">
                <label class="form-label">Completion Notes & Employee Comments <span class="required">*</span></label>
                <textarea id="overrideComments" class="form-control" rows="3" required placeholder="Describe work done...">${Utils.escapeHtml(defaultComments)}</textarea>
              </div>

              ${
                defaultPhoto ? `
                  <div class="form-group">
                    <label class="form-label">Uploaded Proof Photo:</label>
                    <div>
                      <img src="${Utils.escapeHtml(defaultPhoto)}" style="max-height: 120px; border-radius: 6px; border: 1px solid #cbd5e1;" alt="Proof Photo" />
                    </div>
                  </div>
                ` : ''
              }

              <div class="form-group">
                <label class="form-label">Admin Reason / Justification <span class="required">*</span></label>
                <input type="text" id="overrideReason" class="form-control" required placeholder="e.g. Employee completed verified / Routine inspection" value="${latestRecord ? 'Verified employee maintenance task' : 'Routine completion'}" />
              </div>
            </div>

            <div class="modal-footer" style="flex-wrap: wrap; gap: 8px;">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('overrideModal')">Cancel</button>
              ${
                asset.isCompleted ? `
                  <button type="button" class="btn btn-danger" onclick="App.handleMarkAsNotComplete('${asset.id}')">
                    Mark as Not Complete (Reopen Task)
                  </button>
                ` : ''
              }
              <button type="submit" class="btn btn-primary">Confirm & Keep Completed</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(modalHtml);
  },

  handleMarkAsNotComplete(assetId) {
    const asset = storage.getAssetById(assetId);
    if (!asset) return;

    const reason = prompt('Admin Rejection Reason (Store staff will see this notice on their checklist):', 'Work description or proof photo incomplete. Please re-inspect and re-submit.');
    if (reason === null) return; // User cancelled prompt

    asset.isCompleted = false;
    asset.rejectionReason = reason.trim();
    storage.saveAsset(asset);

    storage.logActivity(
      'Admin Reopened Task (Not Complete)',
      `Admin marked task as NOT complete for ${asset.name}. Reason: "${asset.rejectionReason}"`,
      asset.storeName,
      asset.name,
      'System Admin',
      'Admin'
    );

    storage.addNotification({
      message: `⚠️ Admin marked ${asset.name} as NOT complete. Reason: "${asset.rejectionReason}"`,
      assetId: asset.id,
      assetName: asset.name,
      storeName: asset.storeName,
      userName: 'System Admin',
      userRole: 'Admin'
    });

    Utils.showToast(`Task for "${asset.name}" marked as NOT COMPLETE and reopened for store staff!`, 'warning');
    this.closeModal('overrideModal');
    this.renderCurrentView();
  },

  handleSaveOverride(event, assetId) {
    event.preventDefault();
    const asset = storage.getAssetById(assetId);
    if (!asset) return;

    const compDate = document.getElementById('overrideCompDate').value || Utils.getTodayStr();
    const workerName = document.getElementById('overrideWorkerName').value.trim() || 'System Administrator (Admin)';
    const comments = document.getElementById('overrideComments').value.trim();
    const overrideReason = document.getElementById('overrideReason').value.trim();
    const scheduledDueDate = asset.dueDate;

    const diffTime = new Date(compDate) - new Date(scheduledDueDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isLate = diffDays > 0;
    const isEarly = diffDays < 0;

    const nextDueDate = Utils.calculateNextDueDate(compDate, asset.cycle, asset.customDays);

    asset.isCompleted = true;
    asset.lastCompletedDate = compDate;
    asset.lastCompletedBy = workerName;
    asset.nextDueDate = nextDueDate;

    storage.saveAsset(asset);

    const mHistoryRecord = {
      assetId: asset.id,
      completedDate: compDate,
      scheduledDueDate: scheduledDueDate,
      isLate: isLate,
      daysLate: isLate ? diffDays : 0,
      isEarly: isEarly,
      daysEarly: isEarly ? Math.abs(diffDays) : 0,
      completedBy: workerName,
      status: 'Completed',
      comments,
      photos: asset.imageUrl ? [asset.imageUrl] : [],
      isOverride: true,
      overrideReason
    };
    storage.addMaintenanceRecord(mHistoryRecord);

    const actionName = isEarly ? 'Admin Early Maintenance Override' : 'Admin Completed Maintenance';
    const logDetails = `Completed maintenance for ${asset.name} on ${compDate}. Notes: "${comments}". Next due date: ${nextDueDate}`;
    storage.logActivity(actionName, logDetails, asset.storeName, asset.name, workerName, 'Admin');

    storage.addNotification({
      message: `Admin completed maintenance for ${asset.name} on ${compDate}. Next service due: ${Utils.formatDate(nextDueDate)}`,
      assetId: asset.id,
      assetName: asset.name,
      storeName: asset.storeName,
      userName: workerName,
      userRole: 'Admin'
    });

    Utils.showToast(`Maintenance for "${asset.name}" marked completed!`, 'success');
    this.closeModal('overrideModal');
    this.renderCurrentView();
  },

  // Admin Edit Maintenance Record Modal
  openEditHistoryModal(historyId) {
    if (!Auth.isAdmin()) {
      alert('Security Error: Only Admin can edit completion records.');
      return;
    }

    const allHistory = storage.getMaintenanceHistory();
    const record = allHistory.find(h => h.id === historyId);
    if (!record) return;

    const asset = storage.getAssetById(record.assetId);

    const modalHtml = `
      <div class="modal-overlay" id="editHistoryModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Update Maintenance Record & Completion Date</h3>
            <button class="modal-close-btn" onclick="App.closeModal('editHistoryModal')">&times;</button>
          </div>
          <form onsubmit="App.handleSaveEditHistory(event, '${record.id}')">
            <div class="modal-body">
              <p style="font-size: 0.95rem; color: #374151; margin-bottom: 16px;">
                Updating completion record for <strong>${Utils.escapeHtml(asset ? asset.name : 'Equipment')}</strong>.
              </p>

              <div class="form-group">
                <label class="form-label">Completion Date <span class="required">*</span></label>
                <input type="date" id="editHistCompDate" class="form-control" required value="${record.completedDate}" />
              </div>

              <div class="form-group">
                <label class="form-label">Scheduled Due Date</label>
                <input type="date" id="editHistScheduledDate" class="form-control" value="${record.scheduledDueDate || ''}" />
              </div>

              <div class="form-group">
                <label class="form-label">Completed By (Worker / Technician Name) <span class="required">*</span></label>
                <input type="text" id="editHistWorkerName" class="form-control" required value="${Utils.escapeHtml(record.completedBy)}" />
              </div>

              <div class="form-group">
                <label class="form-label">Maintenance Notes & Comments <span class="required">*</span></label>
                <textarea id="editHistComments" class="form-control" rows="3" required>${Utils.escapeHtml(record.comments)}</textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('editHistoryModal')">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Update Record</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(modalHtml);
  },

  handleSaveEditHistory(event, historyId) {
    event.preventDefault();
    const allHistory = storage.getMaintenanceHistory();
    const record = allHistory.find(h => h.id === historyId);
    if (!record) return;

    const compDate = document.getElementById('editHistCompDate').value;
    const scheduledDate = document.getElementById('editHistScheduledDate').value || record.scheduledDueDate;
    const workerName = document.getElementById('editHistWorkerName').value.trim();
    const comments = document.getElementById('editHistComments').value.trim();

    const diffTime = new Date(compDate) - new Date(scheduledDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isLate = diffDays > 0;
    const isEarly = diffDays < 0;

    record.completedDate = compDate;
    record.scheduledDueDate = scheduledDate;
    record.completedBy = workerName;
    record.comments = comments;
    record.isLate = isLate;
    record.daysLate = isLate ? diffDays : 0;
    record.isEarly = isEarly;
    record.daysEarly = isEarly ? Math.abs(diffDays) : 0;

    storage.updateMaintenanceRecord(record);

    // Sync Asset's lastCompletedDate with latest completion record
    const asset = storage.getAssetById(record.assetId);
    if (asset) {
      const assetHistory = storage.getMaintenanceHistory(asset.id);
      if (assetHistory.length > 0) {
        asset.lastCompletedDate = assetHistory[0].completedDate;
        asset.lastCompletedBy = assetHistory[0].completedBy;
        if (assetHistory[0].photos && assetHistory[0].photos[0]) {
          asset.lastProofPhoto = assetHistory[0].photos[0];
          asset.imageUrl = assetHistory[0].photos[0];
        }
        storage.saveAsset(asset);
      }
    }

    Utils.showToast('Maintenance record updated successfully!', 'success');
    this.closeModal('editHistoryModal');
    this.renderCurrentView();
  },

  // Advance maintenance to next cycle
  advanceToNextCycle(assetId) {
    const asset = storage.getAssetById(assetId);
    if (!asset) return;

    if (asset.nextDueDate && asset.cycle !== 'No Repeat') {
      asset.dueDate = asset.nextDueDate;
      asset.isCompleted = false;
      storage.saveAsset(asset);
      storage.logActivity(
        'Advanced Maintenance Cycle',
        `Advanced ${asset.name} to new maintenance cycle (Due: ${asset.dueDate})`,
        asset.storeName,
        asset.name,
        Auth.getUser()?.name || 'System User',
        Auth.getUser()?.role || 'Admin'
      );
      Utils.showToast(`Advanced "${asset.name}" to next cycle (Scheduled Due: ${Utils.formatDate(asset.dueDate)})`, 'info');
      this.renderCurrentView();
    }
  },

  // ----------------------------------------------------
  // STORE EMPLOYEE MAINTENANCE COMPLETION MODAL & STRICT DATE ENGINE
  // ----------------------------------------------------
  openEmpCompletionModal(assetId) {
    const asset = storage.getAssetById(assetId);
    const user = Auth.getUser();

    if (!asset || asset.storeId !== user.storeId) {
      alert('Security Error: Access denied.');
      return;
    }

    const todayStr = Utils.getTodayStr();

    const modalHtml = `
      <div class="modal-overlay" id="empCompleteModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Mark Maintenance as Completed</h3>
            <button class="modal-close-btn" onclick="App.closeModal('empCompleteModal')">&times;</button>
          </div>
          <form onsubmit="App.handleSaveEmpCompletion(event, '${asset.id}')">
            <div class="modal-body">
              <p style="font-size: 0.95rem; color: #374151; margin-bottom: 16px;">
                Completing service for <strong>${Utils.escapeHtml(asset.name)}</strong> (Store: ${Utils.escapeHtml(asset.storeName)}).
              </p>

              <!-- 1. Assigned Worker / Technician Name (Required) -->
              <div class="form-group">
                <label class="form-label">Worker / Technician Name <span class="required">*</span></label>
                <input type="text" id="empWorkerName" class="form-control" required placeholder="Enter name of person who performed the work..." value="${Utils.escapeHtml(user.name)}" />
              </div>

              <!-- 2. Completion Date (Required & Editable) -->
              <div class="form-group">
                <label class="form-label">Completion Date <span class="required">*</span></label>
                <input type="date" id="empCompDate" class="form-control" required value="${todayStr}" />
                <small class="form-help">Date when maintenance was physically completed.</small>
              </div>

              <!-- 3. Asset Condition After Service -->
              <div class="form-group">
                <label class="form-label">Updated Asset Condition</label>
                <select id="empAssetCondition" class="form-control">
                  <option value="Excellent" ${asset.condition === 'Excellent' ? 'selected' : ''}>Excellent</option>
                  <option value="Good" ${asset.condition === 'Good' || !asset.condition ? 'selected' : ''}>Good</option>
                  <option value="Needs Repair" ${asset.condition === 'Needs Repair' ? 'selected' : ''}>Needs Repair</option>
                  <option value="Under Maintenance" ${asset.condition === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                  <option value="Damaged" ${asset.condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
                  <option value="Retired" ${asset.condition === 'Retired' ? 'selected' : ''}>Retired</option>
                </select>
              </div>

              <!-- 3. Maintenance Comment / Task Update (Required) -->
              <div class="form-group">
                <label class="form-label">Maintenance Notes & Work Description <span class="required">*</span></label>
                <textarea id="empCompComments" class="form-control" rows="3" required placeholder="Describe work performed, parts replaced, optics cleaned, or test status..."></textarea>
              </div>

              <!-- 4. Photo Upload from Device Storage / Camera (Required) -->
              <div class="form-group">
                <label class="form-label">Upload Proof Photo (Camera / Device Storage) <span class="required">*</span></label>
                <div class="image-input-choice" style="flex-direction: column; gap: 8px;">
                  <input type="file" id="empCompPhotoFile" class="form-control" accept="image/*" capture="environment" onchange="App.handleEmpFilePreview(this)" required />
                  <input type="hidden" id="empCompPhotoUrl" value="" />
                  <div style="font-size: 0.8rem; color: #64748b;">📷 Tap above to take a photo with your device camera or select from device gallery.</div>
                </div>
                <div class="image-preview-container" style="margin-top: 10px;">
                  <img id="empCompPhotoPreview" class="img-preview-box" style="display: none;" alt="Maintenance Proof Preview" />
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('empCompleteModal')">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit & Mark Completed</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(modalHtml);
  },

  handleEmpFilePreview(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const dataUrl = e.target.result;
        document.getElementById('empCompPhotoUrl').value = dataUrl;
        const imgPreview = document.getElementById('empCompPhotoPreview');
        if (imgPreview) {
          imgPreview.src = dataUrl;
          imgPreview.style.display = 'block';
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  handleSaveEmpCompletion(event, assetId) {
    event.preventDefault();
    const asset = storage.getAssetById(assetId);
    const user = Auth.getUser();

    if (!asset || asset.storeId !== user.storeId) {
      alert('Security Error: Access denied.');
      return;
    }

    const todayStr = Utils.getTodayStr();

    const workerName = document.getElementById('empWorkerName').value.trim();
    const compDate = document.getElementById('empCompDate').value;
    const newCondition = document.getElementById('empAssetCondition')?.value || asset.condition;
    const comments = document.getElementById('empCompComments').value.trim();
    const photoUrl = document.getElementById('empCompPhotoUrl').value.trim();

    // FORM VALIDATION CHECKS
    if (!workerName) {
      alert('Validation Error: Please enter the Assigned Worker / Technician Name.');
      return;
    }

    if (!compDate) {
      alert('Validation Error: Please select a valid Completion Date.');
      return;
    }

    if (!comments) {
      alert('Validation Error: Please provide maintenance notes and a work description.');
      return;
    }

    // MANDATORY PHOTO UPLOAD CHECK
    if (!photoUrl) {
      alert('Validation Error: A proof photo of the completed maintenance is required! Please capture or select a photo.');
      return;
    }

    const photos = [photoUrl];

    const scheduledDueDate = asset.dueDate;
    const diffTime = new Date(compDate) - new Date(scheduledDueDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isLate = diffDays > 0;
    const isEarly = diffDays < 0;

    // Calculate Next Due Date if recurring
    const nextDueDate = Utils.calculateNextDueDate(compDate, asset.cycle, asset.customDays);

    // UPDATE ASSET COMPLETE STATUS, IMAGES & NEXT DUE DATE
    asset.isCompleted = true;
    asset.lastCompletedDate = compDate;
    asset.lastCompletedBy = workerName;
    asset.lastProofPhoto = photoUrl;
    asset.condition = newCondition;
    asset.nextDueDate = nextDueDate;

    // Update asset image to employee uploaded proof photo if generic or missing
    if (!asset.imageUrl || asset.imageUrl.includes('data:image/svg+xml')) {
      asset.imageUrl = photoUrl;
    }

    storage.saveAsset(asset);

    // Save Maintenance History Record with Late/Early indicators
    const mHistoryRecord = {
      assetId: asset.id,
      completedDate: compDate,
      scheduledDueDate: scheduledDueDate,
      isLate: isLate,
      daysLate: isLate ? diffDays : 0,
      isEarly: isEarly,
      daysEarly: isEarly ? Math.abs(diffDays) : 0,
      completedBy: `${workerName} (${user.storeName})`,
      status: 'Completed',
      comments: comments,
      photos: photos,
      isOverride: false,
      overrideReason: ''
    };
    storage.addMaintenanceRecord(mHistoryRecord);

    const timingNotice = isLate
      ? ` (Serviced ${diffDays} days after scheduled due date ${Utils.formatDate(scheduledDueDate)})`
      : isEarly
      ? ` (Serviced ${Math.abs(diffDays)} days early)`
      : ` (On schedule)`;

    // Create Activity Log
    storage.logActivity(
      'Employee Completed Maintenance',
      `Worker ${workerName} completed maintenance for ${asset.name} on ${compDate}${timingNotice}. Notes: "${comments}". Next due: ${nextDueDate}`,
      user.storeName,
      asset.name,
      workerName,
      'Store Employee'
    );

    // Dispatch Notification to Admin
    storage.addNotification({
      message: `Worker ${workerName} (${user.storeName}) completed maintenance for ${asset.name} on ${compDate}${timingNotice}`,
      assetId: asset.id,
      assetName: asset.name,
      storeName: user.storeName,
      userName: workerName,
      userRole: 'Store Employee'
    });

    Utils.showToast(`Maintenance for "${asset.name}" completed by ${workerName}! ${isLate ? `(Completed ${diffDays} days late)` : ''}`, 'success');

    this.closeModal('empCompleteModal');
    this.renderCurrentView();
  },

  openAssetModal(assetId = null) {
    if (!Auth.isAdmin()) {
      alert('Security Error: Store Employees cannot create or edit asset specifications.');
      return;
    }
    AssetsView.openAssetModal(assetId);
  },

  openStoreModal(storeId = null) {
    if (!Auth.isAdmin()) {
      alert('Security Error: Store Employees cannot manage store accounts.');
      return;
    }
    StoresView.openStoreModal(storeId);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
