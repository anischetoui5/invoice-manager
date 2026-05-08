export type UserRole = 'admin' | 'employee' | 'accountant' | 'director' | 'normal';

export type InvoiceStatus = 'pending' | 'processing' | 'validated' | 'rejected' | 'approved';

export type Workspace = {
  id: string;
  name: string;
  type: 'personal' | 'company';
  role: string;
  is_active?: boolean;
  companyName?: string;
}

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

export interface ChatConversation {
  id: string;
  type: 'channel' | 'direct';
  name?: string;
  created_at: string;
  last_read_at?: string;
  last_msg_content?: string;
  last_msg_at?: string;
  last_msg_sender_name?: string;
  dm_user_id?: string;
  dm_user_name?: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Subscription {
  id: string;
  enterpriseId: string;
  plan: PlanType;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  invoiceLimit: number;
  invoiceUsed: number;
  userLimit: number;
  userCount: number;
  price: number;
  features: string[];
}