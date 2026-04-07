export type UserRole = 'admin' | 'employee' | 'accountant' | 'director' | 'normal';

export type InvoiceStatus = 'pending' | 'processing' | 'validated' | 'rejected' | 'approved';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  enterpriseId?: string;
  enterpriseIds?: string[]; // For accountants who can work with multiple enterprises
  planType?: PlanType; // For normal users with personal accounts
}

export type PlanType = 'basic' | 'pro' | 'enterprise';

export interface Enterprise {
  id: string;
  name: string;
  directorId: string;
  createdDate: string;
  employeeIds: string[];
  accountantIds: string[];
  subscriptionId: string;
  companyCode: string; // Unique code for joining the enterprise
}

export interface Subscription {
  id: string;
  enterpriseId: string;
  plan: PlanType;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  invoiceLimit: number;
  invoiceUsed: number;
  userLimit: number;
  userCount: number;
  price: number;
  features: string[];
}