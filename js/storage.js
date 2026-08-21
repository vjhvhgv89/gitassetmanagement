/**
 * Storage & Data Management System for Asset Management App
 * Connects directly to Supabase PostgreSQL Database & Storage buckets with UUID generator.
 * Supabase Project: https://scjntsmoylzakwkeaska.supabase.co
 */

const SUPABASE_URL = 'https://scjntsmoylzakwkeaska.supabase.co';
const SUPABASE_KEY = 'sb_publishable_j3V1fgsQc3wsW8rSwoGegw_MZhjjmoc';

const STORAGE_KEYS = {
  ADMIN_SESSION: 'asset_auth_user',
  STORES: 'asset_stores',
  ASSETS: 'asset_assets',
  MAINTENANCE_HISTORY: 'asset_maintenance_history',
  NOTIFICATIONS: 'asset_notifications',
  ACTIVITY_LOGS: 'asset_activity_logs',
  SETTINGS: 'asset_settings'
};

const INITIAL_STORES = [];
const INITIAL_ASSETS = [];
const INITIAL_NOTIFICATIONS = [];
const INITIAL_ACTIVITY_LOGS = [];
const INITIAL_MAINTENANCE_HISTORY = [];
const INITIAL_COMMENTS = {};

const INITIAL_SETTINGS = {
  adminName: 'System Administrator',
  adminEmail: 'admin@assetmanage.com',
  notificationsEmail: true,
  notificationsOverdueAlerts: true,
  notificationsDailySummary: true,
  density: 'comfortable',
  systemTitle: 'Simple Asset Management System - Admin'
};

// UUID Generator for PostgreSQL Primary Keys
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

class StorageManager {
  constructor() {
    this.supabase = null;
    this.realtimeChannel = null;
    this.lastSyncTime = null;
    this.isSyncing = false;
    this.initSupabase();
    this.init();
    this.initAutoSync();
  }

  initSupabase() {
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        console.log('✅ Connected to Supabase Cloud Database:', SUPABASE_URL);
        this.initRealtimeSubscriptions();
      } else {
        console.warn('⚠️ Supabase JS SDK loading. Running local fallback mode.');
      }
    } catch (e) {
      console.error('❌ Supabase Client Error:', e);
    }
  }

  initRealtimeSubscriptions() {
    if (!this.supabase || typeof this.supabase.channel !== 'function') return;
    try {
      if (this.realtimeChannel) {
        this.supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = this.supabase
        .channel('app-db-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          console.log('⚡ Realtime Cloud Event Received:', payload.table, payload.eventType);
          this.syncFromSupabase();
        })
        .subscribe((status) => {
          console.log('📡 Supabase Realtime Status:', status);
        });
    } catch (err) {
      console.warn('Supabase Realtime Subscription Note:', err);
    }
  }

  initAutoSync() {
    // 1. Auto-sync on browser tab focus / visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('👁️ Tab active: refreshing data from cloud...');
          this.syncFromSupabase();
        }
      });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncFromSupabase();
      });
      window.addEventListener('online', () => {
        console.log('🌐 Network online detected: auto-syncing...');
        this.syncFromSupabase();
      });
    }

    // 2. Periodic background sync every 60 seconds
    if (this._syncInterval) clearInterval(this._syncInterval);
    this._syncInterval = setInterval(() => {
      this.syncFromSupabase();
    }, 60000);
  }

  async init() {
    if (!localStorage.getItem(STORAGE_KEYS.STORES)) localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    if (!localStorage.getItem(STORAGE_KEYS.ASSETS)) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(INITIAL_ASSETS));
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(INITIAL_ACTIVITY_LOGS));
    if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE_HISTORY)) localStorage.setItem(STORAGE_KEYS.MAINTENANCE_HISTORY, JSON.stringify(INITIAL_MAINTENANCE_HISTORY));
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    if (!localStorage.getItem('asset_comments')) localStorage.setItem('asset_comments', JSON.stringify(INITIAL_COMMENTS));

    this.syncFromSupabase();
  }

  async refreshDatabase() {
    console.log('🔄 Refreshing database & syncing from Supabase...');
    await this.syncFromSupabase(true);
    if (window.App && typeof window.App.renderCurrentView === 'function') {
      window.App.renderCurrentView();
    }
    if (window.Utils && typeof window.Utils.showToast === 'function') {
      window.Utils.showToast('Database refreshed & synchronized with Supabase!', 'success');
    }
  }

  async syncFromSupabase(forceNotify = false) {
    if (!this.supabase) {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        this.initSupabase();
      }
      if (!this.supabase) return;
    }
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      let dataChanged = false;

      // 1. Sync Stores from Supabase
      const { data: dbStores, error: errStores } = await this.supabase.from('stores').select('*');
      if (dbStores && Array.isArray(dbStores)) {
        const localStores = this.get(STORAGE_KEYS.STORES) || [];
        const mappedStores = dbStores.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          username: s.username,
          password: s.password_hash,
          managerName: s.manager_name,
          email: s.email,
          status: s.status,
          createdAt: s.created_at
        }));
        
        const mergedStores = [...mappedStores];
        localStores.forEach(ls => {
          if (!mergedStores.some(s => s.id === ls.id || s.code === ls.code)) {
            mergedStores.push(ls);
          }
        });
        this.set(STORAGE_KEYS.STORES, mergedStores);
        dataChanged = true;
      }

      // 2. Sync Assets from Supabase
      const { data: dbAssets, error: errAssets } = await this.supabase.from('assets').select('*');
      if (dbAssets && Array.isArray(dbAssets)) {
        const localAssets = this.get(STORAGE_KEYS.ASSETS) || [];
        const mappedAssets = dbAssets.map(a => {
          // Preserve locally-stored overrideStatus so admin overrides survive cloud sync
          const localMatch = localAssets.find(la => la.id === a.id);
          return {
            id: a.id,
            serialId: a.serial_id,
            name: a.name,
            category: a.category,
            storeId: a.store_id,
            storeName: a.store_name,
            location: a.location,
            dueDate: a.due_date,
            nextDueDate: a.next_due_date || (window.Utils ? window.Utils.calculateNextDueDate(a.due_date, a.cycle, a.custom_days) : null),
            cycle: a.cycle,
            customDays: a.custom_days || 30,
            condition: a.condition,
            cost: a.cost,
            imageUrl: a.image_url,
            description: a.description,
            isCompleted: a.is_completed,
            lastCompletedDate: a.last_completed_date || 'None',
            createdAt: a.created_at,
            overrideStatus: localMatch ? (localMatch.overrideStatus || null) : null
          };
        });

        this.set(STORAGE_KEYS.ASSETS, mappedAssets);
        dataChanged = true;
      }


      // 3. Sync Maintenance History from Supabase
      const { data: dbHistory, error: errHistory } = await this.supabase.from('maintenance_history').select('*').order('created_at', { ascending: false });
      if (dbHistory && Array.isArray(dbHistory)) {
        const localHistory = this.get(STORAGE_KEYS.MAINTENANCE_HISTORY) || [];
        const mappedHistory = dbHistory.map(h => ({
          id: h.id,
          assetId: h.asset_id,
          completedDate: h.completed_date,
          scheduledDueDate: h.scheduled_due_date,
          isLate: h.is_late,
          daysLate: h.days_late,
          isEarly: h.is_early,
          daysEarly: h.days_early,
          completedBy: h.completed_by,
          status: h.status,
          comments: h.comments,
          photos: h.photos || [],
          isOverride: h.is_override,
          overrideReason: h.override_reason,
          createdAt: h.created_at
        }));

        const mergedHistory = [...mappedHistory];
        localHistory.forEach(lh => {
          if (!mergedHistory.some(mh => mh.id === lh.id)) {
            mergedHistory.push(lh);
          }
        });

        this.set(STORAGE_KEYS.MAINTENANCE_HISTORY, mergedHistory);
        dataChanged = true;
      }

      // 4. Sync Asset Comments from Supabase
      try {
        const { data: dbComments, error: errComments } = await this.supabase.from('asset_comments').select('*').order('created_at', { ascending: true });
        if (dbComments && Array.isArray(dbComments)) {
          const commentsMap = this._getCommentsMap();
          dbComments.forEach(c => {
            const aId = c.asset_id;
            if (aId) {
              const cmtObj = {
                id: c.id,
                assetId: aId,
                user: c.user_name,
                role: c.role,
                text: c.text,
                photoUrl: c.photo_url || null,
                timestamp: c.created_at
              };

              const storeInKey = (key) => {
                if (!key) return;
                const strKey = String(key).trim();
                if (!commentsMap[strKey]) commentsMap[strKey] = [];
                const idx = commentsMap[strKey].findIndex(item => item.id === c.id);
                if (idx >= 0) commentsMap[strKey][idx] = cmtObj;
                else commentsMap[strKey].push(cmtObj);
              };

              // Store under raw database asset_id
              storeInKey(aId);

              // Also resolve against matched asset and store under all its aliases
              const matchedAsset = this.getAssetById(aId);
              if (matchedAsset) {
                if (matchedAsset.id) storeInKey(matchedAsset.id);
                if (matchedAsset.serialId) storeInKey(matchedAsset.serialId);
                if (matchedAsset.name) storeInKey(matchedAsset.name);
              }
            }
          });
          this._saveCommentsMap(commentsMap);
          dataChanged = true;
        }
      } catch (errCmtSync) {
        console.warn('Supabase Comment Sync Note:', errCmtSync);
      }

      // 5. Sync Activity Logs from Supabase
      try {
        const { data: dbLogs } = await this.supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(60);
        if (dbLogs && Array.isArray(dbLogs) && dbLogs.length > 0) {
          const mappedLogs = dbLogs.map(l => ({
            id: l.id,
            date: l.created_at ? l.created_at.split('T')[0] : (window.Utils ? window.Utils.getTodayStr() : ''),
            time: l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            user: l.user_name,
            role: l.role,
            store: l.store_name,
            asset: l.asset_name,
            action: l.action,
            details: l.details
          }));
          this.set(STORAGE_KEYS.ACTIVITY_LOGS, mappedLogs);
          dataChanged = true;
        }
      } catch (errLogSync) {
        console.warn('Supabase Log Sync Note:', errLogSync);
      }

      // 6. Sync Notifications from Supabase
      try {
        const { data: dbNotifs } = await this.supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60);
        if (dbNotifs && Array.isArray(dbNotifs) && dbNotifs.length > 0) {
          const mappedNotifs = dbNotifs.map(n => ({
            id: n.id,
            message: n.message,
            assetId: n.asset_id,
            assetName: n.asset_name,
            storeName: n.store_name,
            userName: n.user_name,
            userRole: n.user_role,
            isRead: n.is_read,
            date: n.created_at
          }));
          this.set(STORAGE_KEYS.NOTIFICATIONS, mappedNotifs);
          dataChanged = true;
        }
      } catch (errNotifSync) {
        console.warn('Supabase Notification Sync Note:', errNotifSync);
      }

      this.lastSyncTime = new Date();

      if ((dataChanged || forceNotify) && window.App) {
        if (typeof window.App.renderCurrentView === 'function') {
          window.App.renderCurrentView();
        }
        if (typeof window.App.updateUnreadCountBadge === 'function') {
          window.App.updateUnreadCountBadge();
        }
        if (typeof window.App.updateEmpUnreadCountBadge === 'function') {
          window.App.updateEmpUnreadCountBadge();
        }
        if (typeof window.App.updateSyncBadge === 'function') {
          window.App.updateSyncBadge();
        }

        // Live refresh open details modal if present
        const adminModal = document.getElementById('assetDetailsModal');
        if (adminModal && window.AssetDetailsView) {
          const activeTabBtn = adminModal.querySelector('.details-tab-btn.active');
          const tabKey = activeTabBtn ? activeTabBtn.id.replace('tabHead', '').toLowerCase() : 'comments';
          const titleEl = adminModal.querySelector('h3');
          if (titleEl && titleEl.textContent) {
            const matchedAsset = this.getAssetById(titleEl.textContent);
            if (matchedAsset) {
              adminModal.remove();
              const newHtml = AssetDetailsView.renderModal(matchedAsset.id);
              if (newHtml) App.showModal(newHtml);
              if (tabKey) {
                setTimeout(() => {
                  if (typeof AssetDetailsView.switchDetailsTab === 'function') {
                    AssetDetailsView.switchDetailsTab(tabKey);
                  }
                }, 20);
              }
            }
          }
        }

        const empModal = document.getElementById('empAssetDetailsModal');
        if (empModal && window.EmpDetailsView) {
          const titleEl = empModal.querySelector('h3');
          if (titleEl && titleEl.textContent) {
            const matchedAsset = this.getAssetById(titleEl.textContent);
            if (matchedAsset) {
              empModal.remove();
              EmpDetailsView.openModal(matchedAsset.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('❌ Supabase Sync Error:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Storage Read Error', e);
      return [];
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage Write Error', e);
    }
  }

  // Stores CRUD & Supabase Sync
  getStores() {
    return this.get(STORAGE_KEYS.STORES);
  }

  saveStore(store) {
    const stores = this.getStores();
    const existingIndex = stores.findIndex(s => s.id === store.id);

    if (!store.id || !store.id.includes('-')) {
      store.id = generateUUID();
    }
    store.createdAt = store.createdAt || new Date().toISOString();

    if (existingIndex >= 0) {
      stores[existingIndex] = { ...stores[existingIndex], ...store };
    } else {
      stores.unshift(store);
    }
    this.set(STORAGE_KEYS.STORES, stores);

    if (this.supabase) {
      const payload = {
        id: store.id,
        code: store.code,
        name: store.name,
        username: store.username,
        password_hash: store.password,
        manager_name: store.managerName,
        email: store.email,
        status: store.status
      };

      this.supabase.from('stores').upsert(payload).then(({ data, error }) => {
        if (error) {
          console.error('❌ Supabase Store Save Error:', error);
          if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(`Supabase Sync Notice: ${error.message}`, 'warning');
          }
        } else {
          console.log('✅ Store saved to Supabase successfully:', store.name);
        }
      });
    }

    return store;
  }

  deleteStore(storeId) {
    const stores = this.getStores().filter(s => s.id !== storeId);
    this.set(STORAGE_KEYS.STORES, stores);

    if (this.supabase && storeId.includes('-')) {
      this.supabase.from('stores').delete().eq('id', storeId).then(({ error }) => {
        if (error) console.error('Supabase Delete Store Error:', error);
      });
    }
  }

  // Auto-advance maintenance cycle when entering 2 weeks (14 days) before nextDueDate
  checkAndAutoAdvanceAssets() {
    const assets = this.get(STORAGE_KEYS.ASSETS);
    if (!Array.isArray(assets) || assets.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updated = false;

    assets.forEach(asset => {
      if (!asset || !asset.cycle || asset.cycle === 'No Repeat' || asset.cycle === 'Input Date' || asset.cycle === 'Custom Date') {
        return;
      }

      if (!asset.dueDate) return;

      if (!asset.nextDueDate && window.Utils) {
        asset.nextDueDate = window.Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays);
        updated = true;
      }

      if (!asset.nextDueDate) return;

      const nextParts = asset.nextDueDate.split('-');
      if (nextParts.length < 3) return;
      const nextDueDateObj = new Date(nextParts[0], nextParts[1] - 1, nextParts[2]);
      nextDueDateObj.setHours(0, 0, 0, 0);

      const dueParts = asset.dueDate.split('-');
      const dueDateObj = dueParts.length >= 3 ? new Date(dueParts[0], dueParts[1] - 1, dueParts[2]) : null;
      if (dueDateObj) dueDateObj.setHours(0, 0, 0, 0);

      const diffTime = nextDueDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isPastDueDate = dueDateObj && today >= dueDateObj;

      // 2 Weeks (14 days) Before Next Due Date Window Rule
      if (diffDays <= 14 && (isPastDueDate || asset.isCompleted)) {
        const oldNext = asset.nextDueDate;
        asset.dueDate = oldNext;
        if (window.Utils) {
          asset.nextDueDate = window.Utils.calculateNextDueDate(oldNext, asset.cycle, asset.customDays);
        }
        asset.isCompleted = false;
        updated = true;

        if (this.supabase) {
          const payload = {
            id: asset.id,
            due_date: asset.dueDate,
            next_due_date: asset.nextDueDate,
            is_completed: false
          };
          this.supabase.from('assets').update(payload).eq('id', asset.id).then(({ error }) => {
            if (error) console.error('Supabase Auto-Advance Sync Error:', error);
          });
        }
      }
    });

    if (updated) {
      this.set(STORAGE_KEYS.ASSETS, assets);
    }
  }

  // Assets CRUD & Supabase Sync
  getAssets() {
    this.checkAndAutoAdvanceAssets();
    return this.get(STORAGE_KEYS.ASSETS);
  }

  getAssetById(assetId) {
    if (!assetId) return null;
    const assets = this.getAssets();
    const cleanId = String(assetId).trim();
    const cleanLower = cleanId.toLowerCase();
    const cleanNoPrefix = cleanLower.replace(/^ast[-_]/i, '').trim();
    const cleanAlpha = cleanId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return assets.find(a => {
      if (!a) return false;
      const aId = String(a.id || '').trim();
      const aIdLower = aId.toLowerCase();
      const aIdNoPrefix = aIdLower.replace(/^ast[-_]/i, '').trim();
      const aIdAlpha = aId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      const aSerial = String(a.serialId || '').trim();
      const aSerialLower = aSerial.toLowerCase();
      const aSerialNoPrefix = aSerialLower.replace(/^ast[-_]/i, '').trim();
      const aSerialAlpha = aSerial.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      const aName = String(a.name || '').trim().toLowerCase();

      return (
        aId === cleanId ||
        aIdLower === cleanLower ||
        (cleanNoPrefix && aIdNoPrefix === cleanNoPrefix) ||
        (cleanAlpha && aIdAlpha === cleanAlpha) ||
        aSerial === cleanId ||
        aSerialLower === cleanLower ||
        (cleanNoPrefix && aSerialNoPrefix === cleanNoPrefix) ||
        (cleanAlpha && aSerialAlpha === cleanAlpha) ||
        (aName && aName === cleanLower)
      );
    }) || null;
  }

  saveAsset(asset) {
    const assets = this.getAssets();
    const existingIndex = assets.findIndex(a => a.id === asset.id);

    if (!isUUID(asset.id)) {
      asset.id = generateUUID();
    }
    asset.createdAt = asset.createdAt || new Date().toISOString();
    if (!asset.lastCompletedDate) asset.lastCompletedDate = 'None';
    if (!asset.nextDueDate && window.Utils) {
      asset.nextDueDate = window.Utils.calculateNextDueDate(asset.dueDate, asset.cycle, asset.customDays);
    }

    if (!isUUID(asset.storeId)) {
      const stores = this.getStores();
      const matchedStore = stores.find(s => s.id === asset.storeId || s.name === asset.storeName);
      if (matchedStore && isUUID(matchedStore.id)) {
        asset.storeId = matchedStore.id;
      } else if (matchedStore) {
        matchedStore.id = generateUUID();
        this.saveStore(matchedStore);
        asset.storeId = matchedStore.id;
      }
    }

    if (existingIndex >= 0) {
      assets[existingIndex] = { ...assets[existingIndex], ...asset };
    } else {
      asset.isCompleted = false;
      assets.unshift(asset);
    }
    this.set(STORAGE_KEYS.ASSETS, assets);

    if (this.supabase) {
      const payload = {
        id: asset.id,
        serial_id: asset.serialId,
        name: asset.name,
        category: asset.category,
        store_id: isUUID(asset.storeId) ? asset.storeId : null,
        store_name: asset.storeName,
        location: asset.location,
        due_date: asset.dueDate,
        next_due_date: asset.nextDueDate,
        cycle: asset.cycle,
        custom_days: asset.customDays || 30,
        condition: asset.condition,
        cost: asset.cost,
        image_url: asset.imageUrl,
        description: asset.description,
        is_completed: asset.isCompleted,
        last_completed_date: asset.lastCompletedDate === 'None' ? null : asset.lastCompletedDate
      };

      this.supabase.from('assets').upsert(payload).then(({ data, error }) => {
        if (error) {
          console.error('❌ Supabase Asset Save Error:', error);
          if (error.message && (error.message.includes('next_due_date') || error.message.includes('column'))) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.next_due_date;
            this.supabase.from('assets').upsert(fallbackPayload).then(({ error: fbErr }) => {
              if (fbErr) console.error('❌ Supabase Fallback Asset Save Error:', fbErr);
              else console.log('✅ Asset saved to Supabase (compatibility mode):', asset.name);
            });
          } else if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(`Supabase Sync Notice: ${error.message}`, 'warning');
          }
        } else {
          console.log('✅ Asset saved to Supabase successfully:', asset.name);
        }
      });
    }

    return asset;
  }

  deleteAsset(assetId) {
    if (!assetId) return;

    const targetAsset = this.getAssetById(assetId);
    const targetId = targetAsset ? targetAsset.id : assetId;
    const targetSerial = targetAsset ? targetAsset.serialId : null;

    const assets = this.getAssets().filter(a =>
      a.id !== targetId &&
      a.id !== assetId &&
      (!targetSerial || a.serialId !== targetSerial)
    );
    this.set(STORAGE_KEYS.ASSETS, assets);

    if (this.supabase) {
      if (targetId) {
        this.supabase.from('assets').delete().eq('id', targetId).then(({ error }) => {
          if (error) console.error('❌ Supabase Delete Asset Error:', error);
          else console.log('✅ Asset deleted from Supabase by ID:', targetId);
        });
      }
      if (targetSerial && targetSerial !== targetId) {
        this.supabase.from('assets').delete().eq('serial_id', targetSerial).then(({ error }) => {
          if (error) console.error('❌ Supabase Delete Asset Serial Error:', error);
          else console.log('✅ Asset deleted from Supabase by Serial ID:', targetSerial);
        });
      }
    }
  }

  // Notifications
  getNotifications() {
    return this.get(STORAGE_KEYS.NOTIFICATIONS);
  }

  addNotification(notif) {
    const notifs = this.getNotifications();
    notif.id = generateUUID();
    notif.date = new Date().toISOString();
    notif.isRead = false;
    notifs.unshift(notif);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);

    if (this.supabase) {
      this.supabase.from('notifications').insert({
        id: notif.id,
        message: notif.message,
        asset_id: notif.assetId && notif.assetId.includes('-') ? notif.assetId : null,
        asset_name: notif.assetName,
        store_name: notif.storeName,
        user_name: notif.userName,
        user_role: notif.userRole,
        is_read: false
      }).then(({ error }) => {
        if (error) console.error('Supabase Notification Error:', error);
      });
    }
  }

  markNotificationRead(id) {
    const notifs = this.getNotifications().map(n => {
      if (n.id === id) n.isRead = true;
      return n;
    });
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  markAllNotificationsRead() {
    const notifs = this.getNotifications().map(n => {
      n.isRead = true;
      return n;
    });
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  // Activity Logs
  getActivityLogs() {
    return this.get(STORAGE_KEYS.ACTIVITY_LOGS);
  }

  logActivity(action, details, store = 'All Stores', asset = 'General', user = 'System Admin', role = 'Admin') {
    const logs = this.getActivityLogs();
    const now = new Date();
    const newLog = {
      id: generateUUID(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user,
      role,
      store,
      asset,
      action,
      details
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.ACTIVITY_LOGS, logs);

    if (this.supabase) {
      this.supabase.from('activity_logs').insert({
        id: newLog.id,
        user_name: user,
        role,
        store_name: store,
        asset_name: asset,
        action,
        details
      }).then(({ error }) => {
        if (error) console.error('Supabase Log Error:', error);
      });
    }
  }

  // Maintenance History
  getMaintenanceHistory(assetId = null) {
    let history = this.get(STORAGE_KEYS.MAINTENANCE_HISTORY) || [];

    if (assetId) {
      const targetAsset = this.getAssetById(assetId);
      const idKeys = new Set();

      const addKeyVariants = (val) => {
        if (!val) return;
        const str = String(val).trim();
        if (!str) return;
        idKeys.add(str.toLowerCase());
        const noPrefix = str.replace(/^ast[-_]/i, '').toLowerCase().trim();
        if (noPrefix) idKeys.add(noPrefix);
        const alpha = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (alpha) idKeys.add(alpha);
      };

      addKeyVariants(assetId);
      if (targetAsset) {
        addKeyVariants(targetAsset.id);
        addKeyVariants(targetAsset.serialId);
        if (targetAsset.name) idKeys.add(String(targetAsset.name).trim().toLowerCase());
      }

      history = history.filter(h => {
        if (!h || !h.assetId) return false;
        const hAssetId = String(h.assetId).trim();
        const hLower = hAssetId.toLowerCase();
        const hNoPrefix = hLower.replace(/^ast[-_]/i, '').trim();
        const hAlpha = hAssetId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return idKeys.has(hLower) || idKeys.has(hNoPrefix) || idKeys.has(hAlpha);
      });
    }

    return history.sort((a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0));
  }

  addMaintenanceRecord(record) {
    const history = this.getMaintenanceHistory();
    if (!isUUID(record.id)) {
      record.id = generateUUID();
    }
    if (!isUUID(record.assetId)) {
      const matchedAsset = this.getAssetById(record.assetId);
      if (matchedAsset && isUUID(matchedAsset.id)) {
        record.assetId = matchedAsset.id;
      }
    }

    history.unshift(record);
    this.set(STORAGE_KEYS.MAINTENANCE_HISTORY, history);

    if (this.supabase) {
      const payload = {
        id: record.id,
        asset_id: isUUID(record.assetId) ? record.assetId : null,
        completed_date: record.completedDate,
        scheduled_due_date: record.scheduledDueDate,
        is_late: record.isLate || false,
        days_late: record.daysLate || 0,
        is_early: record.isEarly || false,
        days_early: record.daysEarly || 0,
        completed_by: record.completedBy,
        status: record.status || 'Completed',
        comments: record.comments,
        photos: record.photos || [],
        is_override: record.isOverride || false,
        override_reason: record.overrideReason || ''
      };

      this.supabase.from('maintenance_history').insert(payload).then(({ error }) => {
        if (error) {
          console.error('❌ Supabase Maintenance History Error:', error);
          if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(`Supabase Sync Notice: ${error.message}`, 'warning');
          }
        } else {
          console.log('✅ Maintenance record saved to Supabase successfully.');
        }
      });
    }
  }

  updateMaintenanceRecord(updatedRecord) {
    let history = this.get(STORAGE_KEYS.MAINTENANCE_HISTORY);
    const index = history.findIndex(h => h.id === updatedRecord.id);
    if (index >= 0) {
      history[index] = { ...history[index], ...updatedRecord };
      this.set(STORAGE_KEYS.MAINTENANCE_HISTORY, history);

      if (this.supabase) {
        const payload = {
          completed_date: updatedRecord.completedDate,
          scheduled_due_date: updatedRecord.scheduledDueDate,
          is_late: updatedRecord.isLate || false,
          days_late: updatedRecord.daysLate || 0,
          is_early: updatedRecord.isEarly || false,
          days_early: updatedRecord.daysEarly || 0,
          completed_by: updatedRecord.completedBy,
          status: updatedRecord.status || 'Completed',
          comments: updatedRecord.comments,
          photos: updatedRecord.photos || [],
          is_override: updatedRecord.isOverride || false,
          override_reason: updatedRecord.overrideReason || ''
        };

        this.supabase.from('maintenance_history').update(payload).eq('id', updatedRecord.id).then(({ error }) => {
          if (error) console.error('Supabase Update Maintenance History Error:', error);
        });
      }
    }
    return updatedRecord;
  }

  // Comments Helpers
  _getCommentsMap() {
    try {
      const data = localStorage.getItem('asset_comments');
      if (!data) return {};
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  _saveCommentsMap(map) {
    try {
      localStorage.setItem('asset_comments', JSON.stringify(map || {}));
    } catch (e) {
      console.error('Storage Save Comments Error', e);
      try {
        const pruned = JSON.parse(JSON.stringify(map || {}));
        Object.keys(pruned).forEach(astId => {
          if (Array.isArray(pruned[astId])) {
            pruned[astId].forEach(c => {
              if (c.photoUrl && c.photoUrl.length > 300000) {
                c.photoUrl = null;
              }
            });
          }
        });
        localStorage.setItem('asset_comments', JSON.stringify(pruned));
      } catch (errFallback) {
        console.error('Pruned save fallback error:', errFallback);
      }
    }
  }

  // Comments
  getComments(assetId) {
    if (!assetId) return [];
    const map = this._getCommentsMap();

    const targetAsset = this.getAssetById(assetId);
    const idKeys = new Set();

    const addKeyVariants = (val) => {
      if (!val) return;
      const str = String(val).trim();
      if (!str) return;
      idKeys.add(str);
      idKeys.add(str.toLowerCase());
      idKeys.add(str.toUpperCase());
      const noPrefix = str.replace(/^ast[-_]/i, '').trim();
      if (noPrefix) {
        idKeys.add(noPrefix);
        idKeys.add(noPrefix.toLowerCase());
      }
      const alphaNumOnly = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (alphaNumOnly) {
        idKeys.add(alphaNumOnly);
      }
    };

    addKeyVariants(assetId);
    if (targetAsset) {
      addKeyVariants(targetAsset.id);
      addKeyVariants(targetAsset.serialId);
      if (targetAsset.name) {
        idKeys.add(String(targetAsset.name).trim().toLowerCase());
      }
    }

    const allCmts = [];
    const seenCmtIds = new Set();

    Object.keys(map).forEach(mapKey => {
      const mapKeyClean = String(mapKey).trim();
      const mapKeyLower = mapKeyClean.toLowerCase();
      const mapKeyNoPrefix = mapKeyLower.replace(/^ast[-_]/i, '').trim();
      const mapKeyAlpha = mapKeyClean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      let isKeyMatch = idKeys.has(mapKeyClean) || idKeys.has(mapKeyLower) || idKeys.has(mapKeyNoPrefix) || idKeys.has(mapKeyAlpha);

      const list = map[mapKey];
      if (Array.isArray(list)) {
        list.forEach(c => {
          if (!c || !c.id || seenCmtIds.has(c.id)) return;

          let isCmtMatch = isKeyMatch;
          if (!isCmtMatch && c.assetId) {
            const cAssetId = String(c.assetId).trim();
            const cLower = cAssetId.toLowerCase();
            const cNoPrefix = cLower.replace(/^ast[-_]/i, '').trim();
            const cAlpha = cAssetId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            isCmtMatch = idKeys.has(cAssetId) || idKeys.has(cLower) || idKeys.has(cNoPrefix) || idKeys.has(cAlpha);
          }

          if (isCmtMatch) {
            seenCmtIds.add(c.id);
            allCmts.push(c);
          }
        });
      }
    });

    return allCmts.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  }

  addComment(assetId, text, user = 'System Admin', role = 'Admin', photoUrl = null) {
    const map = this._getCommentsMap();

    const targetAsset = this.getAssetById(assetId);
    const primaryKey = targetAsset ? targetAsset.id : assetId;

    if (!map[primaryKey]) map[primaryKey] = [];

    const newCmt = {
      id: generateUUID(),
      assetId: primaryKey,
      user,
      role,
      text,
      photoUrl: photoUrl || null,
      timestamp: new Date().toISOString()
    };

    map[primaryKey].push(newCmt);

    // Also mirror to other identifier keys locally
    if (targetAsset) {
      if (targetAsset.serialId && targetAsset.serialId !== primaryKey) {
        if (!map[targetAsset.serialId]) map[targetAsset.serialId] = [];
        if (!map[targetAsset.serialId].some(c => c.id === newCmt.id)) map[targetAsset.serialId].push(newCmt);
      }
      if (targetAsset.name && targetAsset.name !== primaryKey) {
        if (!map[targetAsset.name]) map[targetAsset.name] = [];
        if (!map[targetAsset.name].some(c => c.id === newCmt.id)) map[targetAsset.name].push(newCmt);
      }
    }

    this._saveCommentsMap(map);

    let targetAssetUuid = primaryKey;
    if (!isUUID(targetAssetUuid) && targetAsset && isUUID(targetAsset.id)) {
      targetAssetUuid = targetAsset.id;
    }

    if (this.supabase && assetId) {
      this.supabase.from('asset_comments').insert({
        id: newCmt.id,
        asset_id: isUUID(targetAssetUuid) ? targetAssetUuid : (targetAsset ? targetAsset.id : String(assetId)),
        user_name: user,
        role: role === 'Store Employee' ? 'Store Manager' : role,
        text,
        photo_url: photoUrl || null
      }).then(({ error }) => {
        if (error) {
          console.error('Supabase Comment Error:', error);
          if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(`Supabase Comment Sync Notice: ${error.message}`, 'warning');
          }
        } else {
          console.log('✅ Comment saved to Supabase successfully.');
        }
      });
    }

    return newCmt;
  }

  editComment(assetId, commentId, newText, newPhotoUrl = undefined) {
    const map = this._getCommentsMap();
    const list = map[assetId] || [];
    const target = list.find(c => c.id === commentId);
    if (target) {
      target.text = newText;
      if (newPhotoUrl !== undefined) {
        target.photoUrl = newPhotoUrl || null;
      }
      target.edited = true;
      this._saveCommentsMap(map);

      if (this.supabase) {
        const isCommentUuid = typeof commentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId);
        if (isCommentUuid) {
          const updateObj = { text: newText };
          if (newPhotoUrl !== undefined) updateObj.photo_url = newPhotoUrl || null;
          this.supabase.from('asset_comments')
            .update(updateObj)
            .eq('id', commentId)
            .then(({ error }) => {
              if (error) console.error('Supabase Comment Update Error:', error);
            });
        }
      }
    }
    return target;
  }

  deleteComment(assetId, commentId) {
    const map = this._getCommentsMap();
    if (map[assetId]) {
      map[assetId] = map[assetId].filter(c => c.id !== commentId);
      this._saveCommentsMap(map);

      if (this.supabase) {
        const isCommentUuid = typeof commentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId);
        if (isCommentUuid) {
          this.supabase.from('asset_comments')
            .delete()
            .eq('id', commentId)
            .then(({ error }) => {
              if (error) console.error('Supabase Comment Delete Error:', error);
            });
        }
      }
    }
  }

  // Settings
  getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS) || INITIAL_SETTINGS;
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    this.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // Reset Local Cache
  resetData() {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(INITIAL_ASSETS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(INITIAL_ACTIVITY_LOGS));
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE_HISTORY, JSON.stringify(INITIAL_MAINTENANCE_HISTORY));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem('asset_comments', JSON.stringify(INITIAL_COMMENTS));
  }
}

const storage = new StorageManager();
window.storage = storage;
