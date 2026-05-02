export interface Client {
  id: number;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  short_code: string | null;
  logo_url: string | null;
  tax_enabled: boolean;
  default_tax_rate: number;
  default_hourly_rate: number | null;
  show_date: boolean;
  show_project: boolean;
  projects: string[];
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id?: number;
  invoice_id?: number;
  user_id?: string;
  date: string;
  project: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: number;
  user_id: string;
  invoice_number: string;
  client_id: number | null;
  client_name: string | null;
  client_email: string | null;
  client_address: string | null;
  status: InvoiceStatusEnum;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  line_items?: LineItem[];
}

export interface Settings {
  id: number;
  user_id: string;
  business_name: string;
  business_email: string;
  business_address: string;
  business_phone: string;
  logo_url: string;
  invoice_prefix: string;
  default_tax_rate: number;
  currency: string;
  annual_revenue_goal: number;
  created_at: string;
  updated_at: string;
}

export enum InvoiceStatusEnum {
  Draft = 'draft',
  Sent = 'pending',
  Paid = 'paid',
  Overdue = 'overdue',
}

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue'; // Deprecated

export const STATUS_CONFIG: Record<InvoiceStatusEnum, { label: string; color: string; bg: string; dot: string }> = {
  [InvoiceStatusEnum.Draft]: { label: 'WIP', color: '#6B7280', bg: 'bg-gray-500/10', dot: 'bg-gray-500' },
  [InvoiceStatusEnum.Sent]: { label: 'Sent', color: '#F59E0B', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  [InvoiceStatusEnum.Paid]: { label: 'Paid', color: 'primary', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  [InvoiceStatusEnum.Overdue]: { label: 'Overdue', color: '#EF4444', bg: 'bg-red-500/10', dot: 'bg-red-500' },
};
