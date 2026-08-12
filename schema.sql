-- =============================================================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- Application: Simple Asset Management System (Admin & Store Employee Portal)
-- Description: Complete SQL DDL, Foreign Keys, Indexes, Triggers & RLS Policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. STORES TABLE
-- Stores store locations, code, email, and employee login accounts.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    manager_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick username login and store code lookup
CREATE INDEX IF NOT EXISTS idx_stores_username ON public.stores(username);
CREATE INDEX IF NOT EXISTS idx_stores_code ON public.stores(code);


-- -----------------------------------------------------------------------------
-- 2. ASSETS TABLE
-- Stores equipment inventory, assigned stores, maintenance schedules & condition.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    next_due_date DATE,
    cycle VARCHAR(50) NOT NULL CHECK (cycle IN ('Weekly', 'Monthly', 'Every 2 Months', 'Every 3 Months', 'Every 6 Months', 'Every 9 Months', 'Yearly', 'No Repeat', 'Custom', 'Custom Days', 'Input Date', 'Custom Date')),
    custom_days INTEGER DEFAULT 30,
    condition VARCHAR(50) DEFAULT 'Good' CHECK (condition IN ('Excellent', 'Good', 'Needs Repair', 'Under Maintenance', 'Damaged', 'Retired')),
    cost NUMERIC(12, 2) DEFAULT 0.00,
    image_url TEXT,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    last_completed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure next_due_date column exists and update cycle check constraint for existing tables
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_cycle_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_cycle_check CHECK (cycle IN ('Weekly', 'Monthly', 'Every 2 Months', 'Every 3 Months', 'Every 6 Months', 'Every 9 Months', 'Yearly', 'No Repeat', 'Custom', 'Custom Days', 'Input Date', 'Custom Date'));

-- Performance Indexes for Dashboard Queries & Filters
CREATE INDEX IF NOT EXISTS idx_assets_store_id ON public.assets(store_id);
CREATE INDEX IF NOT EXISTS idx_assets_due_date ON public.assets(due_date);
CREATE INDEX IF NOT EXISTS idx_assets_is_completed ON public.assets(is_completed);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON public.assets(condition);


-- -----------------------------------------------------------------------------
-- 3. MAINTENANCE_HISTORY TABLE
-- Stores service completion records, technician name, proof photos & late badges.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    scheduled_due_date DATE,
    is_late BOOLEAN DEFAULT FALSE,
    days_late INTEGER DEFAULT 0,
    is_early BOOLEAN DEFAULT FALSE,
    days_early INTEGER DEFAULT 0,
    completed_by VARCHAR(255) NOT NULL, -- Worker / Technician Name
    status VARCHAR(50) DEFAULT 'Completed',
    comments TEXT NOT NULL,
    photos TEXT[] DEFAULT '{}', -- Array of proof photo URLs (Supabase Storage)
    is_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_mhist_asset_id ON public.maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_mhist_completed_date ON public.maintenance_history(completed_date);


-- -----------------------------------------------------------------------------
-- 4. ASSET_COMMENTS TABLE
-- Staff and Admin discussion thread per asset.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Store Employee', 'Store Manager')),
    text TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_asset_id ON public.asset_comments(asset_id);


-- -----------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE
-- Real-time system notifications and overdue alerts.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    asset_name VARCHAR(255),
    store_name VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);


-- -----------------------------------------------------------------------------
-- 6. ACTIVITY_LOGS TABLE
-- Audit logs tracking actions across Admin & Employees.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    store_name VARCHAR(255),
    asset_name VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);


-- -----------------------------------------------------------------------------
-- 7. SYSTEM_SETTINGS TABLE
-- Global portal configurations and notification toggles.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    admin_name VARCHAR(255) DEFAULT 'System Administrator',
    admin_email VARCHAR(255) DEFAULT 'admin@assetmanage.com',
    notifications_email BOOLEAN DEFAULT TRUE,
    notifications_overdue_alerts BOOLEAN DEFAULT TRUE,
    notifications_daily_summary BOOLEAN DEFAULT TRUE,
    density VARCHAR(50) DEFAULT 'comfortable',
    system_title VARCHAR(255) DEFAULT 'Simple Asset Management System - Admin',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Settings Row if not exists
INSERT INTO public.system_settings (id, admin_name, admin_email)
VALUES (1, 'System Administrator', 'admin@assetmanage.com')
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 8. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- Automatically updates updated_at timestamps on record edits.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKETS SETUP
-- Storage buckets for equipment images & camera maintenance proof photos.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-proofs', 'maintenance-proofs', true),
       ('asset-images', 'asset-images', true)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables Row Level Security for production safety.
-- -----------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for authenticated users & anon portal clients
CREATE POLICY "Allow public all access to stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access to assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access to maintenance_history" ON public.maintenance_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access to asset_comments" ON public.asset_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access to activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to settings" ON public.system_settings FOR SELECT USING (true);
