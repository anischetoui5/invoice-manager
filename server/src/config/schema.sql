-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- TABLES (ORDER MATTERS)
-- =========================

-- USERS
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    email varchar(255) UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp DEFAULT now(),
    last_active_workspace_id uuid
);

-- ROLES
CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(50) UNIQUE NOT NULL
);

-- WORKSPACES
CREATE TABLE workspaces (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    type varchar(50) NOT NULL CHECK (type IN ('personal','company')),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now()
);

-- FIX FK AFTER
ALTER TABLE users
ADD CONSTRAINT fk_users_last_workspace
FOREIGN KEY (last_active_workspace_id)
REFERENCES workspaces(id)
ON DELETE SET NULL;

-- COMPANIES
CREATE TABLE companies (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    email varchar(255),
    phone varchar(50),
    address text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    code char(8) UNIQUE NOT NULL DEFAULT SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 8),
    industry varchar(100)
);

CREATE INDEX idx_companies_workspace ON companies(workspace_id);

-- MEMBERSHIPS
CREATE TABLE memberships (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    joined_at timestamp DEFAULT now(),
    contract_start timestamp,
    contract_end timestamp,
    UNIQUE(user_id, workspace_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_workspace ON memberships(workspace_id);

-- INVOICE STATUS
CREATE TABLE invoice_status (
    code varchar(50) PRIMARY KEY
);

-- INVOICES
CREATE TABLE invoices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    invoice_number varchar(255),
    vendor_name varchar(255),
    amount numeric(12,2),
    currency char(3) DEFAULT 'TND',
    invoice_date date,
    due_date date,
    notes text,
    current_status varchar(50) NOT NULL DEFAULT 'draft' REFERENCES invoice_status(code),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    ocr_status varchar(50) DEFAULT 'pending',
    ocr_confidence numeric(5,2)
);

CREATE INDEX idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_name);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_current_status ON invoices(current_status);

-- TRIGGER
CREATE TRIGGER invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- DOCUMENTS
CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    file_name varchar(255) NOT NULL,
    mime_type varchar(100) NOT NULL,
    file_size integer NOT NULL,
    storage_path text NOT NULL,
    is_primary boolean DEFAULT true,
    uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at timestamp DEFAULT now()
);

CREATE INDEX idx_documents_invoice ON documents(invoice_id);
CREATE INDEX idx_documents_is_primary ON documents(invoice_id, is_primary);

-- EXTRACTED FIELDS
CREATE TABLE extracted_fields (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    field_name varchar(100) NOT NULL,
    field_value text,
    confidence numeric(5,2),
    needs_review boolean DEFAULT false,
    manually_corrected boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    corrected_by UUID REFERENCES users(id) ON DELETE SET NULL;
    UNIQUE(invoice_id, field_name)
);

CREATE INDEX idx_extracted_fields_invoice ON extracted_fields(invoice_id);

-- STATUS HISTORY
CREATE TABLE status_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    status varchar(50) NOT NULL REFERENCES invoice_status(code),
    changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_at timestamp DEFAULT now(),
    comment text
);

CREATE INDEX idx_status_history_invoice ON status_history(invoice_id);
CREATE INDEX idx_status_history_changed ON status_history(changed_at);

-- INVITATIONS
CREATE TABLE invitations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    code varchar(255) UNIQUE NOT NULL,
    role_id uuid NOT NULL REFERENCES roles(id),
    max_uses integer,
    used_count integer DEFAULT 0,
    expires_at timestamp,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
    accepted_at timestamp,
    status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    requested_role_id uuid REFERENCES roles(id),
    rejected_at timestamp
);

-- SUBSCRIPTION PLANS
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name varchar(50) NOT NULL,
    price numeric(10,2) NOT NULL,
    max_invoices integer,
    max_users integer,
    ocr_accuracy numeric(5,2),
    is_active boolean DEFAULT true,
    plan_type varchar(20) NOT NULL CHECK (plan_type IN ('company','personal'))
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    plan_id integer NOT NULL REFERENCES subscription_plans(id),
    status varchar(50) DEFAULT 'trialing'
        CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
    trial_ends_at timestamp,
    current_period_end timestamp,
    cardholder_name varchar(255),
    card_last4 char(4),
    created_at timestamp DEFAULT now(),
    credits numeric(10,2) DEFAULT 0,
    billing_start timestamp DEFAULT now(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type varchar(20) NOT NULL DEFAULT 'info'
        CHECK (type IN ('info', 'success', 'warning', 'error')),
    title varchar(255) NOT NULL,
    message text NOT NULL,
    action_url varchar(255),
    is_read boolean NOT NULL DEFAULT FALSE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- =========================
-- SEED DATA
-- =========================

-- INVOICE STATUS
INSERT INTO invoice_status (code) VALUES
  ('draft'),
  ('pending_review'),
  ('approved'),
  ('rejected'),
  ('paid'),
  ('archived')
ON CONFLICT (code) DO NOTHING;

-- ROLES
INSERT INTO roles (name) VALUES
  ('Owner'),
  ('Director'),
  ('Accountant'),
  ('Employee'),
  ('Personal')
ON CONFLICT (name) DO NOTHING;

-- SUBSCRIPTION PLANS
INSERT INTO subscription_plans
(name, price, max_invoices, max_users, ocr_accuracy, is_active, plan_type)
VALUES
  ('Starter', 49.00, 200, 10, 90.00, true, 'company'),
  ('Business', 149.00, 1000, 50, 95.00, true, 'company'),
  ('Professional', 349.00, 5000, 200, 98.00, true, 'company'),
  ('Enterprise', 999.00, NULL, NULL, 99.50, true, 'company'),

  ('Free', 0.00, 10, NULL, 85.00, true, 'personal'),
  ('Basic', 9.00, 50, NULL, 92.00, true, 'personal'),
  ('Plus', 19.00, 200, NULL, 96.00, true, 'personal'),
  ('Premium', 39.00, -1, NULL, 99.00, true, 'personal')
ON CONFLICT DO NOTHING;