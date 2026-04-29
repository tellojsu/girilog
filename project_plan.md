# GiriLog — Invoice Management Tool

## 1. Project Description
GiriLog is a clean, professional invoice management web application targeting developers and freelancers. It features a dark, terminal-inspired UI with emerald green accents. Users can create and manage invoices, track payment status, manage clients, and generate downloadable PDFs.

## 2. Page Structure
- `/` - Marketing landing page (public)
- `/login` - Login / Sign up / Forgot password (public)
- `/dashboard` - Dashboard (protected — stats overview + recent invoices)
- `/invoices` - Invoice List (protected — sortable, filterable, searchable)
- `/invoices/new` - Invoice Creator (protected — form + live PDF preview)
- `/invoices/:id` - Invoice Detail / Edit (protected)
- `/clients` - Client Manager (protected)
- `/settings` - Business Settings (protected)

## 3. Core Features
- [x] Dashboard with summary stats (Total Invoiced, Paid, Pending, Overdue)
- [x] Invoice List with status badges, filters, search, sort
- [x] Invoice Creator with line items, tax, discount, live preview
- [ ] Client Manager with invoice history per client
- [ ] PDF Generation (react-pdf)
- [ ] Settings (business profile, logo, invoice prefix, default tax)
- [ ] Invoice status lifecycle: Draft → Pending → Paid (auto-flag Overdue)

## 4. Data Model Design

### Table: girilog_clients
| Field | Type | Description |
|-------|------|-------------|
| id | BIGSERIAL | Primary key |
| name | TEXT | Client/company name |
| email | TEXT | Contact email |
| phone | TEXT | Phone number |
| address | TEXT | Billing address |
| created_at | TIMESTAMPTZ | Created timestamp |

### Table: girilog_invoices
| Field | Type | Description |
|-------|------|-------------|
| id | BIGSERIAL | Primary key |
| invoice_number | TEXT | e.g. INV-0001 |
| client_id | BIGINT | FK → girilog_clients |
| status | TEXT | draft/pending/paid/overdue |
| issue_date | DATE | Invoice issue date |
| due_date | DATE | Payment due date |
| subtotal | NUMERIC | Sum of line items |
| tax_rate | NUMERIC | Tax percentage |
| tax_amount | NUMERIC | Calculated tax |
| discount_amount | NUMERIC | Discount value |
| total | NUMERIC | Final total |
| notes | TEXT | Invoice notes |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

### Table: girilog_line_items
| Field | Type | Description |
|-------|------|-------------|
| id | BIGSERIAL | Primary key |
| invoice_id | BIGINT | FK → girilog_invoices |
| description | TEXT | Item description |
| quantity | NUMERIC | Quantity |
| unit_price | NUMERIC | Price per unit |
| amount | NUMERIC | quantity × unit_price |

### Table: girilog_settings
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Always 1 (singleton) |
| business_name | TEXT | Company name |
| business_email | TEXT | Contact email |
| business_address | TEXT | Address |
| business_phone | TEXT | Phone |
| logo_url | TEXT | Logo image URL |
| invoice_prefix | TEXT | e.g. "INV-" |
| default_tax_rate | NUMERIC | Default tax % |
| currency | TEXT | Default currency |

## 5. Backend / Third-party Integration Plan
- Supabase: Auth (user login/signup/password reset) + Database (all data storage)
- Stripe: Not needed
- Shopify: Not needed
- react-pdf: PDF generation for invoice download

## 6. Development Phase Plan

### Phase 1: Database + Core UI Shell + Dashboard
- Goal: Set up DB schema, shared layout, and Dashboard page
- Deliverable: Working dark-mode app shell with Dashboard stats

### Phase 2: Invoice List + Invoice Creator
- Goal: Full invoice CRUD with live preview
- Deliverable: Create, list, filter, and view invoices

### Phase 3: Client Manager + PDF Download
- Goal: Client directory and PDF export
- Deliverable: Client management + downloadable invoice PDFs

### Phase 4: Settings + Polish
- Goal: Business profile settings, overdue auto-flagging, final polish
- Deliverable: Complete, production-ready app
