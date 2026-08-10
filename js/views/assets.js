/**
 * Asset Management View Component
 * Asset listing, filtering, search, sorting, asset modal form (Upload or URL preview), and CRUD actions.
 */

const AssetsView = {
  searchQuery: '',
  filterStore: 'ALL',
  filterCategory: 'ALL',
  filterStatus: 'ALL',
  filterCondition: 'ALL',
  sortBy: 'dueDate', // name, dueDate, cost

  render() {
    let assets = storage.getAssets();
    const stores = storage.getStores();

    // Map computed status
    assets = assets.map(asset => ({
      ...asset,
      statusInfo: Utils.calculateStatus(asset)
    }));

    // Extract categories
    const categories = Array.from(new Set(assets.map(a => a.category))).filter(Boolean);

    // Apply Search Filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      assets = assets.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.serialId.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.storeName.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      );
    }

    // Apply Filters
    if (this.filterStore !== 'ALL') {
      assets = assets.filter(a => a.storeId === this.filterStore);
    }
    if (this.filterCategory !== 'ALL') {
      assets = assets.filter(a => a.category === this.filterCategory);
    }
    if (this.filterStatus !== 'ALL') {
      assets = assets.filter(a => a.statusInfo.key === this.filterStatus);
    }
    if (this.filterCondition !== 'ALL') {
      assets = assets.filter(a => a.condition === this.filterCondition);
    }

    // Apply Sorting
    assets.sort((a, b) => {
      if (this.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (this.sortBy === 'cost') {
        return (parseFloat(b.cost) || 0) - (parseFloat(a.cost) || 0);
      } else if (this.sortBy === 'dueDate') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });

    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">Asset Management</h1>
          <p class="view-subtitle">Monitor, assign, edit, and track equipment across all store locations.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="AssetsView.openAssetModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Create New Asset
          </button>
        </div>
      </div>

      <!-- SEARCH & FILTER TOOLBAR -->
      <div class="card-box" style="margin-bottom: 24px;">
        <div class="filter-toolbar" style="flex-wrap: wrap; gap: 16px;">
          <div class="search-input-wrapper" style="flex: 1 1 300px;">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              class="form-control search-field" 
              placeholder="Search by asset name, ID, category, or location..." 
              value="${Utils.escapeHtml(this.searchQuery)}"
              oninput="AssetsView.handleSearch(this.value)"
            />
          </div>

          <!-- FILTERS -->
          <div class="filter-group">
            <label class="form-label-inline">Store:</label>
            <select class="form-control" onchange="AssetsView.handleFilterStore(this.value)">
              <option value="ALL" ${this.filterStore === 'ALL' ? 'selected' : ''}>All Stores</option>
              ${stores.map(s => `<option value="${s.id}" ${this.filterStore === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Category:</label>
            <select class="form-control" onchange="AssetsView.handleFilterCategory(this.value)">
              <option value="ALL" ${this.filterCategory === 'ALL' ? 'selected' : ''}>All Categories</option>
              ${categories.map(c => `<option value="${c}" ${this.filterCategory === c ? 'selected' : ''}>${Utils.escapeHtml(c)}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Status:</label>
            <select class="form-control" onchange="AssetsView.handleFilterStatus(this.value)">
              <option value="ALL" ${this.filterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="OVERDUE" ${this.filterStatus === 'OVERDUE' ? 'selected' : ''}>Overdue (Red)</option>
              <option value="DUE_TODAY" ${this.filterStatus === 'DUE_TODAY' ? 'selected' : ''}>Due Today (Blue)</option>
              <option value="DUE_SOON" ${this.filterStatus === 'DUE_SOON' ? 'selected' : ''}>Due Soon (Orange)</option>
              <option value="UPCOMING" ${this.filterStatus === 'UPCOMING' ? 'selected' : ''}>Upcoming (Gray)</option>
              <option value="COMPLETED" ${this.filterStatus === 'COMPLETED' ? 'selected' : ''}>Completed (Green)</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Condition:</label>
            <select class="form-control" onchange="AssetsView.handleFilterCondition(this.value)">
              <option value="ALL" ${this.filterCondition === 'ALL' ? 'selected' : ''}>All Conditions</option>
              <option value="Excellent" ${this.filterCondition === 'Excellent' ? 'selected' : ''}>Excellent</option>
              <option value="Good" ${this.filterCondition === 'Good' ? 'selected' : ''}>Good</option>
              <option value="Needs Repair" ${this.filterCondition === 'Needs Repair' ? 'selected' : ''}>Needs Repair</option>
              <option value="Under Maintenance" ${this.filterCondition === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
              <option value="Damaged" ${this.filterCondition === 'Damaged' ? 'selected' : ''}>Damaged</option>
              <option value="Retired" ${this.filterCondition === 'Retired' ? 'selected' : ''}>Retired</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label-inline">Sort By:</label>
            <select class="form-control" onchange="AssetsView.handleSort(this.value)">
              <option value="dueDate" ${this.sortBy === 'dueDate' ? 'selected' : ''}>Due Date</option>
              <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Asset Name</option>
              <option value="cost" ${this.sortBy === 'cost' ? 'selected' : ''}>Estimated Cost</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ASSET TABLE LIST -->
      <div class="card-box">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Photo & Asset Info</th>
                <th>Category</th>
                <th>Assigned Store & Area</th>
                <th>Scheduled Due Date</th>
                <th>Condition</th>
                <th>Maintenance Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                assets.length === 0
                  ? `<tr><td colspan="7" class="empty-state">No assets found matching your criteria.</td></tr>`
                  : assets.map(asset => `
                      <tr>
                        <td>
                          <div class="asset-cell">
                            <img src="${Utils.escapeHtml(asset.imageUrl || Utils.getDefaultAssetImage())}" class="asset-thumb-lg" alt="Asset" onerror="this.src=Utils.getDefaultAssetImage()" />
                            <div>
                              <strong class="asset-title-link" onclick="App.showAssetDetails('${asset.id}')">${Utils.escapeHtml(asset.name)}</strong>
                              <div class="text-subtle">ID: ${Utils.escapeHtml(asset.serialId || 'N/A')}</div>
                              <div class="text-subtle">Value: ${Utils.formatCurrency(asset.cost)}</div>
                            </div>
                          </div>
                        </td>
                        <td><span class="category-pill">${Utils.escapeHtml(asset.category)}</span></td>
                        <td>
                          <strong>${Utils.escapeHtml(asset.storeName)}</strong>
                          <div class="text-subtle">${Utils.escapeHtml(asset.location)}</div>
                        </td>
                        <td>
                          <strong>${Utils.formatDate(asset.dueDate)}</strong>
                          <div class="text-subtle">${Utils.getRelativeDateDisplay(asset.dueDate, asset.isCompleted)}</div>
                          <div class="text-subtle" style="font-size: 0.75rem;">Cycle: ${Utils.escapeHtml(asset.cycle)}</div>
                        </td>
                        <td>
                          <span class="condition-tag condition-${asset.condition.toLowerCase().replace(/\s+/g, '-')}">
                            ${Utils.escapeHtml(asset.condition)}
                          </span>
                        </td>
                        <td>
                          <span class="badge ${asset.statusInfo.badgeClass}">
                            ${asset.statusInfo.label}
                          </span>
                        </td>
                        <td style="text-align: right;">
                          <div class="action-btn-group">
                            <button class="btn btn-primary btn-sm" title="View Full Details" onclick="App.showAssetDetails('${asset.id}')">Details</button>
                            <button class="btn btn-secondary btn-sm" title="Complete Maintenance" onclick="App.openOverrideModal('${asset.id}')">Complete</button>
                            <button class="btn btn-outline btn-sm" title="Edit Asset" onclick="AssetsView.openAssetModal('${asset.id}')">Edit</button>
                            <button class="btn btn-danger btn-sm" title="Delete Asset" onclick="AssetsView.deleteAsset('${asset.id}')">Delete</button>
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

  handleFilterStore(val) {
    this.filterStore = val;
    App.renderCurrentView();
  },

  handleFilterCategory(val) {
    this.filterCategory = val;
    App.renderCurrentView();
  },

  handleFilterStatus(val) {
    this.filterStatus = val;
    App.renderCurrentView();
  },

  handleFilterCondition(val) {
    this.filterCondition = val;
    App.renderCurrentView();
  },

  handleSort(val) {
    this.sortBy = val;
    App.renderCurrentView();
  },

  deleteAsset(assetId) {
    const asset = storage.getAssetById(assetId);
    if (!asset) return;
    if (confirm(`Are you sure you want to delete asset "${asset.name}" (${asset.serialId})?`)) {
      storage.deleteAsset(assetId);
      storage.logActivity('Admin Deleted Asset', `Deleted asset ${asset.name} (${asset.serialId})`, asset.storeName, asset.name);
      Utils.showToast(`Asset "${asset.name}" deleted.`, 'info');
      App.renderCurrentView();
    }
  },

  openAssetModal(assetId = null) {
    const asset = assetId ? storage.getAssetById(assetId) : null;
    const stores = storage.getStores();
    const isEdit = !!asset;

    const modalHtml = `
      <div class="modal-overlay" id="assetModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <h3>${isEdit ? 'Edit Asset' : 'Create New Asset'}</h3>
            <button class="modal-close-btn" onclick="App.closeModal('assetModal')">&times;</button>
          </div>
          <form onsubmit="AssetsView.handleSaveAsset(event, '${assetId || ''}')">
            <div class="modal-body">
              <div class="form-grid">
                <!-- Required Fields -->
                <div class="form-group">
                  <label class="form-label">Asset Name <span class="required">*</span></label>
                  <input type="text" id="assetName" class="form-control" required placeholder="e.g. Receipt Printer HP-500" value="${Utils.escapeHtml(asset ? asset.name : '')}" />
                </div>

                ${(() => {
                  const stdCategories = ['POS Hardware', 'Security', 'Facilities', 'Inventory Tools', 'Power & Electrical', 'IT Equipment', 'Store Furniture'];
                  const isCustomCat = asset && asset.category && !stdCategories.includes(asset.category);
                  return `
                    <div class="form-group">
                      <label class="form-label">Category <span class="required">*</span></label>
                      <select id="assetCategory" class="form-control" required onchange="AssetsView.toggleCustomCategoryInput(this.value)">
                        <option value="">Select Category...</option>
                        <option value="POS Hardware" ${asset && asset.category === 'POS Hardware' ? 'selected' : ''}>POS Hardware</option>
                        <option value="Security" ${asset && asset.category === 'Security' ? 'selected' : ''}>Security</option>
                        <option value="Facilities" ${asset && asset.category === 'Facilities' ? 'selected' : ''}>Facilities</option>
                        <option value="Inventory Tools" ${asset && asset.category === 'Inventory Tools' ? 'selected' : ''}>Inventory Tools</option>
                        <option value="Power & Electrical" ${asset && asset.category === 'Power & Electrical' ? 'selected' : ''}>Power & Electrical</option>
                        <option value="IT Equipment" ${asset && asset.category === 'IT Equipment' ? 'selected' : ''}>IT Equipment</option>
                        <option value="Store Furniture" ${asset && asset.category === 'Store Furniture' ? 'selected' : ''}>Store Furniture</option>
                        <option value="Custom" ${isCustomCat ? 'selected' : ''}>+ Add Custom Category...</option>
                      </select>
                    </div>

                    <div class="form-group" id="customCategoryWrapper" style="display: ${isCustomCat ? 'block' : 'none'};">
                      <label class="form-label">Type Custom Category Name <span class="required">*</span></label>
                      <input type="text" id="assetCustomCategory" class="form-control" placeholder="e.g. Refrigeration, Audio System, HVAC, Vehicle" value="${isCustomCat ? Utils.escapeHtml(asset.category) : ''}" />
                    </div>
                  `;
                })()}

                <div class="form-group">
                  <label class="form-label">Assigned Store <span class="required">*</span></label>
                  <select id="assetStoreId" class="form-control" required>
                    <option value="">Select Store Location...</option>
                    ${stores.map(s => `<option value="${s.id}" ${asset && asset.storeId === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)} (${Utils.escapeHtml(s.code)})</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Location / Area <span class="required">*</span></label>
                  <input type="text" id="assetLocation" class="form-control" required placeholder="e.g. Cashier Counter 1, Back Stockroom" value="${Utils.escapeHtml(asset ? asset.location : '')}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Scheduled Due Date <span class="required">*</span></label>
                  <input type="date" id="assetDueDate" class="form-control" required value="${asset ? asset.dueDate : Utils.getTodayStr()}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Maintenance Cycle <span class="required">*</span></label>
                  <select id="assetCycle" class="form-control" onchange="AssetsView.toggleCustomDaysInput(this.value)">
                    <option value="No Repeat" ${asset && asset.cycle === 'No Repeat' ? 'selected' : ''}>No Repeat</option>
                    <option value="Weekly" ${asset && asset.cycle === 'Weekly' ? 'selected' : ''}>Weekly (Every 7 days)</option>
                    <option value="Monthly" ${!asset || asset.cycle === 'Monthly' ? 'selected' : ''}>Monthly</option>
                    <option value="Every 2 Months" ${asset && asset.cycle === 'Every 2 Months' ? 'selected' : ''}>Every 2 Months</option>
                    <option value="Every 3 Months" ${asset && asset.cycle === 'Every 3 Months' ? 'selected' : ''}>Every 3 Months</option>
                    <option value="Every 6 Months" ${asset && asset.cycle === 'Every 6 Months' ? 'selected' : ''}>Every 6 Months</option>
                    <option value="Yearly" ${asset && asset.cycle === 'Yearly' ? 'selected' : ''}>Yearly</option>
                    <option value="Custom" ${asset && asset.cycle === 'Custom' ? 'selected' : ''}>Custom Days</option>
                  </select>
                </div>

                <div class="form-group" id="customDaysWrapper" style="display: ${asset && asset.cycle === 'Custom' ? 'block' : 'none'};">
                  <label class="form-label">Custom Repeat Interval (Days)</label>
                  <input type="number" id="assetCustomDays" class="form-control" min="1" placeholder="e.g. 45" value="${asset ? asset.customDays || 30 : 30}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Asset Condition <span class="required">*</span></label>
                  <select id="assetCondition" class="form-control" required>
                    <option value="Excellent" ${!asset || asset.condition === 'Excellent' ? 'selected' : ''}>Excellent</option>
                    <option value="Good" ${asset && asset.condition === 'Good' ? 'selected' : ''}>Good</option>
                    <option value="Needs Repair" ${asset && asset.condition === 'Needs Repair' ? 'selected' : ''}>Needs Repair</option>
                    <option value="Under Maintenance" ${asset && asset.condition === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                    <option value="Damaged" ${asset && asset.condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
                    <option value="Retired" ${asset && asset.condition === 'Retired' ? 'selected' : ''}>Retired</option>
                  </select>
                </div>

                <!-- Optional Fields -->
                <div class="form-group">
                  <label class="form-label">Serial / Asset ID (Optional)</label>
                  <input type="text" id="assetSerial" class="form-control" placeholder="e.g. AST-007 or SN-88941" value="${Utils.escapeHtml(asset ? asset.serialId : '')}" />
                </div>

                <div class="form-group">
                  <label class="form-label">Estimated Value / Cost ($) (Optional)</label>
                  <input type="number" id="assetCost" class="form-control" step="0.01" placeholder="e.g. 500" value="${asset ? asset.cost || '' : ''}" />
                </div>

                <!-- Clean Asset Image Selection Card -->
                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">Asset Image (File Upload or Web URL)</label>
                  <input type="hidden" id="assetImageData" value="${Utils.escapeHtml(asset ? asset.imageUrl || '' : '')}" />

                  <div class="asset-image-uploader-card">
                    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                      <div style="width: 110px; height: 110px; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; background: #ffffff; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                        <img id="imagePreview" src="${Utils.escapeHtml(asset ? asset.imageUrl || Utils.getDefaultAssetImage() : Utils.getDefaultAssetImage())}" alt="Preview" class="img-preview-box" onerror="this.src=Utils.getDefaultAssetImage()" />
                      </div>

                      <div style="flex: 1; min-width: 240px;">
                        <div style="margin-bottom: 8px;">
                          <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 2px;">Upload from Device / Camera:</label>
                          <input type="file" id="assetImageFile" class="form-control" accept="image/*" onchange="AssetsView.handleFileUpload(this)" style="padding: 4px 8px; font-size: 0.85rem;" />
                        </div>

                        <div>
                          <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 2px;">Or Enter Web Image URL:</label>
                          <input type="text" id="assetImageUrlInput" class="form-control" placeholder="https://example.com/photo.jpg" value="${asset && asset.imageUrl && !asset.imageUrl.startsWith('data:') ? Utils.escapeHtml(asset.imageUrl) : ''}" oninput="AssetsView.handleUrlInput(this.value)" />
                        </div>

                        <div id="imageUploadStatus" style="margin-top: 6px; font-size: 0.76rem; color: #64748b;">
                          ${asset && asset.imageUrl && asset.imageUrl.startsWith('data:') ? '📷 Custom uploaded photo loaded.' : 'Select a photo file or enter an image URL.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">Description (Optional)</label>
                  <textarea id="assetDescription" class="form-control" rows="3" placeholder="Enter asset specifications, serial details, or notes...">${Utils.escapeHtml(asset ? asset.description || '' : '')}</textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('assetModal')">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Update Asset' : 'Save Asset'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    App.showModal(modalHtml);
  },

  toggleCustomCategoryInput(catVal) {
    const el = document.getElementById('customCategoryWrapper');
    if (el) {
      el.style.display = catVal === 'Custom' ? 'block' : 'none';
    }
  },

  toggleCustomDaysInput(cycle) {
    const el = document.getElementById('customDaysWrapper');
    if (el) {
      el.style.display = cycle === 'Custom' ? 'block' : 'none';
    }
  },

  handleUrlInput(url) {
    const img = document.getElementById('imagePreview');
    const dataInput = document.getElementById('assetImageData');
    const status = document.getElementById('imageUploadStatus');
    if (url) {
      if (dataInput) dataInput.value = url;
      if (img) img.src = url;
      if (status) status.innerHTML = '🌐 Web image URL loaded.';
    }
  },

  handleFileUpload(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const dataUrl = e.target.result;
        const dataInput = document.getElementById('assetImageData');
        const urlInput = document.getElementById('assetImageUrlInput');
        const img = document.getElementById('imagePreview');
        const status = document.getElementById('imageUploadStatus');

        if (dataInput) dataInput.value = dataUrl;
        if (urlInput) urlInput.value = ''; // Do NOT fill text input with raw 1000-char base64 string!
        if (img) img.src = dataUrl;
        if (status) status.innerHTML = '✓ Photo loaded successfully from device.';
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  handleSaveAsset(event, assetId) {
    event.preventDefault();

    const name = document.getElementById('assetName').value.trim();
    let category = document.getElementById('assetCategory').value;

    if (category === 'Custom') {
      const customCategoryVal = document.getElementById('assetCustomCategory')?.value.trim();
      if (!customCategoryVal) {
        alert('Validation Error: Please type a custom category name.');
        return;
      }
      category = customCategoryVal;
    }
    const storeId = document.getElementById('assetStoreId').value;
    const location = document.getElementById('assetLocation').value.trim();
    const dueDate = document.getElementById('assetDueDate').value;
    const cycle = document.getElementById('assetCycle').value;
    const customDays = parseInt(document.getElementById('assetCustomDays')?.value) || 30;
    const condition = document.getElementById('assetCondition').value;
    const serialId = document.getElementById('assetSerial').value.trim() || ('AST-' + Math.floor(100 + Math.random() * 900));
    const cost = parseFloat(document.getElementById('assetCost').value) || 0;
    const imageUrl = document.getElementById('assetImageData').value.trim() || Utils.getDefaultAssetImage();
    const description = document.getElementById('assetDescription').value.trim();

    const store = storage.getStores().find(s => s.id === storeId);
    const storeName = store ? store.name : 'Unknown Store';

    const existingAsset = assetId ? storage.getAssetById(assetId) : null;

    const assetObj = {
      id: assetId || undefined,
      serialId,
      name,
      category,
      storeId,
      storeName,
      location,
      dueDate,
      cycle,
      customDays,
      condition,
      cost,
      imageUrl,
      description,
      isCompleted: existingAsset ? existingAsset.isCompleted : false,
      lastCompletedDate: existingAsset ? existingAsset.lastCompletedDate : 'None'
    };

    const savedAsset = storage.saveAsset(assetObj);
    const action = assetId ? 'Admin Edited Asset' : 'Admin Created Asset';
    storage.logActivity(action, `${action}: ${name} (${serialId}) assigned to ${storeName}`, storeName, name);

    // Create Notification
    storage.addNotification({
      message: `${action}: ${name} (${serialId}) for ${storeName}`,
      assetId: savedAsset.id,
      assetName: name,
      storeName,
      userName: 'System Admin',
      userRole: 'Admin'
    });

    Utils.showToast(`Asset "${name}" saved successfully!`, 'success');
    App.closeModal('assetModal');
    App.renderCurrentView();
  }
};
