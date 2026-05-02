export interface Client {
  id: number;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  short_code: string | null;
  tax_enabled: boolean;
  default_tax_rate: number;
  default_hourly_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id?: number;
  invoice_id?: number;
  user_id?: string;
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
  status: 'draft' | 'pending' | 'paid' | 'overdue';
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

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue';

export const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bg: 'bg-gray-500/10', dot: 'bg-gray-500' },
  pending: { label: 'Pending', color: '#F59E0B', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  paid: { label: 'Paid', color: '#10B981', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  overdue: { label: 'Overdue', color: '#EF4444', bg: 'bg-red-500/10', dot: 'bg-red-500' },
};
