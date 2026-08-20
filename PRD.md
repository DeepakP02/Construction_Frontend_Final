# Product Requirements Document (PRD) - ConstructOS

## 1. Product Vision
To build a comprehensive, multi-tenant Construction Management SaaS Platform that streamlines operations for construction companies, from project planning and execution to client communication and billing. The platform serves four key stakeholders: Platform Admins, Construction Companies, Field Teams, and End Clients.

## 2. Target Audience & User Roles

### A. Super Admin (Platform Owner)
The entity that owns the SaaS platform.
- **Goal:** Manage subscriptions, onboard construction companies, and monitor platform revenue.
- **Key Features:**
  - **Dashboard:** Platform-wide metrics (Total Companies, MRR, Active Users).
  - **Companies:** CRUD operations for tenant companies.
  - **Subscriptions:** Manage billing plans (Free, Pro, Enterprise).
  - **Revenue:** Financial reporting.
  - **Support Tickets:** Handle inquiries from construction companies.
  - **Settings:** Global platform configuration.

### B. Company Admin (The Customer)
Construction firm owners or high-level managers.
- **Goal:** Manage multiple projects, teams, finances, and company-wide settings.
- **Key Features:**
  - **Dashboard:** Company-specific overview (Active Projects, Budget Health).
  - **Projects:** Create and manage construction projects (CRUD).
  - **Scheduling:** High-level project timelines (Gantt charts).
  - **Photos:** Centralized gallery of site progress.
  - **Drawings:** Management of blueprints and documents.
  - **Issues:** Defect and issue tracking.
  - **Estimates:** Job costing and estimates.
  - **Communication:** Internal messaging and announcements.
  - **Team:** Employee management and role assignment.
  - **Settings:** Company branding and configurations.

### C. Project Team (The Field Workers)
Project Managers, Foremen, and Site Workers.
- **Goal:** Execute daily tasks, report progress, and log hours.
- **Key Features:**
  - **Home:** Daily dashboard with assigned tasks and weather alerts.
  - **Time Tracking:** Clock In/Out functionality with geolocation verification.
  - **My Tasks:** List of assigned daily duties.
  - **Photo Upload:** Upload site photos directly from the field.
  - **Team Chat:** Coordination with the crew.
  - **My Profile:** Personal settings and work history.

### D. Client Portal (The End Customer)
The property owner or developer who hired the construction company.
- **Goal:** Monitor project progress and approve key milestones without getting bogged down in technical details.
- **Key Features:**
  - **Overview:** High-level project status and budget utilization.
  - **Timeline:** Simplified view of the project schedule.
  - **Photos:** Curated progress photos.
  - **Approvals:** Digital sign-off for change orders or milestone completions.
  - **Invoices:** View and pay project invoices.
  - **Messages:** Direct line to the Project Manager.

## 3. Core Functional Requirements

### Authentication & Authorization
- **Multi-Role Login:** Secure login redirects users to their specific dashboard based on role.
- **Session Management:** Persistent sessions with secure token handling.
- **Role-Based Access Control (RBAC):** Strict boundaries between data (e.g., Client cannot see internal team chats).

### Project Management
- **CRUD Operations:** Create, Read, Update, Delete functionality for Projects, Tasks, and Issues.
- **Real-time Updates:** Status changes should reflect immediately (or on refresh) for all stakeholders.

### Media Management
- **Image Upload:** Support for site photos with timestamps.
- **Document Viewer:** Support for PDF drawings and plans.

### Financials
- **Estimating:** Creation of project cost estimates.
- **Invoicing:** Client-facing billing and payment tracking.
- **Timesheets:** Automated work hour calculation from clock-in/out data.

## 4. Non-Functional Requirements
- **Responsive Design:** Mobile-first for field workers; Desktop-optimized for admins.
- **Performance:** Fast load times for media-heavy pages (Photos, Drawings).
- **Data Integrity:** Accurate time-tracking and financial calculations.
- **UI/UX:** Modern, clean, and intuitive "ConstructOS" theme using Blue/Slate color palette.
