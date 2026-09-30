'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Building,
  Briefcase,
  Search,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  UserCheck,
  FileCheck2,
  Landmark,
} from 'lucide-react';
import { PayrollLayoutTemplate } from '@/components/templates/payroll-layout-template';
import { Card } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { OrganizationService } from '@/features/organization/services/organization.service';
import type {
  CompanyRecord,
  DepartmentRecord,
  JobRoleRecord,
} from '@/features/organization/types/organization.types';
import { getAuthToken } from '@/lib/client/api-client';

export default function OrganizationPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'INTERNAL' | 'CLIENT'>(
    'ALL',
  );

  const fetchData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [compList, deptList, roleList] = await Promise.all([
        OrganizationService.listCompanies(),
        OrganizationService.listDepartments(),
        OrganizationService.listJobRoles(),
      ]);
      setCompanies(compList);
      setDepartments(deptList);
      setJobRoles(roleList);
    } catch (err: unknown) {
      console.warn('Failed to fetch organization data:', err);
      const msg = err instanceof Error ? err.message : 'Could not load organization data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      const name = (comp.name || '').toLowerCase();
      const code = (comp.code || '').toLowerCase();
      const legal = (comp.legalName || '').toLowerCase();
      const city = (comp.registeredCity || '').toLowerCase();
      const gstin = (comp.gstin || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        code.includes(query) ||
        legal.includes(query) ||
        city.includes(query) ||
        gstin.includes(query);

      const matchesType = selectedTypeFilter === 'ALL' || comp.type === selectedTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [companies, searchQuery, selectedTypeFilter]);

  const internalCount = companies.filter((c) => c.type === 'INTERNAL').length;
  const clientCount = companies.filter((c) => c.type === 'CLIENT').length;

  return (
    <PayrollLayoutTemplate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Header */}
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
                Organization & Companies
              </h1>
              <Badge variant="purple">{companies.length} Registered Entities</Badge>
            </div>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-1)',
              }}
            >
              Manage registered internal legal entities, branch operations, and client companies in
              the active workspace.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={fetchData}
            isLoading={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* 4 Summary Cards */}
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
                  Total Entities
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {companies.length}
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
              Active in current tenant workspace
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
                  Internal Companies
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {internalCount}
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
                color: 'hsl(var(--color-success))',
                marginTop: 'var(--space-2)',
                fontWeight: 500,
              }}
            >
              Operating payroll & workforce sponsor
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
                  Client Companies
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {clientCount}
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
                <Briefcase size={20} />
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-2)',
              }}
            >
              External client deployment accounts
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
                  Departments & Roles
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 800,
                    color: 'hsl(var(--text-primary))',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {departments.length} / {jobRoles.length}
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
                <FileCheck2 size={20} />
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'hsl(var(--text-muted))',
                marginTop: 'var(--space-2)',
              }}
            >
              Cost centers & designated job roles
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
                placeholder="Search companies by name, code, legal name, city, GSTIN..."
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

            <div style={{ minWidth: '180px' }}>
              <select
                aria-label="Filter by Entity Type"
                value={selectedTypeFilter}
                onChange={(e) =>
                  setSelectedTypeFilter(e.target.value as 'ALL' | 'INTERNAL' | 'CLIENT')
                }
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
                <option value="ALL">All Entity Types</option>
                <option value="INTERNAL">Internal Entities</option>
                <option value="CLIENT">Client Companies</option>
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

        {/* Companies Grid */}
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
            <div>Loading organization companies...</div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card
            style={{
              padding: 'var(--space-12)',
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
            }}
          >
            <Building2 size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.5 }} />
            <div
              style={{
                fontWeight: 600,
                fontSize: 'var(--font-size-base)',
                color: 'hsl(var(--text-primary))',
              }}
            >
              No companies found
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
              Try adjusting your search criteria or register a company in the HR dashboard.
            </div>
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
              gap: 'var(--space-5)',
            }}
          >
            {filteredCompanies.map((comp) => {
              const isClient = comp.type === 'CLIENT';

              return (
                <Card
                  key={comp.id}
                  style={{
                    padding: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    borderLeft: `4px solid ${isClient ? 'hsl(var(--color-info, 210 100% 50%))' : 'hsl(var(--color-brand-accent))'}`,
                  }}
                >
                  <div>
                    {/* Top Row: Title, Tag & Code */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                          <h3
                            style={{
                              fontSize: 'var(--font-size-lg)',
                              fontWeight: 700,
                              color: 'hsl(var(--text-primary))',
                            }}
                          >
                            {comp.name}
                          </h3>
                          <Badge variant={isClient ? 'info' : 'purple'}>
                            {isClient ? 'Client' : 'Internal Entity'}
                          </Badge>
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'hsl(var(--text-muted))',
                            marginTop: 'var(--space-1)',
                          }}
                        >
                          Code: <strong style={{ fontFamily: 'monospace' }}>{comp.code}</strong>
                          {comp.legalName && <span> • {comp.legalName}</span>}
                        </div>
                      </div>

                      <Badge variant={comp.status === 'ACTIVE' ? 'success' : 'default'}>
                        {comp.status}
                      </Badge>
                    </div>

                    {comp.description && (
                      <p
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'hsl(var(--text-secondary))',
                          marginTop: 'var(--space-3)',
                        }}
                      >
                        {comp.description}
                      </p>
                    )}

                    {/* Details Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 'var(--space-3)',
                        marginTop: 'var(--space-4)',
                        paddingTop: 'var(--space-3)',
                        borderTop: '1px solid hsl(var(--border-subtle))',
                        fontSize: 'var(--font-size-xs)',
                      }}
                    >
                      {/* Statutory Info */}
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'hsl(var(--text-muted))',
                            textTransform: 'uppercase',
                            marginBottom: 'var(--space-1)',
                          }}
                        >
                          Statutory & Tax
                        </div>
                        {comp.gstin && (
                          <div>
                            GSTIN: <strong>{comp.gstin}</strong>
                          </div>
                        )}
                        {comp.pan && (
                          <div>
                            PAN: <strong>{comp.pan}</strong>
                          </div>
                        )}
                        {comp.cin && <div>CIN: {comp.cin}</div>}
                        {!comp.gstin && !comp.pan && (
                          <div style={{ color: 'hsl(var(--text-muted))' }}>Not registered</div>
                        )}
                      </div>

                      {/* Banking Info */}
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'hsl(var(--text-muted))',
                            textTransform: 'uppercase',
                            marginBottom: 'var(--space-1)',
                          }}
                        >
                          Banking Channel
                        </div>
                        {comp.bankName ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 'var(--space-1)',
                            }}
                          >
                            <Landmark
                              size={14}
                              color="hsl(var(--color-brand-accent))"
                              style={{ flexShrink: 0, marginTop: '2px' }}
                            />
                            <div>
                              <div>{comp.bankName}</div>
                              <div style={{ color: 'hsl(var(--text-muted))' }}>
                                IFSC: {comp.bankIfscCode || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: 'hsl(var(--text-muted))' }}>
                            No Bank Account Added
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address & Location */}
                    {(comp.registeredAddress || comp.registeredCity) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--space-2)',
                          marginTop: 'var(--space-3)',
                          fontSize: 'var(--font-size-xs)',
                          color: 'hsl(var(--text-secondary))',
                        }}
                      >
                        <MapPin
                          size={14}
                          color="hsl(var(--text-muted))"
                          style={{ flexShrink: 0, marginTop: '2px' }}
                        />
                        <span>
                          {comp.registeredAddress || comp.address}
                          {comp.registeredCity && `, ${comp.registeredCity}`}
                          {comp.registeredState && `, ${comp.registeredState}`}
                          {comp.registeredPincode && ` - ${comp.registeredPincode}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Signatory / Contact Footer */}
                  <div
                    style={{
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid hsl(var(--border-subtle))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                      fontSize: 'var(--font-size-xs)',
                      color: 'hsl(var(--text-muted))',
                    }}
                  >
                    {comp.signatoryName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <UserCheck size={14} color="hsl(var(--color-success))" />
                        <span>
                          Signatory: <strong>{comp.signatoryName}</strong> (
                          {comp.signatoryDesignation || 'Director'})
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        marginLeft: 'auto',
                      }}
                    >
                      {comp.contactEmail && (
                        <a
                          href={`mailto:${comp.contactEmail}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'hsl(var(--color-brand-accent))',
                          }}
                        >
                          <Mail size={12} />
                          <span>Email</span>
                        </a>
                      )}
                      {comp.contactPhone && (
                        <a
                          href={`tel:${comp.contactPhone}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'hsl(var(--color-brand-accent))',
                          }}
                        >
                          <Phone size={12} />
                          <span>{comp.contactPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PayrollLayoutTemplate>
  );
}
