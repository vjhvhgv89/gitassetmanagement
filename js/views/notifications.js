/**
 * Notifications View Component
 * Displays system and employee activity notifications with read status management.
 */

const NotificationsView = {
  render() {
    const notifications = storage.getNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">System Notifications</h1>
          <p class="view-subtitle">Alerts for due maintenance, employee updates, and store activities.</p>
        </div>
        <div class="header-actions">
          ${
            unreadCount > 0
              ? `<button class="btn btn-secondary" onclick="NotificationsView.markAllRead()">Mark All as Read (${unreadCount})</button>`
              : `<span class="badge badge-completed">All caught up!</span>`
          }
        </div>
      </div>

      <div class="card-box">
        <div class="notifications-list">
          ${
            notifications.length === 0
              ? `<div class="empty-state">No notifications to show.</div>`
              : notifications.map(notif => `
                  <div class="notification-item ${notif.isRead ? 'read' : 'unread'}">
                    <div class="notif-indicator"></div>
                    <div class="notif-content">
                      <div class="notif-header">
                        <strong class="notif-message">${Utils.escapeHtml(notif.message)}</strong>
                        <span class="notif-time">${new Date(notif.date).toLocaleString()}</span>
                      </div>
                      <div class="notif-meta">
                        <span>Asset: <strong>${Utils.escapeHtml(notif.assetName || 'General')}</strong></span>
                        <span>•</span>
                        <span>Store: <strong>${Utils.escapeHtml(notif.storeName || 'All Stores')}</strong></span>
                        <span>•</span>
                        <span>User: ${Utils.escapeHtml(notif.userName)} (${Utils.escapeHtml(notif.userRole)})</span>
                      </div>
                    </div>
                    <div class="notif-actions">
                      ${
                        !notif.isRead
                          ? `<button class="btn btn-outline btn-sm" onclick="NotificationsView.markSingleRead('${notif.id}')">Mark Read</button>`
                          : `<span class="text-subtle" style="font-size: 0.8rem;">Read</span>`
                      }
                      ${
                        notif.assetId
                          ? `<button class="btn btn-secondary btn-sm" onclick="App.showAssetDetails('${notif.assetId}')">View Asset</button>`
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
    Utils.showToast('All notifications marked as read.', 'success');
  }
};
