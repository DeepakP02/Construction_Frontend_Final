# Architecture & Data Flow - ConstructOS

## 1. Technical Stack
*   **Frontend**: React (Vite)
*   **Routing**: React Router DOM (v6)
*   **Styling**: Tailwind CSS (Utility-first CSS)
*   **Icons**: Lucide React
*   **Charts**: Recharts
*   **State Management**: React Context API (`AuthContext` for user session) + Local Component State
*   **Data Persistence**: `localStorage` (for MVPs, mocks, and session/history data)

## 2. Directory Structure

```
/src
  /assets          # Static assets (images, fonts)
  /components      # Shared UI components (Modal, Button, Card, etc.)
  /context         # Global state providers (Auth, Theme)
  /layouts         # Layout wrappers for different roles
    - SuperAdminLayout.jsx
    - CompanyAdminLayout.jsx
    - ProjectTeamLayout.jsx
    - ClientPortalLayout.jsx
  /pages           # Page components grouped by role
    /auth          # Login, Register, Forgot Password
    /super-admin   # Pages for Platform Owner
    /company-admin # Pages for Construction Companies
    /project-team  # Pages for Field Workers/PMs
    /client-portal # Pages for Clients
  App.jsx          # Main application entry point with Router configuration
  main.jsx         # React DOM rendering root
```

## 3. Routing & Access Control
The application uses a centralized routing strategy defined in `App.jsx`. Routes are protected by a `ProtectedRoute` component that checks the user's role before rendering the page.

### Route Map

#### Public Routes
*   `/login` - Authentication page
*   `/` - Redirects to `/login` if not authenticated

#### Super Admin Routes (`/super-admin`)
*   **Layout**: `SuperAdminLayout`
*   **Role Required**: `super_admin`
*   **Pages**:
    *   `/` -> Dashboard
    *   `/companies` -> Company Management (CRUD)
    *   `/subscriptions` -> Plan Management
    *   `/revenue` -> Financial Charts
    *   `/tickets` -> Customer Support
    *   `/settings` -> Global Config

#### Company Admin Routes (`/company-admin`)
*   **Layout**: `CompanyAdminLayout`
*   **Role Required**: `company_admin`
*   **Pages**:
    *   `/` -> Dashboard
    *   `/projects` -> Project List (Create/Edit)
    *   `/projects/:id` -> Project Detail View
    *   `/schedule` -> Gantt Charts & Timelines
    *   `/photos` -> Site Photo Gallery
    *   `/drawings` -> Blueprint Manager
    *   `/issues` -> Defect Tracking
    *   `/estimates` -> Job Costing
    *   `/chat` -> Team Communication
    *   `/team` -> Employee Management
    *   `/settings` -> Company Config

#### Project Team Routes (`/project-team`)
*   **Layout**: `ProjectTeamLayout`
*   **Role Required**: `project_manager`, `foreman`, `worker`
*   **Pages**:
    *   `/` -> Home (Tasks, Clock In/Out)
    *   `/tasks` -> My Assignments
    *   `/upload` -> Quick Photo Upload
    *   `/chat` -> Project Chat
    *   `/profile` -> User Profile & History
    *   `/files` -> Documents (In Progress)

#### Client Portal Routes (`/client-portal`)
*   **Layout**: `ClientPortalLayout`
*   **Role Required**: `client`
*   **Pages**:
    *   `/` -> Overview (High-level Dashboard)
    *   `/timeline` -> Simple Project Timeline
    *   `/photos` -> Approved Progress Photos
    *   `/approvals` -> Sign-offs & Change Orders
    *   `/invoices` -> Billing & Payment History
    *   `/messages` -> PM Communication
    *   `/profile` -> Client Settings

## 4. Data Logic & flow

### Authentication Flow
1.  User enters credentials on `/login`.
2.  `AuthContext` verifies credentials (mock or API).
3.  On success, `user` object is stored in state/localStorage with a `role`.
4.  User is redirected to their role-specific dashboard (e.g., `role === 'super_admin'` -> `/super-admin`).

### Clock In/Out Logic (Project Team)
1.  **Clock In**: User clicks "Clock In" on `/project-team`.
    *   System captures `checkIn` timestamp.
    *   Saves to `localStorage` key `project_team_session`.
    *   Sets `clockedIn` state to `true`.
2.  **Clock Out**: User clicks "Clock Out".
    *   System captures `checkOut` timestamp.
    *   Calculates `duration` (CheckOut - CheckIn).
    *   Pushes session object `{ checkIn, checkOut, duration }` to `project_team_history` array in `localStorage`.
    *   Clears current session data.
    *   Sets `clockedIn` state to `false`.
3.  **Persistence**: `useEffect` on mount reads from `localStorage` to restore previous state (Start Time, Clocked Status) to handle page refreshes.

### Search & Filtering (General Pattern)
*   **State**: Local `searchTerm` state used in components (e.g., `Companies.jsx`).
*   **Logic**: `items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))`.
*   **Rendering**: Filtered list is rendered dynamically.

### State Persistence Strategy
*   **Critical Data**: User Session, Clock In status, and History are persisted in `localStorage`.
*   **Transient Data**: Form inputs, Modal visibility, and UI toggles are kept in React Component State (`useState`).
