/**
 * Store Employee Asset Details & Discussion Modal Component
 * Scoped details modal with strict date validation for maintenance completion and photo/comment messaging system.
 */

const EmpDetailsView = {
  openModal(assetId) {
    const asset = storage.getAssetById(assetId);
    const user = Auth.getUser();

    // Security check: asset must exist and belong to employee's store
    if (!asset || asset.storeId !== user.storeId) {
      alert('Security Error: Access Denied to asset from another store.');
      return;
    }

    const html = this.renderModalContent(asset);
    App.showModal(html);
  },

  renderModalContent(asset) {
    const statusInfo = Utils.calculateStatus(asset);
    const history = storage.getMaintenanceHistory(asset.id);
    const latestRecord = history[0];
    const displayLastCompletedDate = latestRecord ? latestRecord.completedDate : asset.lastCompletedDate;
    const displayImage = (latestRecord && latestRecord.photos && latestRecord.photos[0])
      ? latestRecord.photos[0]
      : (asset.imageUrl || Utils.getDefaultAssetImage());

    const comments = storage.getComments(asset.id);

    const todayStr = Utils.getTodayStr();
    const isFutureDate = new Date(asset.dueDate) > new Date(todayStr);
    const canComplete = !asset.isCompleted && !isFutureDate;

    return `
      <div class="modal-overlay" id="empAssetDetailsModal">
        <div class="modal-card modal-xl">
          <div class="modal-header">
            <div>
              <span class="badge ${statusInfo.badgeClass}" style="margin-bottom: 4px;">${statusInfo.label}</span>
              <h3>${Utils.escapeHtml(asset.name)}</h3>
              <p class="text-subtle" style="margin: 0;">ID: ${Utils.escapeHtml(asset.serialId)} • Area: ${Utils.escapeHtml(asset.location)}</p>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('empAssetDetailsModal')">&times;</button>
          </div>

          <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
            
            <!-- TOP SPEC GRID -->
            <div class="details-spec-grid">
              <div class="asset-image-box">
                <img src="${Utils.escapeHtml(displayImage)}" alt="Asset Image" class="asset-large-img" onerror="this.src=Utils.getDefaultAssetImage()" />
                
                <div style="margin-top: 16px;">
                  ${
                    asset.isCompleted
                      ? `<div class="completed-done-banner">✓ Maintenance Completed on ${Utils.formatDate(displayLastCompletedDate)}</div>`
                      : `
                        <button class="btn btn-primary btn-block btn-lg" onclick="App.closeModal('empAssetDetailsModal'); App.openEmpCompletionModal('${asset.id}')">
                          Mark Service as Completed
                        </button>
                      `
                  }
                </div>
              </div>

              <div class="spec-list-card">
                <h4 class="spec-section-title">Asset Overview & Status</h4>
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
                    <span class="spec-label">Location / Area:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.location)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Condition:</span>
                    <select class="form-control" style="font-size: 0.85rem; padding: 4px 8px; margin-top: 2px;" onchange="EmpDetailsView.updateAssetCondition('${asset.id}', this.value)">
                      <option value="Excellent" ${asset.condition === 'Excellent' ? 'selected' : ''}>Excellent</option>
                      <option value="Good" ${asset.condition === 'Good' ? 'selected' : ''}>Good</option>
                      <option value="Needs Repair" ${asset.condition === 'Needs Repair' ? 'selected' : ''}>Needs Repair</option>
                      <option value="Under Maintenance" ${asset.condition === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                      <option value="Damaged" ${asset.condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
                      <option value="Retired" ${asset.condition === 'Retired' ? 'selected' : ''}>Retired</option>
                    </select>
                  </div>
                  <div>
                    <span class="spec-label">Scheduled Due Date:</span>
                    <strong class="spec-val">${Utils.formatDate(asset.dueDate)}</strong>
                  </div>
                  <div>
                    <span class="spec-label">Maintenance Cycle:</span>
                    <strong class="spec-val">${Utils.escapeHtml(asset.cycle)}</strong>
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
                    <span class="spec-label">Description / Instructions:</span>
                    <p style="margin-top: 4px; font-size: 0.9rem; color: #374151;">${Utils.escapeHtml(asset.description)}</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- MAINTENANCE HISTORY SECTION -->
            <div style="margin-top: 28px;">
              <h4 class="card-box-title" style="margin-bottom: 12px;">Maintenance History (${history.length})</h4>
              ${
                history.length === 0
                  ? `<div class="empty-state" style="padding: 20px;">No completed maintenance records on file.</div>`
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
                                : `<span class="badge badge-completed" style="margin-left: 6px;">On Schedule</span>`
                            }
                            <strong style="margin-left: 8px;">Date: ${Utils.formatDate(item.completedDate)}</strong>
                          </div>
                          <span class="text-subtle">Completed By: <strong>${Utils.escapeHtml(item.completedBy)}</strong></span>
                        </div>
                        ${
                          item.scheduledDueDate ? `
                            <div class="text-subtle" style="font-size: 0.85rem; margin: 4px 0 8px 0;">
                              Scheduled Due Date was: <strong>${Utils.formatDate(item.scheduledDueDate)}</strong>
                              ${item.isLate ? ` • <span style="color: #b45309; font-weight: 700;">Completed ${item.daysLate} days after scheduled date</span>` : ''}
                            </div>
                          ` : ''
                        }
                        <p class="history-comment">${Utils.escapeHtml(item.comments || 'No comments.')}</p>
                        ${
                          item.photos && item.photos.length > 0
                            ? `
                              <div class="history-photos">
                                ${item.photos.map(p => `
                                  <div class="photo-container-item">
                                    <img src="${Utils.escapeHtml(p)}" class="history-photo-thumb" onclick="window.open('${Utils.escapeHtml(p)}', '_blank')" />
                                    <span class="photo-author-tag">Uploaded by Store Staff</span>
                                  </div>
                                `).join('')}
                              </div>
                            `
                            : ''
                        }
                      </div>
                    `).join('')
              }
            </div>

            <!-- COMMENTS & MESSAGING WITH ADMIN -->
            <div style="margin-top: 28px;">
              <h4 class="card-box-title" style="margin-bottom: 12px;">Comments & Staff Communication (${comments.length})</h4>
              <p class="text-subtle" style="margin-bottom: 16px;">Communicate with System Admin about this equipment.</p>

              <div class="comments-thread">
                ${
                  comments.length === 0
                    ? `<div class="empty-state" style="padding: 20px;">No comments yet. Leave a note or question for Admin below!</div>`
                    : comments.map(c => `
                        <div class="comment-item">
                          <div class="comment-avatar" style="${c.role === 'Admin' ? 'background: #eff6ff; color: #2563eb;' : 'background: #ecfdf5; color: #059669;'}">${c.user.charAt(0)}</div>
                          <div class="comment-body" style="flex: 1;">
                            <div class="comment-header">
                              <strong>${Utils.escapeHtml(c.user)}</strong>
                              <span class="comment-role" style="${c.role === 'Admin' ? 'background: #dbeafe; color: #1e40af;' : ''}">${Utils.escapeHtml(c.role)}</span>
                              <span class="comment-time">${new Date(c.timestamp).toLocaleString()}</span>
                            </div>
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
                        </div>
                      `).join('')
                }
              </div>

              <!-- EMPLOYEE ADD COMMENT FORM -->
              <form onsubmit="EmpDetailsView.handlePostComment(event, '${asset.id}')" style="margin-top: 20px;">
                <div class="form-group">
                  <label class="form-label">Add Comment / Upload Photo for Admin:</label>
                  <textarea id="empCommentText" class="form-control" rows="3" required placeholder="Type your message or maintenance updates here..."></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">Attach Photo (Optional URL or File Upload)</label>
                  <div class="image-input-choice">
                    <input type="text" id="empCommentPhotoUrl" class="form-control" placeholder="Paste Photo URL..." />
                    <input type="file" id="empCommentPhotoFile" class="form-control" accept="image/*" onchange="EmpDetailsView.handleFileChoose(this)" />
                  </div>
                </div>

                <button type="submit" class="btn btn-primary">Post Message to Admin</button>
              </form>
            </div>

          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('empAssetDetailsModal')">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  handleFileChoose(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('empCommentPhotoUrl').value = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  handlePostComment(event, assetId) {
    event.preventDefault();
    const text = document.getElementById('empCommentText').value.trim();
    const photoUrl = document.getElementById('empCommentPhotoUrl').value.trim();

    if (!text) return;

    const user = Auth.getUser();
    const asset = storage.getAssetById(assetId);

    // Save comment
    const newCmt = storage.addComment(assetId, text, user ? user.name : 'Store Employee', 'Store Manager', photoUrl);

    // Log Activity
    const actionMsg = photoUrl ? 'Employee Uploaded Photo & Comment' : 'Employee Added Comment';
    storage.logActivity(actionMsg, `${user ? user.name : 'Employee'} commented on ${asset ? asset.name : 'Asset'}: "${text}"`, user ? user.storeName : 'Store', asset ? asset.name : 'Asset', user ? user.name : 'Employee', 'Store Manager');

    // Notify Admin
    storage.addNotification({
      message: `${user ? user.name : 'Employee'} posted a comment on ${asset ? asset.name : 'Asset'}`,
      assetId,
      assetName: asset ? asset.name : 'Asset',
      storeName: user ? user.storeName : 'Store',
      userName: user ? user.name : 'Store Employee',
      userRole: 'Store Manager'
    });

    Utils.showToast('Comment & photo submitted to Admin!', 'success');

    // Refresh Modal
    App.closeModal('empAssetDetailsModal');
    this.openModal(assetId);
  },

  updateAssetCondition(assetId, newCondition) {
    const asset = storage.getAssetById(assetId);
    const user = Auth.getUser();
    if (asset) {
      const oldCond = asset.condition;
      asset.condition = newCondition;
      storage.saveAsset(asset);

      storage.logActivity(
        'Employee Updated Asset Condition',
        `Employee ${user ? user.name : 'Staff'} changed ${asset.name} condition from "${oldCond}" to "${newCondition}"`,
        user ? user.storeName : 'Store',
        asset.name,
        user ? user.name : 'Staff',
        'Store Employee'
      );

      Utils.showToast(`Equipment condition updated to "${newCondition}"!`, 'success');
      App.closeModal('empAssetDetailsModal');
      this.openModal(assetId);
      App.renderCurrentView();
    }
  }
};
