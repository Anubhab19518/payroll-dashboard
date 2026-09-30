export interface EmployeeRecord {
  id: string;
  workspaceId: string;
  userId?: string | null;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  dateOfJoining?: string | null;
  dateOfExit?: string | null;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'SUSPENDED';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERN';
  backgroundVerificationStatus?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  uanNumber?: string | null;
  pfNumber?: string | null;
  esicIpNumber?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountHolderName?: string | null;
  fatherOrSpouseName?: string | null;
  fatherOrSpouseRelation?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  currentAddress?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentPincode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAssignmentRecord {
  id: string;
  workspaceId: string;
  employeeId: string;
  companyId?: string | null;
  siteId?: string | null;
  departmentId?: string | null;
  jobRoleId?: string | null;
  supervisorId?: string | null;
  shiftId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedEmployee extends EmployeeRecord {
  activeAssignment?: EmployeeAssignmentRecord | null;
  companyName?: string;
  companyType?: 'INTERNAL' | 'CLIENT';
  departmentName?: string;
  jobRoleName?: string;
  siteName?: string;
}
