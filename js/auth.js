/**
 * Authentication Module for Admin & Store Employee System
 * Handles Admin and Store Employee authentication, session persistence, and role scoping.
 */

const Auth = {
  SESSION_KEY: 'asset_auth_user',

  isLoggedIn() {
    return !!localStorage.getItem(this.SESSION_KEY);
  },

  getUser() {
    const userStr = localStorage.getItem(this.SESSION_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  isAdmin() {
    const u = this.getUser();
    return u && u.role === 'Admin';
  },

  isEmployee() {
    const u = this.getUser();
    return u && u.role === 'Store Employee';
  },

  getAssignedStoreId() {
    const u = this.getUser();
    return u ? u.storeId : null;
  },

  login(username, password) {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // 1. Admin Authentication Check
    if (cleanUser === 'admin' && cleanPass === 'admin123') {
      const adminUser = {
        username: 'admin',
        name: 'System Administrator',
        role: 'Admin',
        storeId: null,
        storeName: 'All Stores',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(adminUser));
      
      const storageObj = window.storage || (typeof storage !== 'undefined' ? storage : null);
      if (storageObj) {
        storageObj.logActivity('Admin Login', 'Admin logged into system portal.', 'All Stores', 'N/A', 'System Admin', 'Admin');
      }
      return { success: true, role: 'Admin' };
    }

    // 2. Store Employee Authentication Check (Match store account from localStorage)
    const storageObj = window.storage || (typeof storage !== 'undefined' ? storage : null);
    if (storageObj) {
      const stores = storageObj.getStores();
      const matchedStore = stores.find(s => s.username.toLowerCase() === cleanUser.toLowerCase());

      if (matchedStore) {
        if (matchedStore.password !== cleanPass) {
          return { success: false, message: 'Invalid store password. Please try again.' };
        }
        if (matchedStore.status === 'Inactive') {
          return { success: false, message: 'This Store Account has been deactivated by System Admin. Access denied.' };
        }

        const empUser = {
          username: matchedStore.username,
          name: matchedStore.managerName || matchedStore.name + ' Manager',
          role: 'Store Employee',
          storeId: matchedStore.id,
          storeCode: matchedStore.code,
          storeName: matchedStore.name,
          loginTime: new Date().toISOString()
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(empUser));

        storageObj.logActivity('Employee Login', `Employee ${empUser.name} logged into store ${matchedStore.name}.`, matchedStore.name, 'N/A', empUser.name, 'Store Employee');
        
        return { success: true, role: 'Store Employee' };
      }
    }

    return { success: false, message: 'Invalid username or password. Check demo credentials on login page.' };
  },

  logout() {
    const user = this.getUser();
    if (window.storage && user) {
      storage.logActivity(
        `${user.role} Logout`,
        `${user.name} logged out of system.`,
        user.storeName || 'All Stores',
        'N/A',
        user.name,
        user.role
      );
    }
    localStorage.removeItem(this.SESSION_KEY);
    window.location.hash = '#login';
  }
};
