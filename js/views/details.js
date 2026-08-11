/**
 * Asset Details Modal & Detailed View Component
 * Photo, Specs, Maintenance History, Interactive Comments Thread, and Activity Timeline.
 */

const AssetDetailsView = {
  renderModal(assetId) {
    const asset = storage.getAssetById(assetId);
    if (!asset) return '';

    const statusInfo = Utils.calculateStatus(asset);
    const history = storage.getMaintenanceHistory(assetId); // Sorted by completedDate descending
    const latestRecord = history[0];
    const displayLastCompletedDate = latestRecord ? latestRecord.completedDate : asset.lastCompletedDate;
    const displayLastCompletedBy = latestRecord ? latestRecord.completedBy : (asset.lastCompletedBy || 'N/A');
    const displayImage = (latestRecord && latestRecord.photos && latestRecord.photos[0])
      ? latestRecord.photos[0]
      : (asset.imageUrl || Utils.getDefaultAssetImage());

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
                <img src="${Utils.escapeHtml(displayImage)}" alt="Asset Image" class="asset-large-img" onerror="this.src=Utils.getDefaultAssetImage()" />
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
                    <strong class="spec-val" style="color: #059669;">${Utils.formatDate(displayLastCompletedDate)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Next Scheduled Due:</span>
                    <strong class="spec-val">${Utils.formatDate(asset.nextDueDate || Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays))}</strong>
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
                          <div>
                            <span class="text-subtle">By ${Utils.escapeHtml(item.completedBy)}</span>
                            <button class="btn btn-sm btn-outline" style="margin-left: 10px; padding: 2px 8px; font-size: 0.78rem;" onclick="App.closeModal('assetDetailsModal'); App.openEditHistoryModal('${item.id}')">Edit Date & Record</button>
                          </div>
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
                            ? `<div class="history-photos" style="margin-top: 8px;">
                                ${item.photos.map(p => `
                                  <div style="display: flex; flex-direction: column; align-items: flex-start;">
                                    <img src="${Utils.escapeHtml(p)}" class="history-photo-thumb" onclick="window.open('${Utils.escapeHtml(p)}', '_blank')" />
                                    <span style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Uploaded Proof Photo</span>
                                  </div>
                                `).join('')}
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
                        <div class="comment-item" id="comment-item-${c.id}">
                          <div class="comment-avatar" style="${c.role === 'Admin' ? 'background: #eff6ff; color: #2563eb;' : 'background: #ecfdf5; color: #059669;'}">${(c.user || 'U').charAt(0)}</div>
                          <div class="comment-body" style="flex: 1;">
                            <div class="comment-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                              <div>
                                <strong>${Utils.escapeHtml(c.user)}</strong>
                                <span class="comment-role" style="${c.role === 'Admin' ? 'background: #dbeafe; color: #1e40af;' : ''}">${Utils.escapeHtml(c.role)}</span>
                                <span class="comment-time">${new Date(c.timestamp).toLocaleString()}</span>
                              </div>
                              <div class="comment-actions" style="display: flex; gap: 6px;">
                                <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="AssetDetailsView.showEditCommentForm('${c.id}')">Edit</button>
                                <button type="button" class="btn btn-danger" style="padding: 2px 8px; font-size: 0.75rem;" onclick="AssetDetailsView.handleDeleteComment('${asset.id}', '${c.id}')">Delete</button>
                              </div>
                            </div>
                            <div id="comment-display-${c.id}">
                              <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
                              ${
                                c.photoUrl ? `
                                  <div style="margin-top: 10px; display: flex; flex-direction: column; align-items: flex-start;">
                                    <div style="position: relative; display: inline-block; cursor: pointer;" onclick="App.openImageModal('${Utils.escapeHtml(c.photoUrl.replace(/'/g, "\\'"))}')">
                                      <img src="${Utils.escapeHtml(c.photoUrl)}" class="history-photo-thumb" style="width: 140px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; transition: transform 0.2s ease;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'" />
                                      <span style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.75); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;">Click to view image</span>
                                    </div>
                                  </div>
                                ` : ''
                              }
                            </div>
                            <div id="comment-edit-box-${c.id}" style="display: none; margin-top: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                              <div class="form-group" style="margin-bottom: 8px;">
                                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">Edit Message:</label>
                                <textarea id="editCommentInput-${c.id}" class="form-control" rows="2">${Utils.escapeHtml(c.text)}</textarea>
                              </div>
                              <div class="form-group" style="margin-bottom: 12px;">
                                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">Update Attached Photo (Optional URL or File):</label>
                                <input type="text" id="editCommentPhotoInput-${c.id}" class="form-control" placeholder="Photo URL..." value="${Utils.escapeHtml(c.photoUrl || '')}" style="margin-bottom: 4px;" />
                                <input type="file" class="form-control" accept="image/*" onchange="AssetDetailsView.handleEditFileChoose(this, '${c.id}')" />
                              </div>
                              <div style="display: flex; gap: 8px;">
                                <button type="button" class="btn btn-primary btn-sm" onclick="AssetDetailsView.handleSaveEditedComment('${asset.id}', '${c.id}')">Save Changes</button>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="AssetDetailsView.cancelEditComment('${c.id}')">Cancel</button>
                              </div>
                            </div>
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

                <div class="form-group">
                  <label class="form-label">Attach Photo (Optional URL or File Upload)</label>
                  <div class="image-input-choice" style="display: flex; gap: 8px;">
                    <input type="text" id="adminCommentPhotoUrl" class="form-control" placeholder="Paste Photo URL..." />
                    <input type="file" id="adminCommentPhotoFile" class="form-control" accept="image/*" onchange="AssetDetailsView.handleFileChoose(this)" />
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-sm">Post Comment & Photo</button>
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

  handleFileChoose(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const photoInput = document.getElementById('adminCommentPhotoUrl');
        if (photoInput) photoInput.value = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  handleEditFileChoose(input, commentId) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const photoInput = document.getElementById(`editCommentPhotoInput-${commentId}`);
        if (photoInput) photoInput.value = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
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

  showEditCommentForm(commentId) {
    const displayBox = document.getElementById(`comment-display-${commentId}`);
    const editBox = document.getElementById(`comment-edit-box-${commentId}`);
    if (displayBox && editBox) {
      displayBox.style.display = 'none';
      editBox.style.display = 'block';
    }
  },

  cancelEditComment(commentId) {
    const displayBox = document.getElementById(`comment-display-${commentId}`);
    const editBox = document.getElementById(`comment-edit-box-${commentId}`);
    if (displayBox && editBox) {
      displayBox.style.display = 'block';
      editBox.style.display = 'none';
    }
  },

  handleSaveEditedComment(assetId, commentId) {
    const input = document.getElementById(`editCommentInput-${commentId}`);
    if (!input) return;
    const updatedText = input.value.trim();
    if (!updatedText) {
      Utils.showToast('Comment text cannot be empty.', 'error');
      return;
    }

    const photoInput = document.getElementById(`editCommentPhotoInput-${commentId}`);
    const updatedPhotoUrl = photoInput ? photoInput.value.trim() : null;

    const asset = storage.getAssetById(assetId);

    // Save edited comment
    storage.editComment(assetId, commentId, updatedText, updatedPhotoUrl);

    // Log Activity
    storage.logActivity(
      'Admin Edited Comment',
      `Admin edited comment on ${asset ? asset.name : 'Asset'}: "${updatedText}"`,
      asset ? asset.storeName : 'All Stores',
      asset ? asset.name : 'Asset',
      'System Admin',
      'Admin'
    );

    // Notify Employee / Store
    storage.addNotification({
      message: `System Admin edited a comment on ${asset ? asset.name : 'Asset'}: "${updatedText.length > 50 ? updatedText.substring(0, 50) + '...' : updatedText}"`,
      assetId,
      assetName: asset ? asset.name : 'Asset',
      storeName: asset ? asset.storeName : 'All Stores',
      userName: 'System Admin',
      userRole: 'Admin'
    });

    Utils.showToast('Comment updated & employee notified!', 'success');

    // Refresh Modal & keep comments tab active
    App.closeModal('assetDetailsModal');
    App.showAssetDetails(assetId);
    setTimeout(() => {
      AssetDetailsView.switchDetailsTab('comments');
    }, 50);
  },

  handleDeleteComment(assetId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const comments = storage.getComments(assetId);
    const targetCmt = comments.find(c => c.id === commentId);
    const asset = storage.getAssetById(assetId);
    const deletedText = targetCmt ? targetCmt.text : 'comment';

    // Delete comment
    storage.deleteComment(assetId, commentId);

    // Log Activity
    storage.logActivity(
      'Admin Deleted Comment',
      `Admin deleted comment on ${asset ? asset.name : 'Asset'}`,
      asset ? asset.storeName : 'All Stores',
      asset ? asset.name : 'Asset',
      'System Admin',
      'Admin'
    );

    // Notify Employee / Store
    storage.addNotification({
      message: `System Admin deleted a comment on ${asset ? asset.name : 'Asset'}: "${deletedText.length > 40 ? deletedText.substring(0, 40) + '...' : deletedText}"`,
      assetId,
      assetName: asset ? asset.name : 'Asset',
      storeName: asset ? asset.storeName : 'All Stores',
      userName: 'System Admin',
      userRole: 'Admin'
    });

    Utils.showToast('Comment deleted & employee notified!', 'info');

    // Refresh Modal & keep comments tab active
    App.closeModal('assetDetailsModal');
    App.showAssetDetails(assetId);
    setTimeout(() => {
      AssetDetailsView.switchDetailsTab('comments');
    }, 50);
  },

  handlePostComment(event, assetId) {
    event.preventDefault();
    const input = document.getElementById('newCommentText');
    const text = input.value.trim();
    if (!text) return;

    const photoUrlInput = document.getElementById('adminCommentPhotoUrl');
    const photoUrl = photoUrlInput ? photoUrlInput.value.trim() : null;

    const asset = storage.getAssetById(assetId);
    storage.addComment(assetId, text, 'System Admin', 'Admin', photoUrl);

    storage.logActivity('Admin Added Comment', `Comment on ${asset ? asset.name : 'Asset'}: "${text}"`, asset ? asset.storeName : 'All Stores', asset ? asset.name : 'Asset');

    Utils.showToast('Comment posted successfully!', 'success');
    
    // Refresh details modal & keep comments tab active
    App.closeModal('assetDetailsModal');
    App.showAssetDetails(assetId);
    setTimeout(() => {
      AssetDetailsView.switchDetailsTab('comments');
    }, 50);
  }
};
