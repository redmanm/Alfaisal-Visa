# Visa Voyage Desk

Please build a modern, secure internal web application to replace an operational Google Sheet used for tracking client records, visa status, embassy details, and payment statuses.

Here are the core requirements and specifications for the application:

1. Dashboard & Data Grid (Main View)

- A clean, high-density data table displaying records with sorting, column filtering, and global search.

- Color-coded badges for status fields to make it easy to scan at a glance.

2. Data Fields to Track per Record:

- Serial Number / ID

- Full Name (Arabic / English)

- Phone Number / Contact Information

- ID / Passport Number

- Payment State (with options like: PAID, FIT, Pending, etc.)

- Visa Type / Status (e.g., VISA STAMP, WKALA, EMBASSY, TRIB)

- Financial Amount / Currencies

- Dates (Transaction dates, processing dates)

- Assigned Notes / Remarks column

3. User Roles & Permissions (RBAC)

- Admin Role: Full access to add, edit, delete records, and update sensitive statuses like "PAID".

- Staff Role: Can view records and add new entries, but cannot delete or modify locked financial states without admin approval.

4. Form Inputs & Validation

- Clean modal or inline forms to "Add New Record" and "Edit Record" with input validation (e.g., ensuring ID numbers and dates are formatted properly).

5. Additional Features

- Audit Trail: Log who created or updated a record and when.

- Export Capability: A button to export the current filtered view to CSV/Excel or PDF reports.

Please generate the complete codebase, including a responsive frontend UI (with a professional table layout and clean forms) and a backend database schema that supports these fields securely.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/717abf19-c52b-417a-b4f6-d52f667345a1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
