import { BaseService } from './base';
import { Client } from '@/types/girilog';
import { supabase } from '@/lib/supabase';

export class ClientService extends BaseService<Client> {
  protected tableName = 'girilog_clients';

  async getClients() {
    return this.getAll('name', true);
  }

  async getClientById(id: number) {
    return this.getById(id);
  }

  async isShortCodeTaken(shortCode: string, excludeId?: number) {
    const userId = await this.getUserId();
    let query = supabase
      .from(this.tableName)
      .select('id, name')
      .eq('user_id', userId)
      .eq('short_code', shortCode);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }
}

export const clientService = new ClientService();
