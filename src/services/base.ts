import { supabase } from '@/lib/supabase';

export abstract class BaseService<T> {
  protected abstract tableName: string;

  protected async getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
  }

  async getAll(orderField: string = 'created_at', ascending: boolean = false) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order(orderField, { ascending });

    if (error) throw error;
    return data as T[];
  }

  async getById(id: string | number) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as T | null;
  }

  async create(payload: Partial<T>) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  async update(id: string | number, payload: Partial<T>) {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  async delete(id: string | number) {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
}
