/**
 * Storage & Data Management System for Asset Management App
 * Connects directly to Supabase PostgreSQL Database & Storage buckets with Local Cache fallback.
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

class StorageManager {
  constructor() {
    this.supabase = null;
    this.initSupabase();
    this.init();
  }

  initSupabase() {
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Connected to Supabase Cloud Database:', SUPABASE_URL);
      } else {
        console.warn('⚠️ Supabase JS SDK loading. Running local fallback mode.');
      }
    } catch (e) {
      console.error('❌ Supabase Client Error:', e);
    }
  }

  async init() {
    // Initial local storage setup
    if (!localStorage.getItem(STORAGE_KEYS.STORES)) localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    if (!localStorage.getItem(STORAGE_KEYS.ASSETS)) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(INITIAL_ASSETS));
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(INITIAL_ACTIVITY_LOGS));
    if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE_HISTORY)) localStorage.setItem(STORAGE_KEYS.MAINTENANCE_HISTORY, JSON.stringify(INITIAL_MAINTENANCE_HISTORY));
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    if (!localStorage.getItem('asset_comments')) localStorage.setItem('asset_comments', JSON.stringify(INITIAL_COMMENTS));

    // Fetch and sync latest data from Supabase
    this.syncFromSupabase();
  }

  async syncFromSupabase() {
    if (!this.supabase) return;
    try {
      // 1. Sync Stores from Supabase
      const { data: dbStores, error: errStores } = await this.supabase.from('stores').select('*');
      if (dbStores && Array.isArray(dbStores)) {
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
        this.set(STORAGE_KEYS.STORES, mappedStores);
      }

      // 2. Sync Assets from Supabase (including dates, cycles & condition)
      const { data: dbAssets, error: errAssets } = await this.supabase.from('assets').select('*');
      if (dbAssets && Array.isArray(dbAssets)) {
        const mappedAssets = dbAssets.map(a => ({
          id: a.id,
          serialId: a.serial_id,
          name: a.name,
          category: a.category,
          storeId: a.store_id,
          storeName: a.store_name,
          location: a.location,
          dueDate: a.due_date,
          cycle: a.cycle,
          customDays: a.custom_days,
          condition: a.condition,
          cost: a.cost,
          imageUrl: a.image_url,
          description: a.description,
          isCompleted: a.is_completed,
          lastCompletedDate: a.last_completed_date || 'None',
          createdAt: a.created_at
        }));
        this.set(STORAGE_KEYS.ASSETS, mappedAssets);
      }

      // 3. Sync Maintenance History from Supabase
      const { data: dbHistory, error: errHistory } = await this.supabase.from('maintenance_history').select('*').order('created_at', { ascending: false });
      if (dbHistory && Array.isArray(dbHistory)) {
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
        this.set(STORAGE_KEYS.MAINTENANCE_HISTORY, mappedHistory);
      }

      // Refresh View if App is mounted
      if (window.App && typeof window.App.renderCurrentView === 'function') {
        window.App.renderCurrentView();
      }
    } catch (e) {
      console.warn('Supabase Data Sync Note:', e);
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
    if (existingIndex >= 0) {
      stores[existingIndex] = { ...stores[existingIndex], ...store };
    } else {
      store.id = store.id || ('str_' + Date.now());
      store.createdAt = store.createdAt || new Date().toISOString();
      stores.unshift(store);
    }
    this.set(STORAGE_KEYS.STORES, stores);

    if (this.supabase) {
      const payload = {
        code: store.code,
        name: store.name,
        username: store.username,
        password_hash: store.password,
        manager_name: store.managerName,
        email: store.email,
        status: store.status
      };
      if (store.id && store.id.includes('-')) payload.id = store.id;

      this.supabase.from('stores').upsert(payload).select().then(({ data, error }) => {
        if (error) {
          console.error('Supabase Store Upsert Error:', error);
        } else if (data && data[0] && data[0].id) {
          store.id = data[0].id;
          this.set(STORAGE_KEYS.STORES, stores);
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

  // Assets CRUD & Supabase Sync (Stores equipment, due_date, last_completed_date & condition)
  getAssets() {
    return this.get(STORAGE_KEYS.ASSETS);
  }

  getAssetById(assetId) {
    const assets = this.getAssets();
    return assets.find(a => a.id === assetId) || null;
  }

  saveAsset(asset) {
    const assets = this.getAssets();
    const existingIndex = assets.findIndex(a => a.id === asset.id);
    if (existingIndex >= 0) {
      assets[existingIndex] = { ...assets[existingIndex], ...asset };
    } else {
      asset.id = asset.id || ('ast_' + Date.now());
      asset.createdAt = asset.createdAt || new Date().toISOString();
      if (!asset.lastCompletedDate) asset.lastCompletedDate = 'None';
      asset.isCompleted = false;
      assets.unshift(asset);
    }
    this.set(STORAGE_KEYS.ASSETS, assets);

    if (this.supabase) {
      const payload = {
        serial_id: asset.serialId,
        name: asset.name,
        category: asset.category,
        store_id: asset.storeId && asset.storeId.includes('-') ? asset.storeId : null,
        store_name: asset.storeName,
        location: asset.location,
        due_date: asset.dueDate,
        cycle: asset.cycle,
        custom_days: asset.customDays,
        condition: asset.condition,
        cost: asset.cost,
        image_url: asset.imageUrl,
        description: asset.description,
        is_completed: asset.isCompleted,
        last_completed_date: asset.lastCompletedDate === 'None' ? null : asset.lastCompletedDate
      };
      if (asset.id && asset.id.includes('-')) payload.id = asset.id;

      this.supabase.from('assets').upsert(payload).select().then(({ data, error }) => {
        if (error) {
          console.error('Supabase Asset Upsert Error:', error);
        } else if (data && data[0] && data[0].id) {
          asset.id = data[0].id;
          this.set(STORAGE_KEYS.ASSETS, assets);
        }
      });
    }

    return asset;
  }

  deleteAsset(assetId) {
    const assets = this.getAssets().filter(a => a.id !== assetId);
    this.set(STORAGE_KEYS.ASSETS, assets);

    if (this.supabase && assetId.includes('-')) {
      this.supabase.from('assets').delete().eq('id', assetId).then(({ error }) => {
        if (error) console.error('Supabase Delete Asset Error:', error);
      });
    }
  }

  // Notifications
  getNotifications() {
    return this.get(STORAGE_KEYS.NOTIFICATIONS);
  }

  addNotification(notif) {
    const notifs = this.getNotifications();
    notif.id = 'notif_' + Date.now();
    notif.date = new Date().toISOString();
    notif.isRead = false;
    notifs.unshift(notif);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);

    if (this.supabase) {
      this.supabase.from('notifications').insert({
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
      id: 'log_' + Date.now(),
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

  // Maintenance History & Supabase Insert (Stores completed_date, scheduled_due_date, is_late & days_late)
  getMaintenanceHistory(assetId = null) {
    const history = this.get(STORAGE_KEYS.MAINTENANCE_HISTORY);
    if (assetId) {
      return history.filter(h => h.assetId === assetId);
    }
    return history;
  }

  addMaintenanceRecord(record) {
    const history = this.getMaintenanceHistory();
    record.id = 'mhist_' + Date.now();
    history.unshift(record);
    this.set(STORAGE_KEYS.MAINTENANCE_HISTORY, history);

    if (this.supabase) {
      const payload = {
        asset_id: record.assetId && record.assetId.includes('-') ? record.assetId : null,
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
        if (error) console.error('Supabase Maintenance History Insert Error:', error);
      });
    }
  }

  // Comments
  getComments(assetId) {
    const allComments = this.get('asset_comments') || {};
    return allComments[assetId] || [];
  }

  addComment(assetId, text, user = 'System Admin', role = 'Admin') {
    const allComments = this.get('asset_comments') || {};
    if (!allComments[assetId]) allComments[assetId] = [];
    const newCmt = {
      id: 'cmt_' + Date.now(),
      user,
      role,
      text,
      timestamp: new Date().toISOString()
    };
    allComments[assetId].push(newCmt);
    this.set('asset_comments', allComments);

    if (this.supabase) {
      this.supabase.from('asset_comments').insert({
        asset_id: assetId && assetId.includes('-') ? assetId : null,
        user_name: user,
        role: role === 'Store Employee' ? 'Store Manager' : role,
        text
      }).then(({ error }) => {
        if (error) console.error('Supabase Comment Error:', error);
      });
    }

    return newCmt;
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
