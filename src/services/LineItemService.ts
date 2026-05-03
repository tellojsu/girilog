import { BaseService } from './base';
import { LineItem } from '@/types/girilog';
import { supabase } from '@/lib/supabase';

export class LineItemService extends BaseService<LineItem> {
  protected tableName = 'girilog_line_items';

  async getLineItemsByInvoice(invoiceId: number) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('invoice_id', invoiceId)
      .order('id');

    if (error) throw error;
    return data as LineItem[];
  }

  async deleteByInvoice(invoiceId: number) {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async createMany(items: Partial<LineItem>[]) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(items.map(item => ({ ...item, user_id: userId })))
      .select();

    if (error) throw error;
    return data as LineItem[];
  }
}

export const lineItemService = new LineItemService();
