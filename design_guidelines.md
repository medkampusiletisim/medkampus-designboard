# MedKampüs Payment & Accrual Tracking System - Design Guidelines

## Design Approach

**Selected System**: Material Design with administrative dashboard principles  
**Justification**: Information-dense financial tracking system requiring clear data hierarchy, consistent patterns, and professional credibility. Material Design provides robust table components, form patterns, and data visualization suited for financial applications.

**Core Principles**:
- Data clarity over decoration
- Scannable financial information
- Trustworthy, professional aesthetic
- Efficient workflow patterns

## Typography

**Font Family**: Inter (via Google Fonts CDN)

**Hierarchy**:
- Dashboard Headers: 32px, Semi-bold (600)
- Section Titles: 24px, Semi-bold (600)
- Data Table Headers: 14px, Medium (500), Uppercase, Letter-spacing 0.5px
- Financial Figures (Large): 28px, Semi-bold (600) - for total amounts
- Financial Figures (Standard): 16px, Medium (500)
- Body Text/Labels: 14px, Regular (400)
- Helper Text: 12px, Regular (400)

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-8
- Section spacing: mb-8 to mb-12
- Card spacing: p-6
- Table cell padding: px-4 py-3

**Grid Structure**:
- Dashboard metrics: 4-column grid (grid-cols-4) on desktop, 2-column (grid-cols-2) on tablet, single column on mobile
- Content width: max-w-7xl container
- Sidebar width: w-64 fixed navigation

## Component Library

### Navigation
**Admin Sidebar Navigation**:
- Fixed left sidebar (w-64)
- Logo at top (h-16 with p-4)
- Navigation items with icon + label (py-3 px-4)
- Active state with subtle background highlight
- Sections: Dashboard, Students, Coaches, Payments, Settings

### Dashboard Components

**Metric Cards** (4-column grid):
- Elevated card style with subtle shadow
- Large number display (28px) for primary metric
- Label below (12px helper text)
- Optional trend indicator (icon + percentage)
- Minimum height: h-32

**Data Tables**:
- Full-width with horizontal scroll on mobile
- Striped rows for readability (odd row subtle background)
- Sticky header row
- Right-aligned numeric columns
- Action column (icons only) on far right
- Row hover state for interactivity

**Payment Breakdown Table** (Critical Component):
- Expandable rows: Parent row shows coach name + total
- Nested table reveals student-level breakdown when expanded
- Indented child rows with lighter background
- Clear visual hierarchy: Bold totals, regular student entries
- Three-tier structure: Coach Name | Student Count | Total Amount (TL)

### Forms

**Student/Coach Entry Forms**:
- Single column layout (max-w-2xl)
- Label above input pattern
- Input field height: h-12
- Dropdown selectors for Coach assignment and Package duration (1-6 months)
- Date picker for start dates
- Auto-calculated fields displayed in read-only style with subtle background
- Form actions at bottom right: Cancel (ghost) + Save (primary)

**Settings Panel**:
- Two-column grid for settings pairs
- Input with unit label inline (TL, Date)
- Help text below inputs explaining impact
- "Save Changes" button at bottom

### Alerts & Notifications

**Package Renewal Alerts**:
- Two distinct alert boxes on dashboard
- "Upcoming Renewals" (warning style - amber accent)
- "Expired Packages" (error style - red accent)
- List format with student name, coach, days remaining/overdue
- Clickable to go directly to student record

**Status Badges**:
- Pill-shaped badges for package status
- "Active" (green), "Expiring Soon" (amber), "Expired" (red)
- Displayed in student tables and detail views

### Coach Panel (Simplified)

**Active Students Widget**:
- Card-based list view
- Each card shows: Student name, Package end date, Status badge
- Sorted by nearest expiration date first

**Payment History Table**:
- Chronological list (most recent first)
- Columns: Month/Year | Total Amount | View Details link
- Details expand to show student breakdown

## Layout Patterns

**Admin Dashboard Layout**:
- Top app bar with breadcrumb/page title (h-16)
- Left sidebar navigation (w-64)
- Main content area (ml-64 padding)
- Metric cards in 4-column grid at top
- Alert boxes in 2-column grid below metrics
- Main content tables/lists below

**Detail/Edit Pages**:
- Centered form container (max-w-2xl)
- Breadcrumb navigation above
- Action buttons sticky to bottom or top-right

**Report Generation View** (Payment Day):
- Full-width table as primary focus
- Filter controls at top (date range selector)
- Export/Print actions in top-right
- Summary totals in sticky footer row

## Responsive Behavior

- Desktop (lg+): Full sidebar, 4-column metrics, multi-column tables
- Tablet (md): Collapsible sidebar, 2-column metrics, scrollable tables
- Mobile (base): Bottom navigation, single-column metrics, stacked cards instead of tables

## Images

No hero images needed. This is a data-centric admin interface. Use icons throughout:
- **Icon Library**: Material Icons (via CDN)
- Dashboard metric icons (people, payments, calendar, trending)
- Navigation icons for each section
- Action icons in tables (edit, delete, expand, view)
- Status icons in alerts (warning triangle, error circle)