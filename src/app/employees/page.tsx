'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Building2,
  Briefcase,
  Search,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import { PayrollLayoutTemplate } from '@/components/templates/payroll-layout-template';
import { Card } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { EmployeeService } from '@/features/employees/services/employee.service';
import type { EnrichedEmployee } from '@/features/employees/types/employee.types';
import { getAuthToken } from '@/lib/client/api-client';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const fetchEmployees = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await EmployeeService.listEnrichedEmployees();
      setEmployees(data);
    } catch (err: unknown) {
      console.warn('Failed to fetch workforce employees:', err);
      const msg =
        err instanceof Error ? err.message : 'Could not fetch employees from backend database';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Unique companies in dataset for filter dropdown
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.companyName) set.add(emp.companyName);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const code = (emp.employeeCode || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const phone = (emp.phone || '').toLowerCase();
      const pan = (emp.panNumber || '').toLowerCase();
      const role = (emp.jobRoleName || '').toLowerCase();
      const company = (emp.companyName || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        code.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        pan.includes(query) ||
        role.includes(query) ||
        company.includes(query);

      const matchesCompany =
        selectedCompanyFilter === 'ALL' ||
        (selectedCompanyFilter === 'UNASSIGNED' && !emp.companyName) ||
        emp.companyName === selectedCompanyFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' || emp.employmentStatus === selectedStatusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [employees, searchQuery, selectedCompanyFilter, selectedStatusFilter]);

  // KPI Metrics
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.employmentStatus === 'ACTIVE').length;
  const clientAssignedCount = employees.filter((e) => e.companyType === 'CLIENT').length;
  const internalAssignedCount = employees.filter(
    (e) => e.companyType === 'INTERNAL' || (!e.companyType && e.activeAssignment),
  ).length;

  return (
    <PayrollLayoutTemplate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 800,
                  color: 'hsl(var(--text-primary))',
                }}
              >
                Workforce Directory & Current Postings
              </h1>
              <Badge variant="purple">{totalCount} Employees</Badge>
            </div>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-1)',
              }}
            >
              Live workforce registry with real-time company assignments, job roles, departments,
              and payroll statutory details.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button
              variant="outline"
              size="md"
              onClick={fetchEmployees}
              isLoading={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </Button>
            <Link href="/payroll/salary-structures">
              <Button
                variant="primary"
                size="md"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <span>Manage Salary Structures</span>
                <ArrowUpRight size={14} />
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                  }}
                >
                  Total Workforce
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {totalCount}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'hsl(var(--color-brand-accent-subtle))',
                  color: 'hsl(var(--color-brand-accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} />
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'hsl(var(--color-success))',
                marginTop: 'var(--space-2)',
                fontWeight: 500,
              }}
            >
              ● {activeCount} Active Status
            </div>
          </Card>

          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                  }}
                >
                  Client Deployments
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {clientAssignedCount}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'hsl(var(--color-info-subtle, 210 100% 96%))',
                  color: 'hsl(var(--color-info, 210 100% 50%))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={20} />
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-2)',
              }}
            >
              Assigned to external client sites
            </div>
          </Card>

          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                  }}
                >
                  Internal Operations
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {internalAssignedCount}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'hsl(var(--color-success-subtle, 142 76% 96%))',
                  color: 'hsl(var(--color-success, 142 76% 36%))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building size={20} />
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-2)',
              }}
            >
              Parent company & branch operations
            </div>
          </Card>

          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                  }}
                >
                  Statutory Ready
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {employees.filter((e) => e.panNumber && e.bankAccountNumber).length} /{' '}
                  {totalCount}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'hsl(var(--color-warning-subtle, 38 92% 95%))',
                  color: 'hsl(var(--color-warning, 38 92% 50%))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} />
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-2)',
              }}
            >
              Configured with PAN & Bank Accounts
            </div>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <Card style={{ padding: 'var(--space-4)' }}>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 320px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--text-muted))',
                }}
              />
              <input
                type="text"
                placeholder="Search by employee name, code, role, email, PAN, bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'hsl(var(--bg-secondary))',
                  color: 'hsl(var(--text-primary))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 'var(--radius-md)',
                }}
              />
            </div>

            {/* Company / Deployment Filter */}
            <div style={{ minWidth: '200px' }}>
              <select
                aria-label="Filter by Company Posting"
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'hsl(var(--bg-secondary))',
                  color: 'hsl(var(--text-primary))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <option value="ALL">All Company Postings</option>
                {companyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="UNASSIGNED">Unassigned Postings</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: '160px' }}>
              <select
                aria-label="Filter by Employment Status"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'hsl(var(--bg-secondary))',
                  color: 'hsl(var(--text-primary))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'hsl(var(--color-danger-bg))',
              border: '1px solid hsl(var(--color-danger) / 0.3)',
              color: 'hsl(var(--color-danger))',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {error}
          </div>
        )}

        {/* Employees Table Card */}
        <Card style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div
              style={{
                padding: 'var(--space-12)',
                textAlign: 'center',
                color: 'hsl(var(--text-muted))',
              }}
            >
              <RefreshCw
                size={28}
                className="animate-spin"
                style={{ margin: '0 auto var(--space-3)' }}
              />
              <div>Loading workforce directory from database...</div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-12)',
                textAlign: 'center',
                color: 'hsl(var(--text-muted))',
              }}
            >
              <Users size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.5 }} />
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 'var(--font-size-base)',
                  color: 'hsl(var(--text-primary))',
                }}
              >
                No employees found
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                {searchQuery || selectedCompanyFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                  ? 'Try adjusting your search or filter parameters.'
                  : 'No employees have been registered in this workspace yet.'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid hsl(var(--border-subtle))',
                      backgroundColor: 'hsl(var(--bg-secondary))',
                    }}
                  >
                    <th
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      Employee
                    </th>
                    <th
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      Current Posting & Assignment
                    </th>
                    <th
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      Department & Job Role
                    </th>
                    <th
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      Status & Type
                    </th>
                    <th
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      Bank & Statutory
                    </th>
                    <th
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                        textAlign: 'right',
                      }}
                    >
                      Payroll Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                    const initials =
                      `${emp.firstName.charAt(0)}${emp.lastName ? emp.lastName.charAt(0) : ''}`.toUpperCase();

                    return (
                      <tr
                        key={emp.id}
                        style={{
                          borderBottom: '1px solid hsl(var(--border-subtle))',
                          transition: 'background-color var(--transition-fast)',
                        }}
                      >
                        {/* Employee Column */}
                        <td style={{ padding: 'var(--space-4)' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                          >
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'hsl(var(--color-brand-accent-subtle))',
                                color: 'hsl(var(--color-brand-accent))',
                                fontWeight: 700,
                                fontSize: 'var(--font-size-xs)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                                {fullName}
                              </div>
                              <div
                                style={{
                                  fontSize: 'var(--font-size-xs)',
                                  color: 'hsl(var(--text-muted))',
                                  display: 'flex',
                                  gap: 'var(--space-2)',
                                }}
                              >
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {emp.employeeCode}
                                </span>
                                {emp.phone && <span>• {emp.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Posting & Assignment */}
                        <td style={{ padding: 'var(--space-4)' }}>
                          {emp.companyName ? (
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-2)',
                                }}
                              >
                                <Badge variant={emp.companyType === 'CLIENT' ? 'info' : 'purple'}>
                                  {emp.companyType === 'CLIENT' ? 'Client' : 'Internal'}
                                </Badge>
                                <span
                                  style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}
                                >
                                  {emp.companyName}
                                </span>
                              </div>
                              {emp.activeAssignment?.effectiveFrom && (
                                <div
                                  style={{
                                    fontSize: '0.6875rem',
                                    color: 'hsl(var(--text-muted))',
                                    marginTop: 'var(--space-1)',
                                  }}
                                >
                                  Posted since{' '}
                                  {new Date(emp.activeAssignment.effectiveFrom).toLocaleDateString(
                                    'en-IN',
                                    { day: 'numeric', month: 'short', year: 'numeric' },
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="warning">Pending Posting Assignment</Badge>
                          )}
                        </td>

                        {/* Department & Job Role */}
                        <td style={{ padding: 'var(--space-4)' }}>
                          {emp.jobRoleName || emp.departmentName ? (
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: 'hsl(var(--text-primary))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-1)',
                                }}
                              >
                                <Briefcase size={14} color="hsl(var(--color-brand-accent))" />
                                <span>{emp.jobRoleName || 'Unassigned Role'}</span>
                              </div>
                              {emp.departmentName && (
                                <div
                                  style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'hsl(var(--text-muted))',
                                    marginTop: 'var(--space-1)',
                                  }}
                                >
                                  {emp.departmentName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'hsl(var(--text-muted))',
                              }}
                            >
                              General Workforce
                            </span>
                          )}
                        </td>

                        {/* Status & Type */}
                        <td style={{ padding: 'var(--space-4)' }}>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-1)',
                              alignItems: 'flex-start',
                            }}
                          >
                            <Badge
                              variant={emp.employmentStatus === 'ACTIVE' ? 'success' : 'default'}
                            >
                              {emp.employmentStatus}
                            </Badge>
                            <span
                              style={{ fontSize: '0.6875rem', color: 'hsl(var(--text-muted))' }}
                            >
                              {emp.employmentType?.replace('_', ' ') || 'Full Time'}
                            </span>
                          </div>
                        </td>

                        {/* Bank & Statutory */}
                        <td style={{ padding: 'var(--space-4)' }}>
                          <div style={{ fontSize: 'var(--font-size-xs)' }}>
                            {emp.bankAccountNumber ? (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-1)',
                                  color: 'hsl(var(--text-primary))',
                                }}
                              >
                                <CreditCard size={12} color="hsl(var(--color-success))" />
                                <span>
                                  {emp.bankName || 'Bank'}: ••••{emp.bankAccountNumber.slice(-4)}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'hsl(var(--color-warning))' }}>
                                No Bank Linked
                              </span>
                            )}
                            <div
                              style={{
                                color: 'hsl(var(--text-muted))',
                                marginTop: '2px',
                                display: 'flex',
                                gap: 'var(--space-2)',
                              }}
                            >
                              {emp.panNumber && <span>PAN: {emp.panNumber}</span>}
                              {emp.uanNumber && <span>UAN: {emp.uanNumber}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Action Column */}
                        <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <Link href={`/payroll/salary-structures`}>
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ fontSize: 'var(--font-size-xs)' }}
                              >
                                Salary Structure
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PayrollLayoutTemplate>
  );
}
