# ConstructOS - System Architecture & Security Master Plan
**Version:** 1.2.0 (Menu & Security Locked)
**Status:** Backend Ready
**Objective:** Zero Data Breach & Strict Role Isolation

---

## 1. Secure Menu Structure (Frontend & Access Control)
This defines exactly **what** appears in the sidebar for each role. If a user tries to access a route not in their menu, the **Backend Guard** MUST 403 Forbidden them.

### A. Super Admin (Platform Owner)
*Access: Global (All Tenants)*
1.  **Dashboard** (Global Revenue, Total Tenants, System Health)
2.  **Companies/Tenants** (Create Company, Manage Subscription, Suspend Tenant)
3.  **Billing & Plans** (Stripe Config, Plan Tiers)
4.  **Global Settings** (Audit Logs, Admin Users)
5.  **Support Tickets** (Escalated issues from Companies)

### B. Company Admin (Tenant Owner)
*Access: Own Company Only (Strict `tenant_id` Scope)*
1.  **Dashboard** (Project Velocity, Financial Overview, Pending Approvals)
2.  **Projects** (Create/Edit Projects, Assign Teams)
3.  **Schedule** (Gantt Charts, Milestones)
4.  **Team** (Manage Workers, Foremen, Permissions)
5.  **Photos & Files** (**The Gatekeeper**: Review Uploads -> Approve for Implementation -> Publish to Client)
6.  **Financials** (Estimates, Invoices, Expenses)
7.  **Client Portal** (Configure what clients see, invite clients)
8.  **Issues/RFI** (Track site accidents, blocked tasks)
9.  **Settings** (Company Logo, Work Hours)

### C. Project Team (Field Worker / Foreman)
*Access: Assigned Projects Only*
1.  **My Tasks** (Today's Work, Checklists)
2.  **Schedule** (View Only - Upcoming Deadlines)
3.  **Capture** (Camera Interface for Photos/Videos -> **Goes to Admin for Review**)
4.  **Chat** (Internal Team Communication)
5.  **Issues** (Report an Issue)

### D. Client Portal (Homeowner)
*Access: Single Project Only (Strict `project_id` & `is_approved` Scope)*
1.  **Dashboard** (Velocity Widget, Timeline, Weather at Site)
2.  **Gallery** (View **ONLY Approved** Photos)
3.  **Documents** (View **ONLY Approved** Plans/Contracts)
4.  **Financials** (View Invoices, Pay Online)
5.  **Selections** (Approve Materials - e.g., "Choose Tile Color")

---

## 2. Data Visibility & Isolation Matrix (The "Firewall")

This matrix tells the Backend Developer exactly how to write the SQL/ORM queries to prevent data breaches.

| Data Asset | Super Admin | Company Admin | Project Team | Client | **Security Rule (Backend Filter)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Details** | ❌ No Access | ✅ Full Edit | ✅ Read Assigned | ✅ Read Own | `WHERE tenant_id = ? AND (user_id IN team OR user_id = client)` |
| **Financials** | ✅ Aggregated | ✅ Full Edit | ❌ Hidden | ✅ Own Invoices | `WHERE tenant_id = ? AND role IN ('admin', 'client')` |
| **Site Photos** | ❌ No Access | ✅ Approve/Delete | ✅ Upload Only | ✅ **Approved Only** | **Client:** `WHERE project_id = ? AND is_approved = TRUE` |
| **Internal Chat** | ❌ No Access | ✅ Full History | ✅ Project Only | ❌ Hidden | `WHERE project_id = ? AND is_internal = TRUE` |
| **Client Chat** | ❌ No Access | ✅ Full History | ❌ Hidden | ✅ Own Chat | `WHERE project_id = ? AND type = 'CLIENT_COMM'` |
| **User Data** | ✅ Manage All | ✅ Own Team | ❌ No Access | ❌ No Access | `WHERE tenant_id = ?` (Strict Tenant Isolation) |

---

## 3. Backend Architecture for Zero Data Breach

To ensure **"Ek Project ka data dusre me na jaye"** (Data never leaks), implement these 3 layers of security:

### Layer 1: Database Level (The Iron Dome)
**Technology:** PostgreSQL Row-Level Security (RLS)
Every table (`projects`, `tasks`, `invoices`, `users`) MUST have a `tenant_id` column.

```sql
-- Example RLS Policy for Projects Table
CREATE POLICY tenant_isolation_policy ON projects
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Logic: Even if the API code has a bug, the Database REFUSES to return data from another tenant.
```

### Layer 2: API Middleware (The Guard)
**Technology:** NestJS Guard / Express Middleware.
Before ANY controller code runs:
1.  Decode JWT.
2.  Extract `tenant_id`.
3.  Set Database Session Context.
4.  **Reject** request if `tenant_id` is missing.

```typescript
// Middleware Pseudo-code
async function TenantMiddleware(req, res, next) {
    const user = decodeToken(req.headers.authorization);
    if (!user.tenant_id) throw new UnauthorizedException();
    
    // Set the strict filter for this request
    db.setContext('tenant_id', user.tenant_id);
    next();
}
```

### Layer 3: The "Client Filter" (Gatekeeper Logic)
For the **Client Portal**, mere `tenant_id` is not enough. You must also check `is_approved`.

**The VITAL Rule for Client Endpoints:**
```typescript
// GET /client/photos
return db.photos.find({
    where: {
        project_id: user.project_id, // 1. Must match their project
        is_client_visible: true      // 2. MUST BE APPROVED (The "Lock")
        // If this flag is false, the photo DOES NOT EXIST for the client.
    }
});
```

---

## 4. Folder Structure (Code Organization)

Align your backend code to this structure to maintain this isolation:

```text
/src
  /modules
    /auth               # Login, JWT Minting
    /super-admin        # Platform Management (No Tenant Filter)
    /company            # The Core (Strict Tenant Filter)
      /projects
      /financials
      /gatekeeper       # LOGIC for Approving Photos/Docs
    /client-portal      # READ-ONLY Mostly (Strict Approved Filter)
  /common
    /guards             # RolesGuard, TenantGuard (The Security Check)
    /decorators         # @CurrentUser(), @TenantId()
```

---

## 5. Summary Checklist for Backend Developer
1.  [ ] **Table Design**: Does every single table have `tenant_id`?
2.  [ ] **RLS Setup**: Is Row-Level Security enabled in Postgres?
3.  [ ] **JWT**: Does the Token contain the `role` and `tenant_id`?
4.  [ ] **Client API**: Do all Client APIs hardcode `AND is_approved = true` in the query?
5.  [ ] **S3 Buckets**: Are files stored as `/tenant_id/project_id/...` so files never mix?

This architecture guarantees that **Tenant A** can NEVER see **Tenant B**, and **Client** can NEVER see **Unapproved Trash**.
