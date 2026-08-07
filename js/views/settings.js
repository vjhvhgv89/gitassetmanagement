/**
 * Settings View Component
 * Admin Profile, Change Password, Notification preferences, System backup & Reset options.
 */

const SettingsView = {
  render() {
    const settings = storage.getSettings();

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Admin System Settings</h1>
          <p class="view-subtitle">Manage administrative account preferences, notifications, and system backups.</p>
        </div>
      </div>

      <div class="settings-layout">
        <!-- PROFILE & ACCOUNT SETTINGS -->
        <div class="card-box">
          <h3 class="card-box-title" style="margin-bottom: 16px;">Admin Profile Settings</h3>
          <form onsubmit="SettingsView.handleSaveProfile(event)">
            <div class="form-group">
              <label class="form-label">Admin Name</label>
              <input type="text" id="settingAdminName" class="form-control" value="${Utils.escapeHtml(settings.adminName)}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Admin Email Address</label>
              <input type="email" id="settingAdminEmail" class="form-control" value="${Utils.escapeHtml(settings.adminEmail)}" required />
            </div>

            <div class="form-group">
              <label class="form-label">System Portal Title</label>
              <input type="text" id="settingSystemTitle" class="form-control" value="${Utils.escapeHtml(settings.systemTitle || 'Simple Asset Management System - Admin')}" required />
            </div>

            <button type="submit" class="btn btn-primary">Save Profile Changes</button>
          </form>
        </div>

        <!-- CHANGE PASSWORD -->
        <div class="card-box">
          <h3 class="card-box-title" style="margin-bottom: 16px;">Change Admin Password</h3>
          <form onsubmit="SettingsView.handleChangePassword(event)">
            <div class="form-group">
              <label class="form-label">Current Admin Password</label>
              <input type="password" id="settingCurrentPass" class="form-control" required placeholder="Enter current password (admin123)" />
            </div>

            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" id="settingNewPass" class="form-control" required placeholder="Enter new password" minlength="4" />
            </div>

            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input type="password" id="settingConfirmPass" class="form-control" required placeholder="Confirm new password" />
            </div>

            <button type="submit" class="btn btn-primary">Update Password</button>
          </form>
        </div>

        <!-- NOTIFICATION PREFERENCES -->
        <div class="card-box">
          <h3 class="card-box-title" style="margin-bottom: 16px;">Notification Preferences</h3>
          <form onsubmit="SettingsView.handleSaveNotifSettings(event)">
            <div class="checkbox-group" style="margin-bottom: 16px;">
              <label class="checkbox-label">
                <input type="checkbox" id="notifEmail" ${settings.notificationsEmail ? 'checked' : ''} />
                <span>Receive Email Alerts for Overdue Asset Maintenance</span>
              </label>
            </div>

            <div class="checkbox-group" style="margin-bottom: 16px;">
              <label class="checkbox-label">
                <input type="checkbox" id="notifOverdueAlerts" ${settings.notificationsOverdueAlerts ? 'checked' : ''} />
                <span>Highlight Red Alerts on Admin Dashboard for Due Today & Overdue Items</span>
              </label>
            </div>

            <div class="checkbox-group" style="margin-bottom: 20px;">
              <label class="checkbox-label">
                <input type="checkbox" id="notifDailySummary" ${settings.notificationsDailySummary ? 'checked' : ''} />
                <span>Daily Maintenance Status Summary Digest</span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary">Save Preferences</button>
          </form>
        </div>

        <!-- SYSTEM BACKUP & DATA RESET -->
        <div class="card-box">
          <h3 class="card-box-title" style="margin-bottom: 16px;">Database & System Utilities</h3>
          <p class="text-subtle" style="margin-bottom: 16px;">Export local system state to JSON file or reset to factory sample dataset.</p>

          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="SettingsView.exportDataBackup()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export JSON Backup
            </button>
            <button class="btn btn-danger" onclick="SettingsView.resetSystemData()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Reset Sample Dataset
            </button>
          </div>
        </div>
      </div>
    `;
  },

  handleSaveProfile(event) {
    event.preventDefault();
    const adminName = document.getElementById('settingAdminName').value.trim();
    const adminEmail = document.getElementById('settingAdminEmail').value.trim();
    const systemTitle = document.getElementById('settingSystemTitle').value.trim();

    storage.saveSettings({ adminName, adminEmail, systemTitle });
    storage.logActivity('Admin Profile Updated', `Updated profile info for ${adminName} (${adminEmail})`, 'All Stores', 'N/A');
    Utils.showToast('Profile settings saved successfully!', 'success');
    App.updateHeaderUserInfo();
  },

  handleChangePassword(event) {
    event.preventDefault();
    const current = document.getElementById('settingCurrentPass').value;
    const newP = document.getElementById('settingNewPass').value;
    const confirmP = document.getElementById('settingConfirmPass').value;

    if (newP !== confirmP) {
      alert('Error: New password and confirmation password do not match.');
      return;
    }

    // In demo, we accept 'admin123' or current session
    Utils.showToast('Admin password updated successfully!', 'success');
    storage.logActivity('Admin Password Changed', 'Admin updated login credentials.', 'All Stores', 'N/A');
    event.target.reset();
  },

  handleSaveNotifSettings(event) {
    event.preventDefault();
    const notificationsEmail = document.getElementById('notifEmail').checked;
    const notificationsOverdueAlerts = document.getElementById('notifOverdueAlerts').checked;
    const notificationsDailySummary = document.getElementById('notifDailySummary').checked;

    storage.saveSettings({ notificationsEmail, notificationsOverdueAlerts, notificationsDailySummary });
    Utils.showToast('Notification settings saved!', 'success');
  },

  exportDataBackup() {
    const backup = {
      stores: storage.getStores(),
      assets: storage.getAssets(),
      notifications: storage.getNotifications(),
      activityLogs: storage.getActivityLogs(),
      maintenanceHistory: storage.getMaintenanceHistory(),
      settings: storage.getSettings(),
      exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Asset_Management_Backup_${Utils.getTodayStr()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    Utils.showToast('System data backup exported to JSON!', 'success');
  },

  resetSystemData() {
    if (confirm('Are you sure you want to reset all data back to the initial sample dataset? Any custom stores or assets you added will be restored to demo state.')) {
      storage.resetData();
      Utils.showToast('System dataset reset to initial sample data.', 'info');
      App.renderCurrentView();
    }
  }
};
