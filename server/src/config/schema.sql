-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     VARCHAR(255) NOT NULL,
  email                    VARCHAR(255) UNIQUE NOT NULL,
  password_hash            TEXT NOT NULL,
  created_at               TIMESTAMP DEFAULT NOW(),
  -- Set after first workspace is created, cleared if that workspace is deleted
  last_active_workspace_id UUID
);


-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES
  ('Owner'),
  ('Director'),
  ('Accountant'),
  ('Employee'),
  ('Personal');


-- ============================================================
-- WORKSPACES
-- NOTE: type is a free VARCHAR with a CHECK constraint.
--       Not linked to roles(name) — workspace type and user
--       roles are independent concepts.
-- ============================================================
CREATE TABLE workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(50)  NOT NULL CHECK (type IN ('personal', 'company')),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Now that workspaces exists, add the FK on users
ALTER TABLE users
  ADD CONSTRAINT fk_users_last_workspace
  FOREIGN KEY (last_active_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;


-- ============================================================
-- COMPANIES
-- One company profile per workspace
-- ============================================================
CREATE TABLE companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255),
  phone        VARCHAR(50),
  address      TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (workspace_id)
);


-- ============================================================
-- MEMBERSHIPS
-- ============================================================
CREATE TABLE memberships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id      UUID NOT NULL REFERENCES roles(id)      ON DELETE RESTRICT,
  joined_at    TIMESTAMP DEFAULT NOW(),
  contract_start TIMESTAMP,
  contract_end TIMESTAMP,
  UNIQUE (user_id, workspace_id),
);


-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE invitations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code         VARCHAR(255) UNIQUE NOT NULL,
  role_id      UUID NOT NULL REFERENCES roles(id)      ON DELETE RESTRICT,
  max_uses     INT,
  used_count   INT DEFAULT 0,
  expires_at   TIMESTAMP,
  created_by   UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  created_at   TIMESTAMP DEFAULT NOW(),
  accepted_by  UUID      REFERENCES users(id)          ON DELETE SET NULL,
  accepted_at  TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));
);


-- ============================================================
-- INVOICE STATUS (lookup table)
-- ============================================================
CREATE TABLE invoice_status (
  code VARCHAR(50) PRIMARY KEY
);

INSERT INTO invoice_status (code) VALUES
  ('draft'),
  ('pending_review'),
  ('approved'),
  ('rejected'),
  ('paid'),
  ('archived');


-- ============================================================
-- INVOICES
-- NOTE: created_by is nullable so that invoices survive user
--       deletion. ON DELETE SET NULL prevents orphaned records
--       from blocking user cleanup.
-- ============================================================
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID         NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE,
  created_by     UUID                  REFERENCES users(id)       ON DELETE SET NULL,
  invoice_number VARCHAR(255),
  vendor_name    VARCHAR(255),
  amount         NUMERIC(12, 2),
  currency       CHAR(3)      NOT NULL DEFAULT 'TND',
  invoice_date   DATE,
  due_date       DATE,
  notes          TEXT,
  -- Denormalized for fast list/search queries.
  -- Always kept in sync with the latest row in status_history.
  current_status VARCHAR(50)  NOT NULL DEFAULT 'draft'
                   REFERENCES invoice_status(code),
  created_at     TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- DOCUMENTS
-- NOTE: uploaded_by is nullable so documents survive user
--       deletion. is_primary flags the file sent to OCR in Sprint 3.
-- ============================================================
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  file_name    VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(100) NOT NULL,
  file_size    INT          NOT NULL,
  storage_path TEXT         NOT NULL,
  -- Flags which file is the main one sent to the OCR pipeline (Sprint 3)
  is_primary   BOOLEAN      NOT NULL DEFAULT TRUE,
  uploaded_by  UUID                  REFERENCES users(id)    ON DELETE SET NULL,
  uploaded_at  TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- STATUS HISTORY
-- Immutable audit trail of every invoice status transition.
-- Never update or delete rows from this table.
-- ============================================================
CREATE TABLE status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID        NOT NULL REFERENCES invoices(id)   ON DELETE CASCADE,
  status     VARCHAR(50) NOT NULL REFERENCES invoice_status(code),
  changed_by UUID                 REFERENCES users(id)      ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  comment    TEXT
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Invoices
CREATE INDEX idx_invoices_workspace      ON invoices(workspace_id);
CREATE INDEX idx_invoices_created_by     ON invoices(created_by);
CREATE INDEX idx_invoices_current_status ON invoices(current_status);
CREATE INDEX idx_invoices_invoice_date   ON invoices(invoice_date);
CREATE INDEX idx_invoices_vendor         ON invoices(vendor_name);

-- Documents
CREATE INDEX idx_documents_invoice       ON documents(invoice_id);
CREATE INDEX idx_documents_is_primary    ON documents(invoice_id, is_primary);

-- Status history
CREATE INDEX idx_status_history_invoice  ON status_history(invoice_id);
CREATE INDEX idx_status_history_changed  ON status_history(changed_at);

-- Memberships
CREATE INDEX idx_memberships_user        ON memberships(user_id);
CREATE INDEX idx_memberships_workspace   ON memberships(workspace_id);

-- Companies
CREATE INDEX idx_companies_workspace     ON companies(workspace_id);