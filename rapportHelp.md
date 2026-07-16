# PFE Report Helper
# EASYfact - Invoice & Expense Management Platform
# ESPRIT School of Engineering — Academic Year 2025-2026

---

## SECTION 1 — UPDATED PRODUCT BACKLOG

The original backlog had 19 user stories. Below is the corrected and extended backlog
reflecting everything actually implemented in the codebase.

| ID  | User Story | Priority | Story Points |
|-----|-----------|----------|-------------|
| US1 | As a user, I want to create an account so I can access the system. | Must | 3 |
| US2 | As a user, I want to log in securely with JWT authentication. | Must | 3 |
| US3 | As an admin, I want to manage companies (create, view, update, delete). | Must | 5 |
| US4 | As an admin, I want to manage users and roles. | Must | 5 |
| US5 | As a user, I want to create a personal workspace or join a company workspace. | Must | 5 |
| US6 | As a Director, I want to create a company workspace and share a join code with team members. | Must | 5 |
| US7 | As an employee or accountant, I want to join a company using a code and select my role. | Must | 5 |
| US8 | As an employee, I want to upload invoices so they can be processed automatically. | Must | 5 |
| US9 | As the system, I want to extract invoice data using OCR with confidence scoring. | Must | 13 |
| US10 | As an accountant, I want to validate and correct extracted data before approving. | Must | 8 |
| US11 | As an employee or director, I want to submit an invoice for review and resubmit if rejected. | Must | 5 |
| US12 | As the system, I want secure storage and metadata traceability for uploaded documents. | Must | 5 |
| US13 | As the system, I want authentication, session management, and role-based access control. | Must | 5 |
| US14 | As a director, I want to manage my team (accept/reject join requests, renewals, leaves, remove members). | Must | 8 |
| US15 | As a user, I want to view document status and full status history throughout the workflow. | Should | 3 |
| US16 | As an employee, I want to search and filter invoices by date, vendor, or status. | Should | 5 |
| US17 | As the system, I want audit logs of all user actions scoped by role. | Should | 5 |
| US18 | As a manager/director, I want KPI dashboards with charts and operational metrics. | Could | 8 |
| US19 | As a manager/director, I want to export reports in PDF and Excel. | Could | 5 |
| US20 | As a user, I want in-app and email notifications for invoice status changes and system events. | Could | 5 |
| US21 | As a director, I want to subscribe to a plan and upgrade/renew my company subscription. | Must | 8 |
| US22 | As the system, I want to automatically detect expired subscriptions and lock non-director access. | Must | 5 |
| US23 | As a user, I want an AI assistant to help me navigate the platform and answer questions. | Could | 5 |
| US24 | As a team member, I want to send and receive real-time messages in workspace channels. | Could | 8 |
| US25 | As a team member on Professional/Enterprise, I want direct messages with other workspace members. | Could | 5 |
| US26 | As a Director on Professional/Enterprise, I want to create custom channels for my workspace. | Could | 3 |
| US27 | As a user, I want to update my profile, password, and notification preferences in Settings. | Should | 3 |
| US28 | As a Director, I want to update company information from the Settings page. | Should | 3 |
| US29 | As a user, I want to install the platform as a PWA on my mobile or desktop. | Could | 2 |

**Total Story Points: 163**

---

## SECTION 2 — UPDATED SPRINT BREAKDOWN

### SPRINT 1 — Foundation, Authentication & Administration
**Duration:** 2 weeks (14 days)
**Sprint Goal:** Deliver secure multi-role authentication, workspace initialization, and administrator CRUD as the technical baseline.

**User Stories:** US1, US2, US3, US4, US5, US6, US7, US13

**What was implemented:**
- User registration with email, name, password (bcrypt hashing)
- Login with JWT access token + refresh mechanism
- Role-based access control middleware (Admin, Director, Accountant, Employee, Personal)
- Admin: full CRUD for companies
- Admin: full CRUD for users and role assignments
- Personal workspace auto-created on registration
- Company workspace creation by Director
- Company join code generation (unique 6-char code)
- Employee/Accountant join flow using company code + role selection
- Workspace switching (multi-workspace support)
- Session management and logout

**Use Case Diagram:** Sprint 1 covers Authentication + Administration

**Sequence Diagrams (one per CRUD + key flows):**
1. User Registration (Create Account)
2. User Login / Authentication
3. Create User (Admin CRUD)
4. View Users (Admin CRUD)
5. Update User Role (Admin CRUD)
6. Delete User (Admin CRUD)
7. Create Company (Admin CRUD)
8. View Companies (Admin CRUD)
9. Update Company (Admin CRUD)
10. Delete Company (Admin CRUD)
11. Create Company Workspace (Director flow)
12. Join Company Workspace with Code (Employee/Accountant flow)
13. Switch Workspace

---

### SPRINT 2 — Invoice Upload, Document Management & Team Management
**Duration:** 2 weeks (14 days)
**Sprint Goal:** Deliver end-to-end invoice ingestion with secure document storage, status tracking, and team management for company workspaces.

**User Stories:** US8, US12, US14, US15, US16

**What was implemented:**
- Invoice upload with multi-file support (PDF, images)
- MIME type validation and file size limits
- Secure document storage (server/uploads) with metadata
- Invoice record creation in DB (invoice_number, vendor, amount, dates, currency)
- Invoice list with search (vendor name, date range, status filter, pagination)
- Invoice detail page (document viewer for PDF and images with zoom)
- Draft invoice deletion (Employee/Director only)
- Status tracking display (current_status, status badges)
- Team Management: Director views all members by role
- Accept/reject join requests (with contract start/end dates for new members)
- Accept/reject leave requests (immediate removal on approval)
- Accept/reject renewal requests (new contract end date)
- Remove member from workspace
- Company join code display with copy button (Team Management + Settings)

**Use Case Diagram:** Sprint 2 covers Invoice Upload + Document Management + Team Management

**Sequence Diagrams:**
1. Upload Invoice (Create — Employee/Director flow with file + OCR trigger)
2. View Invoice Details (Read — document viewer + field display)
3. List and Search Invoices (Read — paginated with filters)
4. Delete Draft Invoice (Delete — Employee/Director)
5. View Team Members (Read — Director)
6. Accept Join Request (Update — Director, with contract dates)
7. Reject Join Request (Update — Director)
8. Accept Leave Request (Update — Director, removes member)
9. Accept Renewal Request (Update — Director, new contract date)
10. Remove Member (Delete — Director)

---

### SPRINT 3 — OCR Integration, Validation Workflow & Subscription
**Duration:** 3 weeks (21 days)
**Sprint Goal:** Deliver robust OCR extraction with confidence-based validation, full invoice status workflow, and subscription plan management with expiry enforcement.

**User Stories:** US9, US10, US11, US21, US22

**What was implemented:**
- Asynchronous OCR processing pipeline (Groq Vision API)
- OCR confidence scoring per field
- Extracted fields: invoice_number, invoice_date, due_date, total_amount, tax_amount, supplier_name
- Low-confidence field flagging (needs_review)
- Manual field correction by Employee/Director/Accountant
- "Sync from OCR" button to populate invoice form from extracted data
- Invoice status workflow: draft → pending_review → approved → rejected → paid → archived
- Employee/Director: Submit for Review
- Employee/Director: Resubmit for Review (after rejection)
- Accountant: Approve / Reject with mandatory notes on rejection
- Director: Mark as Paid, Mark as Archived
- Status history tracking (status_history table with changed_by, comment, timestamp)
- WorkflowStepper component (visual progress indicator)
- Subscription plans: 4 company (Starter €49, Business €149, Professional €349, Enterprise €999)
- Subscription plans: 4 personal (Free €0, Basic €9, Plus €19, Premium €39)
- Plan upgrade with pro-rated credit for company plans
- Personal plans: full price, no credit
- Subscription expiry detection on-the-fly (current_period_end < NOW())
- Hourly cron job to mark subscriptions as expired in DB
- Director notification on subscription expiry
- Non-director full lock screen on expired company subscription (SubscriptionLock)
- Director renewal banner with "Renew Now" button
- Plan feature flags: has_chat, has_dm, can_create_channels per plan

**Use Case Diagram:** Sprint 3 covers OCR Extraction + Validation Workflow + Subscription

**Sequence Diagrams:**
1. OCR Processing and Confidence Scoring (async trigger after upload)
2. Create Extracted Fields (OCR writes fields to DB)
3. View Extracted Fields (Accountant/Employee reads OCR output)
4. Update Extracted Fields Before Approval (manual correction CRUD)
5. Submit Invoice for Review (Employee → pending_review)
6. Resubmit Rejected Invoice (Employee → pending_review from rejected)
7. Approve Invoice (Accountant → approved)
8. Reject Invoice with Notes (Accountant → rejected)
9. Mark Invoice as Paid (Director → paid)
10. View Status History (Read — all roles)
11. Subscribe to Plan (Create Subscription — Director)
12. Upgrade/Renew Subscription (Update — with credit calculation)
13. View Current Subscription (Read — subscription details page)
14. Subscription Expiry Detection and Lock (System cron flow)

---

### SPRINT 4 — Reporting, Analytics, Notifications & Activity Log
**Duration:** 2 weeks (14 days)
**Sprint Goal:** Deliver managerial KPI dashboards, exportable reports, full activity audit logging, and a real-time notification system.

**User Stories:** US17, US18, US19, US20, US27, US28

**What was implemented:**
- Role-specific dashboard KPI cards:
  - Employee: invoices uploaded, pending, approved, total amount
  - Accountant: pending validation count, approved, rejected, processed today
  - Director: total invoices, team size, approval rate, total amount approved, avg processing time
- Reports page with interactive charts (Recharts):
  - Line chart: invoice volume over time
  - Bar chart: monthly invoice amounts
  - Pie chart: invoice status distribution
  - Summary stats: total invoices, total amount, approval rate, avg processing time
- Date range filter for reports (last 7/30/90 days or custom)
- Export reports to PDF (jsPDF + html2canvas)
- Export reports to Excel (xlsx)
- Activity log (History page): all workspace events with action type, user, entity, timestamp
- Role-scoped activity: Employee sees own, Accountant sees own, Director/Admin see all
- Pagination in History page (30 per page)
- In-app notifications system (notifications table)
- Notification triggers: invoice submitted, approved, rejected, subscription expired, member actions
- Notification panel (bell icon with unread count badge)
- Mark single notification as read
- Mark all notifications as read
- Notification polling every 30 seconds
- Email notifications via Brevo HTTP API (invoice status changes; SMTP blocked on cloud hosting — uses REST API over HTTPS)
- Profile settings: update name, email, avatar
- Password change with strength indicator (Settings page)
- Company info update by Director (Settings page)
- Accountant: view contract dates, request leave, request renewal from Settings

**Use Case Diagram:** Sprint 4 covers Reporting + Notifications + History + Settings

**Sequence Diagrams:**
1. Generate KPI Dashboard (Director/Manager reads aggregated data)
2. Generate Report with Date Filter (Read — charts data)
3. Create Report Export — PDF (Director exports to PDF)
4. Create Report Export — Excel (Director exports to Excel)
5. View Activity Log / History (Read — paginated, role-scoped)
6. Create Notification (System triggers notification on invoice event)
7. View Notifications (Read — user reads notification panel)
8. Mark Notification as Read (Update — single)
9. Mark All Notifications as Read (Update — bulk)
10. Update User Profile (Update — name, email, avatar)
11. Update Password (Update — with current password verification)
12. Update Company Information (Update — Director only)
13. Request Leave (Create — Accountant submits leave request)
14. Request Contract Renewal (Create — Accountant submits renewal request)

---

### SPRINT 5 — AI Assistance, Real-Time Chat & Stabilization
**Duration:** 2 weeks (14 days)
**Sprint Goal:** Deliver AI-guided assistance, plan-gated real-time team messaging, PWA support, and end-to-end stabilization.

**User Stories:** US23, US24, US25, US26, US29

**What was implemented:**
- AI Chat assistant (Groq API — llama3 model):
  - Workspace-scoped context (knows current workspace)
  - Floating chat bubble on all pages
  - Invoice-related question answering
  - Domain-constrained responses (advisory only)
- Real-time team messenger (Socket.io):
  - WebSocket server integrated into Node.js HTTP server
  - JWT authentication on socket connection
  - Workspace room joining
  - Conversation room joining
  - Typing indicators (start/stop with 3s auto-clear)
  - New message broadcast to all room members
- Chat feature gating by subscription plan:
  - Starter: no chat (upsell screen shown)
  - Business: channels only (no DMs, no custom channel creation)
  - Professional: channels + DMs + all Directors can create channels
  - Enterprise: channels + DMs + Director-only channel creation
- Chat conversations: channels and direct messages
- Auto-created #general channel on first access per workspace
- Channel creation (Director on Pro/Enterprise)
- Direct message creation (Pro/Enterprise only)
- Message history with load-more pagination (before-cursor, 50 msgs/page)
- Unread message count per conversation
- Unread badge on Chat sidebar link (polls every 15 seconds)
- Date separators in message list (Today / Yesterday / full date)
- Hover-reveal timestamps on chained messages
- Chat plan upsell screen for Starter/Personal plans
- PWA manifest and install prompt (InstallPWA component)
- Mobile navigation bar (MobileNav)
- **Delete own chat message**: trash icon on hover for own messages, `message:delete` socket event, soft-delete (`deleted_at` column), real-time broadcast `message:deleted` to all conversation members
- **Mobile UI enhancements**: TopBar shows logo + "EasyFact" on mobile left side; MobileNav uses CSS variables for dark mode; "More" slide-up drawer shows logo in header; Settings tabs responsive (2-col on mobile); CustomizationPanel hidden on mobile (desktop-only)
- **Subscription plan feature cards**: 6-item feature list per plan with Check/X icons (invoices/mo, users, OCR accuracy, team chat, DMs, custom channels)
- **Production deployment**:
  - Frontend: Vercel (https://easyfact-three.vercel.app) — auto-deploys on push to main; `vercel.json` SPA routing rewrites
  - Backend: Render free tier (https://easyfact.onrender.com) — auto-deploys on push to main; keep-alive cron pings `/api/health` every 10 min to prevent cold start
  - Database: Neon PostgreSQL 17, EU Frankfurt, free tier (0.5 GB)
  - Email: Brevo HTTP API (SMTP port 587 blocked by Render — switched to REST API on port 443); verification codes also logged to server console as fallback
  - PWA: fully installable in production via Chrome "Add to Home Screen"; real logo icons used for app icon and favicon
- **Logo integration**: custom EasyFact logo (`logo-icon.png` circle E, `logo.png` full EF+text) replaces placeholder icon in sidebar, favicon, PWA manifest, apple-touch-icon
- Bug fixes: subscription same-plan renewal when expired
- Bug fixes: payment modal portal rendering (createPortal to document.body)
- Bug fixes: rejected invoice editing and resubmission
- Bug fixes: company join code visible in Team Management page
- Bug fixes: MobileNav role normalization (DB stores `Personal` with capital P — must map to `normal` for nav item matching)
- Bug fixes: avatar URLs use `VITE_API_URL` base in production (not `window.location.hostname:3000`)

**Use Case Diagram:** Sprint 5 covers AI Chat + Team Messenger + PWA + Stabilization

**Sequence Diagrams:**
1. AI Guidance Request and Response (User asks AI assistant, Groq API responds)
2. Create Channel (Director creates a new workspace channel)
3. View Conversations (User loads channel + DM list with unread counts)
4. Send Message (User sends message via WebSocket, broadcast to room)
5. View Messages with Pagination (Read — load 50 messages, load more older)
6. Create Direct Message Conversation (Pro/Enterprise — user starts DM)
7. Mark Conversation as Read (Update — resets unread count)
8. Typing Indicator Flow (Socket emit typing:start / typing:stop)
9. Chat Feature Gate Check (System checks plan features before allowing action)
10. Install PWA (User installs app from browser prompt)

---

## SECTION 3 — PROMPT FOR CLAUDE TO GENERATE THE FULL REPORT

Copy and paste the following prompt to Claude to generate the complete professional report:

---

```
Generate a complete, professional Final Year Project (PFE) report in LaTeX for the following project. 
The report is for ESPRIT School of Engineering, Department of Business Information Systems, Academic Year 2025–2026.

PROJECT TITLE: Design and Development of a Web Application for Invoice and Expense Management with OCR and AI Assistance
STUDENT: Anis Chetoui
ACADEMIC SUPERVISOR: Dr. Ahmed Ben Khalifa
COMPANY SUPERVISOR: Mr. Mehdi Bouazizi
HOST COMPANY: Digital Finance Solutions S.A.R.L

TECHNOLOGY STACK (use this in Chapter 5):
- Frontend: React 18, TypeScript, Tailwind CSS, Recharts, Socket.io-client, date-fns, Lucide Icons, jsPDF, xlsx, Sonner (toasts)
- Backend: Node.js, Express.js, PostgreSQL (pg), Socket.io, JWT (jsonwebtoken), Multer (file upload), node-cron, bcrypt, Brevo HTTP API (transactional email), Nodemon
- OCR & AI: Groq API (llama-3.2-11b-vision model for OCR, llama3-8b-8192 for chat)
- Architecture: RESTful API + WebSocket server, monorepo structure (client/ + server/)
- PWA: Web App Manifest, Service Worker, InstallPWA component

ROLES IN THE SYSTEM:
- Admin: manages all companies and users at platform level
- Director: manages company workspace, team, subscription, invoices
- Accountant: validates OCR-extracted invoice data, performs reconciliation; has contract dates
- Employee: uploads invoices, tracks status, communicates in team chat
- Personal: individual user with personal workspace (no team features)

STRUCTURE OF THE REPORT (follow this exactly):

Cover Page
Acknowledgements
Abstract (French and English)
Table of Contents
List of Figures
List of Tables
General Introduction

Chapter 1 — General Context of the Project
  1.1 Introduction
  1.2 Host Company Presentation (Digital Finance Solutions S.A.R.L)
  1.3 Project Context
  1.4 Problem Statement (manual invoice processing: slow, error-prone, poor traceability)
  1.5 Existing Solutions Study (briefly mention SAP Concur, Docuware, Kofax — limitations for SMEs)
  1.6 Proposed Solution
  1.7 Conclusion

Chapter 2 — Project Management and Methodology
  2.1 Introduction
  2.2 Agile Methodology and Scrum Governance
    2.2.1 Scrum Roles
    2.2.2 Ceremonies and Artifacts
    2.2.3 Definition of Done (DoD)
  2.3 Product Backlog (full table with 29 user stories — see backlog below)
  2.4 Prioritization (MoSCoW) and Estimation (Fibonacci story points)
  2.5 Sprint Planning
    2.5.1 Dependency Rules
    2.5.2 Sprint 1 — Foundation, Authentication & Administration (2 weeks, 84h)
    2.5.3 Sprint 2 — Invoice Upload, Document Management & Team Management (2 weeks, 82h)
    2.5.4 Sprint 3 — OCR Integration, Validation Workflow & Subscription (3 weeks, 118h)
    2.5.5 Sprint 4 — Reporting, Analytics, Notifications & Settings (2 weeks, 86h)
    2.5.6 Sprint 5 — AI Assistance, Real-Time Chat & Stabilization (2 weeks, 84h)
    2.5.7 Sprint Timeline Summary
    2.5.8 Sprint Review and Retrospective Outcomes
    2.5.9 Risk Management with Justification
  2.6 Conclusion

Chapter 3 — Requirements Analysis
  3.1 Introduction
  3.2 Actors and User Roles
  3.3 Functional Requirements (table with FR codes — see list below)
  3.4 Non-Functional Requirements
  3.5 Conclusion

Chapter 4 — System Design
  4.1 Introduction
  4.2 Global Use Case Diagram [IMAGE PLACEHOLDER]
  4.3 Class Diagram [IMAGE PLACEHOLDER]
  4.4 Sequence Diagram — Core Invoice Workflow [IMAGE PLACEHOLDER]
  4.5 Technical Architecture
    4.5.1 Layered Architecture (Presentation, Application, Domain, Data)
    4.5.2 WebSocket Architecture for Real-Time Chat
  4.6 Database Schema Design (describe main tables: users, workspaces, companies, invoices, invoice_documents, extracted_fields, status_history, subscriptions, subscription_plans, notifications, activity_log, chat_conversations, chat_members, chat_messages, memberships, roles, invitations)
  4.7 OCR Processing Pipeline
  4.8 AI Assistance Architecture and Scope
  4.9 Conclusion

Chapter 5 — Implementation
  5.1 Introduction
  5.2 Development Environment and Technologies (full stack as listed above)
  5.3 Sprint 1 Implementation — Foundation, Authentication & Administration
    - Description of what was built
    - Use Case Diagram [IMAGE PLACEHOLDER — label: Figure X.X Sprint 1 Use Case Diagram]
    - Sequence Diagrams (one subsection per CRUD):
      * User Authentication [IMAGE PLACEHOLDER]
      * Create User [IMAGE PLACEHOLDER]
      * View Users [IMAGE PLACEHOLDER]
      * Update User Role [IMAGE PLACEHOLDER]
      * Delete User [IMAGE PLACEHOLDER]
      * Create Company [IMAGE PLACEHOLDER]
      * View Companies [IMAGE PLACEHOLDER]
      * Update Company [IMAGE PLACEHOLDER]
      * Delete Company [IMAGE PLACEHOLDER]
      * Create Company Workspace [IMAGE PLACEHOLDER]
      * Join Company with Code [IMAGE PLACEHOLDER]
  5.4 Sprint 2 Implementation — Invoice Upload, Document Management & Team Management
    - Description
    - Use Case Diagram [IMAGE PLACEHOLDER]
    - Sequence Diagrams:
      * Upload Invoice (Create) [IMAGE PLACEHOLDER]
      * View Invoice Details (Read) [IMAGE PLACEHOLDER]
      * List and Search Invoices (Read) [IMAGE PLACEHOLDER]
      * Delete Draft Invoice (Delete) [IMAGE PLACEHOLDER]
      * View Team Members (Read) [IMAGE PLACEHOLDER]
      * Accept Join Request (Update) [IMAGE PLACEHOLDER]
      * Reject Join Request (Update) [IMAGE PLACEHOLDER]
      * Accept Leave Request (Update) [IMAGE PLACEHOLDER]
      * Accept Renewal Request (Update) [IMAGE PLACEHOLDER]
      * Remove Member (Delete) [IMAGE PLACEHOLDER]
  5.5 Sprint 3 Implementation — OCR Integration, Validation Workflow & Subscription
    - Description
    - Use Case Diagram [IMAGE PLACEHOLDER]
    - Sequence Diagrams:
      * OCR Processing and Confidence Scoring [IMAGE PLACEHOLDER]
      * Create Extracted Fields (OCR writes to DB) [IMAGE PLACEHOLDER]
      * View Extracted Fields [IMAGE PLACEHOLDER]
      * Update Extracted Fields Before Approval [IMAGE PLACEHOLDER]
      * Submit Invoice for Review [IMAGE PLACEHOLDER]
      * Resubmit Rejected Invoice [IMAGE PLACEHOLDER]
      * Approve Invoice [IMAGE PLACEHOLDER]
      * Reject Invoice with Notes [IMAGE PLACEHOLDER]
      * View Status History [IMAGE PLACEHOLDER]
      * Subscribe to Plan (Create) [IMAGE PLACEHOLDER]
      * Upgrade/Renew Subscription (Update) [IMAGE PLACEHOLDER]
      * Subscription Expiry Detection (System cron) [IMAGE PLACEHOLDER]
  5.6 Sprint 4 Implementation — Reporting, Analytics, Notifications & Settings
    - Description
    - Use Case Diagram [IMAGE PLACEHOLDER]
    - Sequence Diagrams:
      * Generate KPI Dashboard [IMAGE PLACEHOLDER]
      * Create Report Export PDF [IMAGE PLACEHOLDER]
      * Create Report Export Excel [IMAGE PLACEHOLDER]
      * View Activity Log [IMAGE PLACEHOLDER]
      * Create Notification (System trigger) [IMAGE PLACEHOLDER]
      * View Notifications [IMAGE PLACEHOLDER]
      * Mark Notification as Read [IMAGE PLACEHOLDER]
      * Update User Profile [IMAGE PLACEHOLDER]
      * Update Password [IMAGE PLACEHOLDER]
      * Update Company Information [IMAGE PLACEHOLDER]
      * Request Leave (Accountant) [IMAGE PLACEHOLDER]
      * Request Contract Renewal (Accountant) [IMAGE PLACEHOLDER]
  5.7 Sprint 5 Implementation — AI Assistance, Real-Time Chat & Stabilization
    - Description
    - Use Case Diagram [IMAGE PLACEHOLDER]
    - Sequence Diagrams:
      * AI Guidance Request and Response [IMAGE PLACEHOLDER]
      * Create Channel [IMAGE PLACEHOLDER]
      * View Conversations [IMAGE PLACEHOLDER]
      * Send Message (WebSocket flow) [IMAGE PLACEHOLDER]
      * View Messages with Pagination [IMAGE PLACEHOLDER]
      * Create Direct Message Conversation [IMAGE PLACEHOLDER]
      * Mark Conversation as Read [IMAGE PLACEHOLDER]
      * Chat Feature Gate Check (plan validation) [IMAGE PLACEHOLDER]
  5.8 Application Interfaces
    - Authentication Interface [IMAGE PLACEHOLDER]
    - Dashboard Interface [IMAGE PLACEHOLDER]
    - Invoice Upload Interface [IMAGE PLACEHOLDER]
    - Invoice Detail and OCR Validation Interface [IMAGE PLACEHOLDER]
    - Reports Interface [IMAGE PLACEHOLDER]
    - Team Chat Interface [IMAGE PLACEHOLDER]
    - Subscription Management Interface [IMAGE PLACEHOLDER]
    - Settings Interface [IMAGE PLACEHOLDER]
  5.9 Implementation Challenges and Solutions
  5.10 Conclusion

Chapter 6 — Testing and Validation
  6.1 Introduction
  6.2 Testing Strategy (Unit, Integration, System, UAT)
  6.3 Validation Scenarios
  6.4 KPI-Based Validation
  6.5 Results and Discussion
  6.6 Testing Limitations and Future Hardening
  6.7 Conclusion

General Conclusion
References
Appendix

---

IMPORTANT FORMATTING RULES:
1. For every IMAGE PLACEHOLDER, use this exact LaTeX pattern:
\begin{figure}[H]
\centering
\fbox{\parbox{0.85\textwidth}{\centering\vspace{2cm}[Description of the diagram]\vspace{2cm}}}
\caption{[Figure caption]}
\label{fig:[label]}
\end{figure}

2. For each sprint, put the task table IMMEDIATELY after the sprint goal paragraph.

3. Use professional, formal academic French or English (choose English throughout for consistency).

4. Each chapter must start with an Introduction subsection and end with a Conclusion subsection.

5. Sequence diagrams: every CRUD operation in every sprint must have its own dedicated figure placeholder with a clear caption (e.g., "Figure 5.3: Sprint 1 Sequence Diagram — Create User (CRUD)").

6. Use the LaTeX document class: \documentclass[12pt,a4paper]{report}

7. Use the following packages: geometry, graphicx, float, hyperref, booktabs, longtable, array, xcolor, fancyhdr, titlesec, listings, color, setspace, babel (english), inputenc (utf8), fontenc (T1), amsmath, multirow

8. The backlog table must include all 29 user stories.

9. Each sprint plan table must have columns: Task ID | Task Description | User Story | Effort (h) | Depends

10. Do NOT add any content to the Appendix — leave it empty with just the header.

11. The report must be fully compilable LaTeX with no missing braces or syntax errors.

PRODUCT BACKLOG (use these exact 29 user stories in Chapter 2):
US1 — Create account / register
US2 — Login securely (JWT)
US3 — Admin manage companies (CRUD)
US4 — Admin manage users and roles (CRUD)
US5 — Create personal workspace
US6 — Director creates company workspace with join code
US7 — Employee/Accountant joins company with code
US8 — Employee uploads invoices (multi-file, PDF/image)
US9 — System extracts invoice data using OCR with confidence scoring
US10 — Accountant validates and corrects extracted fields
US11 — Employee/Director submits and resubmits invoices for review
US12 — System securely stores documents with metadata traceability
US13 — System enforces role-based authentication and session management
US14 — Director manages team (join, leave, renewal requests, remove members, contract dates)
US15 — User views document status and full status history
US16 — User searches and filters invoices by date, vendor, or status
US17 — System maintains audit log of all user actions
US18 — Director/Manager views role-specific KPI dashboard
US19 — Director/Manager exports reports to PDF and Excel
US20 — User receives in-app and email notifications for invoice events and subscription expiry
US21 — Director subscribes to and upgrades a plan (with credit for company plans)
US22 — System auto-detects expired subscriptions, locks non-director access, notifies Director
US23 — User gets AI-assisted guidance through an in-app chat assistant
US24 — Team members send/receive real-time messages in workspace channels
US25 — Pro/Enterprise members use direct messages
US26 — Director on Pro/Enterprise creates custom workspace channels
US27 — User updates profile, password, and notification preferences
US28 — Director updates company information from Settings
US29 — User installs the platform as a PWA

FUNCTIONAL REQUIREMENTS (use in Chapter 3):
FR1 — User registration and secure authentication
FR2 — Company management by administrator
FR3 — User and role management
FR4 — Multi-workspace support (personal + company)
FR5 — Company workspace join via unique code
FR6 — Team management (join/leave/renewal requests, contract dates, member removal)
FR7 — Multi-file invoice upload with format validation
FR8 — Automatic OCR data extraction with confidence scoring
FR9 — Manual field correction by authorized roles
FR10 — Invoice status workflow (draft → pending_review → approved/rejected → paid/archived)
FR11 — Invoice resubmission after rejection
FR12 — Secure document storage with metadata traceability
FR13 — Invoice search and filtering
FR14 — Audit logging of user actions
FR15 — Role-specific KPI dashboards
FR16 — Report export (PDF and Excel)
FR17 — In-app and email notification system
FR18 — Subscription plan management (upgrade, credit, renewal)
FR19 — Automatic subscription expiry enforcement and access locking
FR20 — AI-assisted chat guidance (advisory only, domain-constrained)
FR21 — Real-time team messaging (channels, DMs — plan-gated)
FR22 — Chat feature gating per subscription plan
FR23 — User profile, password, and company settings management
FR24 — PWA installation support

Generate the complete LaTeX source code for this report now. Make it detailed, professional, and academically rigorous. Every chapter should be substantial with proper explanations, not just bullet lists. The sequence diagram placeholders are the most important — make sure every single one listed above has its own \begin{figure}...\end{figure} block with a proper caption.
```

---

## SECTION 4 — QUICK REFERENCE: DIAGRAMS CHECKLIST

Use this checklist when you draw your UML diagrams.

### Global Diagrams (Chapter 4)
- [ ] Global Use Case Diagram (all roles, all main use cases)
- [ ] Class Diagram (main entities: User, Workspace, Company, Invoice, Document, ExtractedField, StatusHistory, Subscription, SubscriptionPlan, Notification, ChatConversation, ChatMessage, Membership)
- [ ] Global Sequence Diagram (core invoice lifecycle: upload → OCR → validate → approve)
- [ ] System Architecture Diagram (4-layer: React Frontend ↔ REST API + WebSocket ↔ Services ↔ PostgreSQL + Groq API)

### Sprint 1 Diagrams
- [ ] Use Case Diagram (Authentication + Admin)
- [ ] Sequence: User Authentication (login + JWT)
- [ ] Sequence: Create User (Admin)
- [ ] Sequence: View Users (Admin)
- [ ] Sequence: Update User Role (Admin)
- [ ] Sequence: Delete User (Admin)
- [ ] Sequence: Create Company (Admin)
- [ ] Sequence: View Companies (Admin)
- [ ] Sequence: Update Company (Admin)
- [ ] Sequence: Delete Company (Admin)
- [ ] Sequence: Create Company Workspace (Director)
- [ ] Sequence: Join Company with Code (Employee/Accountant)

### Sprint 2 Diagrams
- [ ] Use Case Diagram (Invoice Upload + Team Management)
- [ ] Sequence: Upload Invoice (Employee)
- [ ] Sequence: View Invoice Details
- [ ] Sequence: List and Search Invoices
- [ ] Sequence: Delete Draft Invoice
- [ ] Sequence: View Team Members (Director)
- [ ] Sequence: Accept Join Request (Director)
- [ ] Sequence: Reject Join Request (Director)
- [ ] Sequence: Accept Leave Request (Director)
- [ ] Sequence: Accept Renewal Request (Director)
- [ ] Sequence: Remove Member (Director)

### Sprint 3 Diagrams
- [ ] Use Case Diagram (OCR + Validation + Subscription)
- [ ] Sequence: OCR Processing and Confidence Scoring
- [ ] Sequence: Create Extracted Fields (System writes OCR output)
- [ ] Sequence: View Extracted Fields
- [ ] Sequence: Update Extracted Fields (manual correction)
- [ ] Sequence: Submit Invoice for Review
- [ ] Sequence: Resubmit Rejected Invoice
- [ ] Sequence: Approve Invoice (Accountant)
- [ ] Sequence: Reject Invoice with Notes (Accountant)
- [ ] Sequence: View Status History
- [ ] Sequence: Subscribe to Plan (Director)
- [ ] Sequence: Upgrade/Renew Subscription
- [ ] Sequence: Subscription Expiry Detection (cron system)

### Sprint 4 Diagrams
- [ ] Use Case Diagram (Reports + Notifications + Settings)
- [ ] Sequence: Generate KPI Dashboard
- [ ] Sequence: Export Report to PDF
- [ ] Sequence: Export Report to Excel
- [ ] Sequence: View Activity Log
- [ ] Sequence: System Creates Notification (invoice event trigger)
- [ ] Sequence: View Notifications (user reads panel)
- [ ] Sequence: Mark Notification as Read
- [ ] Sequence: Update User Profile
- [ ] Sequence: Update Password
- [ ] Sequence: Update Company Information (Director)
- [ ] Sequence: Accountant Requests Leave
- [ ] Sequence: Accountant Requests Contract Renewal

### Sprint 5 Diagrams
- [ ] Use Case Diagram (AI Chat + Team Messenger + PWA)
- [ ] Sequence: AI Guidance Request and Response (Groq API flow)
- [ ] Sequence: Create Channel (Director)
- [ ] Sequence: View Conversations (load channels + DMs)
- [ ] Sequence: Send Message (WebSocket emit + broadcast)
- [ ] Sequence: Load Messages with Pagination (before-cursor)
- [ ] Sequence: Create Direct Message Conversation
- [ ] Sequence: Mark Conversation as Read
- [ ] Sequence: Chat Feature Gate Check (plan validation)
- [ ] Sequence: Delete Own Message (WebSocket soft-delete flow)

### Deployment Diagram (Chapter 4 or 5)
- [ ] Deployment Architecture Diagram (Vercel → Render API → Neon DB + Brevo email)

### Interface Screenshots (Chapter 5.8)
- [ ] Login / Register page
- [ ] Dashboard (Director view)
- [ ] Invoice Upload page
- [ ] Invoice Detail page (with OCR fields)
- [ ] Reports page (charts)
- [ ] Team Chat page
- [ ] Subscription page
- [ ] Settings page
- [ ] Team Management page
- [ ] Notifications panel
- [ ] Mobile view (bottom nav + logo header)
- [ ] PWA installed on phone home screen

---

*Total diagrams to draw: ~60 UML diagrams + ~12 interface screenshots*
*Tip: Use draw.io, PlantUML, or Lucidchart for the sequence and use case diagrams.*
