/**
 * Store Employee Notifications View Component
 * Filter notifications relevant strictly to the logged-in store account.
 */

const EmpNotificationsView = {
  render() {
    const user = Auth.getUser();
    if (!user || !user.storeId) {
      return `<div class="empty-state">Store session invalid. Please log in.</div>`;
    }

    const allNotifs = storage.getNotifications();

    // Filter notifications for this store or general alerts
    const empNotifs = allNotifs.filter(n =>
      !n.storeName ||
      n.storeName === user.storeName ||
      n.storeName === 'All Stores'
    );

    const unreadCount = empNotifs.filter(n => !n.isRead).length;

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Store Notifications</h1>
          <p class="view-subtitle">Alerts and updates for <strong>${Utils.escapeHtml(user.storeName)}</strong></p>
        </div>
        <div class="header-actions">
          ${
            unreadCount > 0
              ? `<button class="btn btn-secondary" onclick="EmpNotificationsView.markAllRead()">Mark All Read (${unreadCount})</button>`
              : `<span class="badge badge-completed">All notifications read</span>`
          }
        </div>
      </div>

      <div class="card-box">
        <div class="notifications-list">
          ${
            empNotifs.length === 0
              ? `<div class="empty-state">No notifications for your store.</div>`
              : empNotifs.map(notif => `
                  <div class="notification-item ${notif.isRead ? 'read' : 'unread'}">
                    <div class="notif-indicator"></div>
                    <div class="notif-content">
                      <div class="notif-header">
                        <strong class="notif-message">${Utils.escapeHtml(notif.message)}</strong>
                        <span class="notif-time">${new Date(notif.date).toLocaleString()}</span>
                      </div>
                      <div class="notif-meta">
                        <span>Equipment: <strong>${Utils.escapeHtml(notif.assetName || 'General')}</strong></span>
                        <span>•</span>
                        <span>From: ${Utils.escapeHtml(notif.userName)} (${Utils.escapeHtml(notif.userRole)})</span>
                      </div>
                    </div>
                    <div class="notif-actions">
                      ${
                        !notif.isRead
                          ? `<button class="btn btn-outline btn-sm" onclick="EmpNotificationsView.markSingleRead('${notif.id}')">Mark Read</button>`
                          : ''
                      }
                      ${
                        notif.assetId
                          ? `<button class="btn btn-primary btn-sm" onclick="EmpDetailsView.openModal('${notif.assetId}')">View Equipment</button>`
                          : ''
                      }
                    </div>
                  </div>
                `).join('')
          }
        </div>
      </div>
    `;
  },

  markSingleRead(id) {
    storage.markNotificationRead(id);
    App.updateUnreadCountBadge();
    App.renderCurrentView();
  },

  markAllRead() {
    storage.markAllNotificationsRead();
    App.updateUnreadCountBadge();
    App.renderCurrentView();
    Utils.showToast('Store notifications marked as read.', 'success');
  }
};
