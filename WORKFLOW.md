# Workflow Diagram: ConstructOS

## 1. User Onboarding Flow
**Goal:** A new construction company joins the platform and gets their workspace set up.
1.  **Super Admin** logs in to the **Platform Dashboard**.
2.  **Super Admin** navigates to `Companies` -> clicks `Add` -> creates a new Company (`MyConstructionCo`).
3.  **Super Admin** creates the **Initial User** for `MyConstructionCo` and assigns the `Company Admin` role.
4.  **Company Admin** receives credentials -> Logs in -> Lands on **Company Dashboard**.
5.  **Company Admin** completes profile setup (`Settings`).

## 2. Project Creation & Execution Workflow
**Goal:** Company Admin sets up a new construction project and assigns a team.
1.  **Company Admin** creates a new **Project** (`Skyline Tower`) in the `Projects` module.
2.  **Company Admin** sets up the initial:
    *   **Schedule:** Defines timeline (`Schedule`).
    *   **Drawings:** Uploads plans (`Drawings`).
    *   **Estimates:** Adds initial budget (`Estimates`).
3.  **Company Admin** invites **Team Members** (Project Managers, Workers) via the `Team` tab.
4.  **Project Manager (PM)** logs in -> Sees `Skyline Tower` on their **Dashboard**.
5.  **PM** creates **Tasks** (`My Tasks`) and assigns them to specific workers.

## 3. Daily Operations Workflow (Field Work)
**Goal:** The crew executes the daily plan and reports progress.
1.  **Worker/PM** arrives on site -> Logs in to **Mobile App (Web)**.
2.  **Worker** taps **Clock In** on the `Home` dashboard -> Time starts tracking.
3.  **Worker** checks **My Tasks** for the day's assignments.
4.  **Worker** completes a task (e.g., "Pour Concrete Lvl 3") -> Marks as **Done**.
5.  **Worker** takes photos of the completed work -> Uploads via **Photo Upload**.
6.  **Worker** taps **Clock Out** at the end of the shift -> Session saved to **History**.
7.  **PM** reviews the **Photos** and **Tasks** completion.
8.  **PM** uses **Team Chat** to report any blockers or update the company admin.

## 4. Client Communication & Approval Workflow
**Goal:** The client approves a milestone payment or change order.
1.  **Company Admin/PM** updates the **Client Portal** settings for the project.
2.  **PM** uploads new progress photos to the **Client Photos** section.
3.  **PM** creates an **Invoice** or **Change Order** -> Sends to Client for approval.
4.  **Client** logs in to **Client Portal**.
5.  **Client** views the **Overview** dashboard to see project health.
6.  **Client** reviews the **Timeline** and **Photos**.
7.  **Client** navigates to **Approvals** -> Reviews the document -> Clicks **Approve**.
8.  **Client** navigates to **Invoices** -> Pays the outstanding invoice.
9.  **Company Admin** receives notification of approval/payment.

## 5. Issue Resolution Workflow
**Goal:** Identifying and fixing a construction defect.
1.  **Worker/PM** notices a defect on site (e.g., cracked tile).
2.  **Worker** navigates to **Issues** (if available) or reports via **Chat**.
3.  **PM** logs a formal **Issue** in the `Issues` module with photos and description.
4.  **Company Admin** assigns the issue to a **Subcontractor** or **Team Member**.
5.  **Assignee** fixes the issue -> Updates status to **Resolved** -> Uploads proof photo.
6.  **PM** verifies the fix -> Closes the **Issue**.
