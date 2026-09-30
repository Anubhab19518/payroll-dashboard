# 🚀 Payroll Module — Backend API Enhancement Requests

> **Purpose:** Document proposed server-side API additions and performance optimizations for the Payroll backend team to integrate.
> **Current Status:** The Payroll Frontend currently derives these metrics using client-side multi-page aggregation across live `/api/v1/payroll/runs/:id/items`, `/api/v1/payroll/runs`, and `/api/v1/hr/employees` endpoints. Adding these dedicated endpoints will improve dashboard loading speeds and server efficiency.

---

## 1. Dedicated Dashboard Summary Aggregator

- **Endpoint:** `GET /api/v1/payroll/dashboard/summary`
- **Query Parameters:** `year=2026&month=9`
- **Purpose:** Provide a single-call aggregated summary for the main Payroll Overview dashboard without requiring the frontend to fetch all individual employee line item pages.
- **Proposed Response Body:**

```json
{
  "success": true,
  "data": {
    "periodYear": 2026,
    "periodMonth": 9,
    "status": "CALCULATED",
    "metrics": {
      "totalPayrollCost": 2845320,
      "employeeNetPay": 2018450,
      "totalDeductions": 356870,
      "employerContributions": 469999,
      "totalEmployees": 324,
      "previousMonthDeltas": {
        "costPercentage": 6.2,
        "netPercentage": 5.8,
        "deductionsPercentage": 4.1
      }
    },
    "attendanceSummary": {
      "presentDays": 5872,
      "payableDays": 6800,
      "lopDays": 312,
      "overtimeHours": 1248,
      "attendancePercentage": 94.0
    },
    "costTrendLast6Months": [
      { "year": 2026, "month": 4, "totalCost": 2500000 },
      { "year": 2026, "month": 5, "totalCost": 2590660 },
      { "year": 2026, "month": 6, "totalCost": 2645300 },
      { "year": 2026, "month": 7, "totalCost": 2698770 },
      { "year": 2026, "month": 8, "totalCost": 2781450 },
      { "year": 2026, "month": 9, "totalCost": 2845320 }
    ]
  }
}
```

---

## 2. Global Pending Actions & Compliance Alerts

- **Endpoint:** `GET /api/v1/payroll/dashboard/pending-actions`
- **Purpose:** Consolidate actionable operational tasks across HR, Attendance, and Payroll into a single query.
- **Proposed Response Body:**

```json
{
  "success": true,
  "data": [
    {
      "id": "missing_salary_structures",
      "category": "EMPLOYEE",
      "title": "Employees with missing salary structure",
      "description": "Assign salary structure to process payroll",
      "count": 5,
      "severity": "HIGH",
      "actionRoute": "/payroll/salary-structures"
    },
    {
      "id": "attendance_exceptions",
      "category": "ATTENDANCE",
      "title": "Attendance corrections pending",
      "description": "Review and approve biometric attendance exceptions",
      "count": 3,
      "severity": "MEDIUM",
      "actionRoute": "/attendance"
    },
    {
      "id": "missing_bank_accounts",
      "category": "COMPLIANCE",
      "title": "Employees with missing bank details",
      "description": "Add bank account and IFSC details",
      "count": 7,
      "severity": "HIGH",
      "actionRoute": "/employees"
    },
    {
      "id": "payroll_approval_pending",
      "category": "PAYROLL",
      "title": "Payroll approval pending",
      "description": "September 2026 payroll requires sign-off",
      "count": 1,
      "severity": "HIGH",
      "actionRoute": "/payroll/runs/:runId"
    }
  ]
}
```

---

## 3. Pre-Aggregated Run Component Breakdown

- **Endpoint:** `GET /api/v1/payroll/runs/:id/component-summary`
- **Purpose:** Return total sum and % share for each salary component in the run batch without transferring all individual line item arrays over the wire.
- **Proposed Response Body:**

```json
{
  "success": true,
  "data": [
    {
      "code": "BASIC",
      "name": "Basic Salary",
      "category": "EARNING",
      "totalAmount": 1892400,
      "percentageOfCtc": 66.5
    },
    {
      "code": "HRA",
      "name": "House Rent Allowance",
      "category": "EARNING",
      "totalAmount": 302784,
      "percentageOfCtc": 10.6
    },
    {
      "code": "OVERTIME",
      "name": "Overtime Pay",
      "category": "EARNING",
      "totalAmount": 124800,
      "percentageOfCtc": 4.4
    },
    {
      "code": "CONVEYANCE",
      "name": "Conveyance Allowance",
      "category": "EARNING",
      "totalAmount": 102400,
      "percentageOfCtc": 3.6
    },
    {
      "code": "PF_EMPLOYEE",
      "name": "Provident Fund (Employee)",
      "category": "DEDUCTION",
      "totalAmount": 136320,
      "percentageOfCtc": 4.8
    },
    {
      "code": "PROFESSIONAL_TAX",
      "name": "Professional Tax",
      "category": "DEDUCTION",
      "totalAmount": 24300,
      "percentageOfCtc": 0.9
    }
  ]
}
```

---

## 4. Run Item Anomaly & Warning Flags

- **Field Addition:** Add `warnings?: string[]` to `PayrollRunItem` response in `GET /api/v1/payroll/runs/:id/items`.
- **Supported Flags:**
  - `ZERO_PAYABLE_DAYS`
  - `HIGH_LOP_EXCEEDING_THRESHOLD`
  - `UNUSUAL_OVERTIME_SPIKE`
  - `STATUTORY_CEILING_MISMATCH`
  - `MISSING_BANK_ACCOUNT`
