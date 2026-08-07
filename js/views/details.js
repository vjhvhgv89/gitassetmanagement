/**
 * Asset Details Modal & Detailed View Component
 * Photo, Specs, Maintenance History, Interactive Comments Thread, and Activity Timeline.
 */

const AssetDetailsView = {
  renderModal(assetId) {
    const asset = storage.getAssetById(assetId);
    if (!asset) return '';

    const statusInfo = Utils.calculateStatus(asset);
    const history = storage.getMaintenanceHistory(assetId);
    const comments = storage.getComments(assetId);
    const logs = storage.getActivityLogs().filter(l => l.asset === asset.name || l.details.includes(asset.name) || l.details.includes(asset.serialId));

    return `
      <div class="modal-overlay" id="assetDetailsModal">
        <div class="modal-card modal-xl">
          <div class="modal-header">
            <div>
              <span class="badge ${statusInfo.badgeClass}" style="margin-bottom: 4px;">${statusInfo.label}</span>
              <h3>${Utils.escapeHtml(asset.name)}</h3>
              <p class="text-subtle" style="margin: 0;">${Utils.escapeHtml(asset.serialId)} • ${Utils.escapeHtml(asset.storeName)}</p>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('assetDetailsModal')">&times;</button>
          </div>

          <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
            <!-- HEADER SPEC CARDS -->
            <div class="details-spec-grid">
              <div class="asset-image-box">
                <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" alt="Asset Image" class="asset-large-img" onerror="this.src=Utils.getDefaultAssetImage()" />
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="App.closeModal('assetDetailsModal'); App.openOverrideModal('${asset.id}')">Complete Maintenance</button>
                  <button class="btn btn-outline btn-sm" onclick="App.closeModal('assetDetailsModal'); AssetsView.openAssetModal('${asset.id}')">Edit Specs</button>
                </div>
              </div>

              <div class="spec-list-card">
                <h4 class="spec-section-title">Asset Overview</h4>
                <div class="spec-grid-2col">
                  <div>
                    <span class="spec-label">Category:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.category)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Serial / Asset ID:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.serialId)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Assigned Store:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.storeName)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Location / Area:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.location)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Current Condition:</span>
                    <span class="condition-tag condition-${asset.condition.toLowerCase().replace(/\s+/g, '-')}">${Utils.escapeHtml(asset.condition)}</span>
                  </div>
                  <div>
                    <span class="spec-label">Estimated Value:</span>
                    <strong class="spec-val">${Utils.formatCurrency(asset.cost)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Scheduled Due Date:</span>
                    <strong class="spec-val">${Utils.formatDate(asset.dueDate)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Maintenance Cycle:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.cycle)} ${asset.cycle === 'Custom' ? `(${asset.customDays} days)` : ''}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Last Completed Date:</span>
                    <strong class="spec-val">${Utils.formatDate(asset.lastCompletedDate)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Next Scheduled Due:</span>
                    <strong class="spec-val">${Utils.formatDate(Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays))}</strong>
                  </div>
                </div>

                ${asset.description ? `
                  <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <span class="spec-label">Description / Notes:</span>
                    <p style="margin-top: 4px; font-size: 0.9rem; color: #374151;">${Utils.escapeHtml(asset.description)}</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- TABS FOR DETAILS (HISTORY, COMMENTS, TIMELINE) -->
            <div class="details-tab-nav" style="margin-top: 24px;">
              <button class="details-tab-btn active" id="tabHeadHistory" onclick="AssetDetailsView.switchDetailsTab('history')">Maintenance History (${history.length})</button>
              <button class="details-tab-btn" id="tabHeadComments" onclick="AssetDetailsView.switchDetailsTab('comments')">Comments (${comments.length})</button>
              <button class="details-tab-btn" id="tabHeadTimeline" onclick="AssetDetailsView.switchDetailsTab('timeline')">Activity Timeline (${logs.length})</button>
            </div>

            <!-- TAB CONTENT 1: MAINTENANCE HISTORY -->
            <div id="detailsTabHistory" class="details-tab-content active">
              ${
                history.length === 0
                  ? `<div class="empty-state">No recorded maintenance history for this asset yet.</div>`
                  : history.map(item => `
                      <div class="history-card">
                        <div class="history-header">
                          <div>
                            <span class="badge badge-completed">Completed</span>
                            ${
                              item.isLate
                                ? `<span class="badge badge-due-soon" style="margin-left: 6px;">Completed Late (${item.daysLate} days after schedule)</span>`
                                : item.isEarly
                                ? `<span class="badge badge-upcoming" style="margin-left: 6px;">Completed Early</span>`
                                : ''
                            }
                            <strong style="margin-left: 8px;">Completed on ${Utils.formatDate(item.completedDate)}</strong>
                            ${item.isOverride ? `<span class="badge badge-due-soon" style="margin-left: 8px;">Admin Override</span>` : ''}
                          </div>
                          <span class="text-subtle">By ${Utils.escapeHtml(item.completedBy)}</span>
                        </div>
                        ${
                          item.scheduledDueDate ? `
                            <div class="text-subtle" style="font-size: 0.85rem; margin: 4px 0 8px 0;">
                              Scheduled Due Date was: <strong>${Utils.formatDate(item.scheduledDueDate)}</strong>
                              ${item.isLate ? ` • <span style="color: #b45309; font-weight: 700;">Completed ${item.daysLate} days after scheduled date</span>` : ''}
                            </div>
                          ` : ''
                        }
                        <p class="history-comment">${Utils.escapeHtml(item.comments || 'No comments provided.')}</p>
                        ${item.isOverride && item.overrideReason ? `<div class="override-reason-box"><strong>Override Reason:</strong> ${Utils.escapeHtml(item.overrideReason)}</div>` : ''}
                        ${
                          item.photos && item.photos.length > 0
                            ? `<div class="history-photos">
                                ${item.photos.map(p => `<img src="${Utils.escapeHtml(p)}" class="history-photo-thumb" onclick="window.open('${Utils.escapeHtml(p)}', '_blank')" />`).join('')}
                               </div>`
                            : ''
                        }
                      </div>
                    `).join('')
              }
            </div>

            <!-- TAB CONTENT 2: COMMENTS THREAD -->
            <div id="detailsTabComments" class="details-tab-content" style="display: none;">
              <div class="comments-thread">
                ${
                  comments.length === 0
                    ? `<div class="empty-state">No comments yet. Start a discussion below!</div>`
                    : comments.map(c => `
                        <div class="comment-item">
                          <div class="comment-avatar">${c.user.charAt(0)}</div>
                          <div class="comment-body">
                            <div class="comment-header">
                              <strong>${Utils.escapeHtml(c.user)}</strong>
                              <span class="comment-role">${Utils.escapeHtml(c.role)}</span>
                              <span class="comment-time">${new Date(c.timestamp).toLocaleString()}</span>
                            </div>
                            <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
                          </div>
                        </div>
                      `).join('')
                }
              </div>

              <!-- POST NEW COMMENT FORM -->
              <form onsubmit="AssetDetailsView.handlePostComment(event, '${asset.id}')" style="margin-top: 20px;">
                <div class="form-group">
                  <label class="form-label">Add Admin Comment / Instruction:</label>
                  <textarea id="newCommentText" class="form-control" rows="3" required placeholder="Type notes, technician updates, or instructions for store staff..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-sm">Post Comment</button>
              </form>
            </div>

            <!-- TAB CONTENT 3: ACTIVITY TIMELINE -->
            <div id="detailsTabTimeline" class="details-tab-content" style="display: none;">
              <div class="activity-feed">
                ${
                  logs.length === 0
                    ? `<div class="empty-state">No activity logs recorded for this asset.</div>`
                    : logs.map(l => `
                        <div class="activity-item">
                          <div class="activity-icon-bullet"></div>
                          <div class="activity-content">
                            <div class="activity-header">
                              <span class="activity-action">${Utils.escapeHtml(l.action)}</span>
                              <span class="activity-time">${Utils.escapeHtml(l.date)} ${Utils.escapeHtml(l.time)}</span>
                            </div>
                            <p class="activity-details">${Utils.escapeHtml(l.details)}</p>
                            <div class="activity-meta">User: <strong>${Utils.escapeHtml(l.user)}</strong> (${Utils.escapeHtml(l.role)})</div>
                          </div>
                        </div>
                      `).join('')
                }
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('assetDetailsModal')">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  switchDetailsTab(tabName) {
    const tabs = ['history', 'comments', 'timeline'];
    tabs.forEach(t => {
      const content = document.getElementById('detailsTab' + t.charAt(0).toUpperCase() + t.slice(1));
      const head = document.getElementById('tabHead' + t.charAt(0).toUpperCase() + t.slice(1));
      if (content && head) {
        if (t === tabName) {
          content.style.display = 'block';
          head.classList.add('active');
        } else {
          content.style.display = 'none';
          head.classList.remove('active');
        }
      }
    });
  },

  handlePostComment(event, assetId) {
    event.preventDefault();
    const input = document.getElementById('newCommentText');
    const text = input.value.trim();
    if (!text) return;

    const asset = storage.getAssetById(assetId);
    storage.addComment(assetId, text, 'System Admin', 'Admin');

    storage.logActivity('Admin Added Comment', `Comment on ${asset ? asset.name : 'Asset'}: "${text}"`, asset ? asset.storeName : 'All Stores', asset ? asset.name : 'Asset');

    Utils.showToast('Comment posted successfully!', 'success');
    
    // Refresh details modal
    App.closeModal('assetDetailsModal');
    App.showAssetDetails(assetId);
  }
};
