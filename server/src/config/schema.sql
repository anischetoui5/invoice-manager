-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'company')),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(255) UNIQUE NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  max_uses INT,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name) VALUES
  ('Personal'),
  ('Director'),
  ('Employee'),
  ('Accountant');

-- Create Lookup/Master Tables

  CREATE TABLE invoice_status (
  code varchar PRIMARY KEY
);

-- Create Core Invoices Table
CREATE TABLE invoices (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  invoice_number varchar,
  amount numeric(12,2),
  invoice_date date,
  created_at timestamp DEFAULT (now())
);

-- Create Documents Table
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL,
  file_name varchar NOT NULL,
  mime_type varchar NOT NULL,
  file_size int NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp DEFAULT (now())
);

-- Create OCR Data Table
CREATE TABLE ocr_data (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL,
  extracted_text text,
  extracted_amount numeric(12,2),
  extracted_date date,
  confidence numeric(5,2)
);

-- Create Status History Table
CREATE TABLE status_history (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL,
  status varchar NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp DEFAULT (now()),
  comment text
);

---
--- Foreign Key Constraints
---

-- Note: Assumptions made for 'workspaces' and 'users' tables 
-- as they are referenced but not defined in your snippet.

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_workspace 
  FOREIGN KEY (workspace_id) REFERENCES workspaces (id);

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_creator 
  FOREIGN KEY (created_by) REFERENCES users (id);

ALTER TABLE documents ADD CONSTRAINT fk_documents_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices (id);

ALTER TABLE documents ADD CONSTRAINT fk_documents_uploader 
  FOREIGN KEY (uploaded_by) REFERENCES users (id);

ALTER TABLE ocr_data ADD CONSTRAINT fk_ocr_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices (id);

ALTER TABLE status_history ADD CONSTRAINT fk_history_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices (id);

ALTER TABLE status_history ADD CONSTRAINT fk_history_user 
  FOREIGN KEY (changed_by) REFERENCES users (id);

ALTER TABLE status_history ADD CONSTRAINT fk_history_status_code 
  FOREIGN KEY (status) REFERENCES invoice_status (code);