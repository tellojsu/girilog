import { BaseService } from './base';
import { Invoice, InvoiceStatusEnum } from '@/types/girilog';
import { supabase } from '@/lib/supabase';
import { settingsService } from './SettingsService';

export class InvoiceService extends BaseService<Invoice> {
  protected tableName = 'girilog_invoices';

  async getDraftInvoiceForClient(clientId: number) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('status', InvoiceStatusEnum.Draft)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as Invoice | null;
  }

  async getInvoiceCountForClient(clientId: number) {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (error) throw error;
    return count || 0;
  }

  async updateTotals(invoiceId: number, subtotal: number, taxAmount: number, total: number) {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from(this.tableName)
      .update({
        subtotal,
        tax_amount: taxAmount,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getAllInvoices() {
    return this.getAll('created_at', false);
  }

  async getInvoicesByClient(clientId: number) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Invoice[];
  }

  async getRecentInvoices(limit: number = 5) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Invoice[];
  }

  async getYearlyInvoices(year: number) {
    const userId = await this.getUserId();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .gte('issue_date', start)
      .lte('issue_date', end);

    if (error) throw error;
    return data as Invoice[];
  }

  async checkShortCodeUsage(shortCode: string, excludeClientId?: number) {
    const userId = await this.getUserId();
    const sData = await settingsService.getSettings();
    const prefix = sData?.invoice_prefix || 'INV-';
    const searchPattern = `${prefix}${shortCode}-%`;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('client_id')
      .eq('user_id', userId)
      .like('invoice_number', searchPattern)
      .neq('client_id', excludeClientId || -1)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  }
}

export const invoiceService = new InvoiceService();
