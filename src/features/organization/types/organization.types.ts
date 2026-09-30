export interface CompanyRecord {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  type: 'INTERNAL' | 'CLIENT';
  legalName?: string | null;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  gstin?: string | null;
  pan?: string | null;
  tan?: string | null;
  cin?: string | null;
  epfRegistrationNo?: string | null;
  esicRegistrationNo?: string | null;
  registeredAddress?: string | null;
  registeredCity?: string | null;
  registeredState?: string | null;
  registeredPincode?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPincode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankBranch?: string | null;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  signatoryEmail?: string | null;
  signatoryPhone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRecord {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  description?: string | null;
  costCenterCode?: string | null;
  isCostCenter?: boolean;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobRoleRecord {
  id: string;
  workspaceId: string;
  departmentId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isSupervisorRole?: boolean;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
