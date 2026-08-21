/**
 * Utility Functions for Asset Management Admin System
 * Status calculations, date arithmetic, recurring maintenance calculation, formatting, export tools.
 */

const Utils = {
  // Parse YYYY-MM-DD or ISO string safely into a Date object at local midnight (prevents UTC shift bugs)
  parseLocalDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    return new Date(dateStr);
  },

  // Get Today's date formatted YYYY-MM-DD
  getTodayStr() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Default clean SVG placeholder when no equipment image is uploaded
  getDefaultAssetImage() {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%23f1f5f9' stroke='%2394a3b8' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";
  },

  /**
   * AUTOMATIC MAINTENANCE STATUS CALCULATION
   * Rules:
   * - COMPLETED: Marked completed
   * - DUE TODAY: Scheduled date is today
   * - OVERDUE: Scheduled date passed and not completed
   * - DUE SOON: Scheduled date is within 7 days
   * - UPCOMING: Scheduled date is more than 7 days away
   */
  calculateStatus(asset) {
    if (!asset) return { key: 'UPCOMING', label: 'Upcoming', badgeClass: 'badge-upcoming', color: '#6b7280', bgColor: '#f3f4f6' };

    if (asset.isCompleted) {
      return {
        key: 'COMPLETED',
        label: '✓ Completed',
        badgeClass: 'badge-completed',
        color: '#059669',
        bgColor: '#d1fae5'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = this.parseLocalDate(asset.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        key: 'OVERDUE',
        label: 'Overdue',
        badgeClass: 'badge-overdue',
        color: '#ef4444',
        bgColor: '#fee2e2'
      };
    } else if (diffDays === 0) {
      return {
        key: 'DUE_TODAY',
        label: 'Due Today',
        badgeClass: 'badge-due-today',
        color: '#3b82f6',
        bgColor: '#dbeafe'
      };
    } else if (diffDays <= 7) {
      return {
        key: 'DUE_SOON',
        label: 'Due Soon',
        badgeClass: 'badge-due-soon',
        color: '#f59e0b',
        bgColor: '#fef3c7'
      };
    } else {
      return {
        key: 'UPCOMING',
        label: 'Upcoming',
        badgeClass: 'badge-upcoming',
        color: '#6b7280',
        bgColor: '#f3f4f6'
      };
    }
  },

  /**
   * RECURRING MAINTENANCE NEXT DUE DATE CALCULATION
   * Returns next YYYY-MM-DD date string based on cycle
   */
  calculateNextDueDate(baseDateStr, cycle, customDays = 30) {
    if (!baseDateStr || baseDateStr === 'None') return this.getTodayStr();
    const d = this.parseLocalDate(baseDateStr);

    switch (cycle) {
      case 'Weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'Monthly':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'Every 2 Months':
        d.setMonth(d.getMonth() + 2);
        break;
      case 'Every 3 Months':
        d.setMonth(d.getMonth() + 3);
        break;
      case 'Every 6 Months':
        d.setMonth(d.getMonth() + 6);
        break;
      case 'Every 9 Months':
        d.setMonth(d.getMonth() + 9);
        break;
      case 'Yearly':
        d.setFullYear(d.getFullYear() + 1);
        break;
      case 'Custom':
      case 'Custom Days':
        d.setDate(d.getDate() + (parseInt(customDays) || 30));
        break;
      case 'Input Date':
      case 'Custom Date':
      case 'No Repeat':
      default:
        return baseDateStr;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Maintenance Cycle Display Formatter (e.g. "Oct 31, 2026")
  getCycleDisplay(asset) {
    if (!asset || !asset.cycle) return 'N/A';
    if (asset.cycle === 'Input Date' || asset.cycle === 'Custom Date') {
      const dateVal = asset.nextDueDate || asset.dueDate;
      return dateVal ? this.formatDate(dateVal) : 'N/A';
    }
    return asset.cycle;
  },

  // Comprehensive Store Assignment Matching for Employee Scoping
  isAssetAssignedToUserStore(asset, user) {
    if (!asset || !user) return false;

    const uId = user.storeId ? String(user.storeId).toLowerCase().trim() : '';
    const uCode = user.storeCode ? String(user.storeCode).toLowerCase().trim() : '';
    const uName = user.storeName ? String(user.storeName).toLowerCase().trim() : '';
    const uUser = user.username ? String(user.username).toLowerCase().trim() : '';

    const aStoreId = asset.storeId ? String(asset.storeId).toLowerCase().trim() : '';
    const aStoreName = asset.storeName ? String(asset.storeName).toLowerCase().trim() : '';

    if (aStoreId && (aStoreId === uId || aStoreId === uCode || aStoreId === uName || aStoreId === uUser)) {
      return true;
    }

    if (aStoreName && (aStoreName === uName || aStoreName === uCode || aStoreName === uUser || aStoreName === uId)) {
      return true;
    }

    if (window.storage && typeof window.storage.getStores === 'function') {
      const stores = window.storage.getStores();
      const matchedStore = stores.find(s =>
        (uId && String(s.id).toLowerCase().trim() === uId) ||
        (uCode && String(s.code).toLowerCase().trim() === uCode) ||
        (uUser && String(s.username).toLowerCase().trim() === uUser) ||
        (uName && String(s.name).toLowerCase().trim() === uName)
      );

      if (matchedStore) {
        const sId = String(matchedStore.id || '').toLowerCase().trim();
        const sCode = String(matchedStore.code || '').toLowerCase().trim();
        const sName = String(matchedStore.name || '').toLowerCase().trim();
        const sUser = String(matchedStore.username || '').toLowerCase().trim();

        if (aStoreId && (aStoreId === sId || aStoreId === sCode || aStoreId === sName || aStoreId === sUser)) {
          return true;
        }
        if (aStoreName && (aStoreName === sId || aStoreName === sCode || aStoreName === sName || aStoreName === sUser)) {
          return true;
        }
      }
    }

    return false;
  },

  // Date Formatter: "Aug 15, 2026"
  formatDate(dateStr) {
    if (!dateStr || dateStr === 'None') return 'N/A';
    try {
      const d = this.parseLocalDate(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  // Relative Date Display e.g. "Today", "In 3 days", "2 days overdue"
  getRelativeDateDisplay(dateStr, isCompleted = false) {
    if (isCompleted) return 'Completed';
    if (!dateStr) return 'N/A';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = this.parseLocalDate(dateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return 'Yesterday (Overdue)';
    return `${Math.abs(diffDays)} days overdue`;
  },

  // Currency Formatter
  formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  },

  // XSS Protection / Sanitization
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Toast Notification Message Generator
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'i-info';
    if (type === 'success') icon = '✓';
    if (type === 'warning') icon = '⚠';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${Utils.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Download CSV Data Tool
  downloadCSV(filename, rows) {
    const processRow = function (row) {
      let finalVal = '';
      for (let j = 0; j < row.length; j++) {
        let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        }
        let result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
          result = '"' + result + '"';
        if (j > 0)
          finalVal += ',';
        finalVal += result;
      }
      return finalVal + '\n';
    };

    let csvFile = '';
    for (let i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * AUTOMATIC IMAGE COMPRESSOR
   * Resizes large photos (camera/file uploads) to max 800px & JPEG 0.7 quality to fit localStorage and Supabase.
   */
  compressImage(file, callback, maxDimension = 800, quality = 0.7) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      if (callback) callback(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (callback) callback(dataUrl);
      };
      img.onerror = function () {
        if (callback) callback(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = function () {
      if (callback) callback(null);
    };
    reader.readAsDataURL(file);
  }
};
