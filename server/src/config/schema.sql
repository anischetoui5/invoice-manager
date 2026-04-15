-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- SPRINT 1 — Foundation, Auth, and Administration
-- ============================================================

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Workspaces (replaces "companies" — multi-tenant boundary)
CREATE TABLE workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(50)  NOT NULL CHECK (type IN ('personal', 'company')),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Roles (Director / Employee / Accountant)
CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Memberships — one user ↔ one workspace, exactly one role
CREATE TABLE memberships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE,
  role_id      UUID NOT NULL REFERENCES roles(id)       ON DELETE RESTRICT,
  joined_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

-- Invitations — invite-code based onboarding
CREATE TABLE invitations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code         VARCHAR(255) UNIQUE NOT NULL,
  role_id      UUID        NOT NULL REFERENCES roles(id)      ON DELETE RESTRICT,
  max_uses     INT,
  used_count   INT DEFAULT 0,
  expires_at   TIMESTAMP,
  created_by   UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name) VALUES
  ('Personal'),
  ('Director'),
  ('Employee'),
  ('Accountant');
-- ============================================================
-- SPRINT 2 — Invoice Upload and Document Management
-- ============================================================

-- Invoice status lookup table (acts as an enum with referential integrity)
CREATE TABLE invoice_status (
  code VARCHAR(50) PRIMARY KEY
);

INSERT INTO invoice_status (code) VALUES
  ('uploaded'),
  ('processing'),
  ('validated'),
  ('rejected');

-- Invoices
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by     UUID                   REFERENCES users(id)      ON DELETE SET NULL,
  invoice_number VARCHAR(255),
  supplier_name  VARCHAR(255),
  amount         NUMERIC(12, 2),
  currency       VARCHAR(10) DEFAULT 'TND',
  invoice_date   DATE,
  due_date       DATE,
  notes          TEXT,
  current_status VARCHAR(50) NOT NULL DEFAULT 'uploaded'
                   REFERENCES invoice_status(code),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  file_name    VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(100) NOT NULL,
  file_size    INT          NOT NULL,
  storage_path TEXT         NOT NULL,
  is_primary   BOOLEAN      NOT NULL DEFAULT TRUE,
  uploaded_by  UUID                  REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMP DEFAULT NOW()
);

-- Status history
CREATE TABLE status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID        NOT NULL REFERENCES invoices(id)       ON DELETE CASCADE,
  status     VARCHAR(50) NOT NULL REFERENCES invoice_status(code),
  changed_by UUID                 REFERENCES users(id)          ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  comment    TEXT
);

-- INDEXES
CREATE INDEX idx_invoices_workspace      ON invoices(workspace_id);
CREATE INDEX idx_invoices_created_by     ON invoices(created_by);
CREATE INDEX idx_invoices_current_status ON invoices(current_status);
CREATE INDEX idx_invoices_invoice_date   ON invoices(invoice_date);
CREATE INDEX idx_invoices_supplier       ON invoices(supplier_name);

CREATE INDEX idx_documents_invoice       ON documents(invoice_id);
CREATE INDEX idx_documents_is_primary    ON documents(invoice_id, is_primary);

CREATE INDEX idx_status_history_invoice  ON status_history(invoice_id);
CREATE INDEX idx_status_history_changed  ON status_history(changed_at);

CREATE INDEX idx_memberships_user        ON memberships(user_id);
CREATE INDEX idx_memberships_workspace   ON memberships(workspace_id);