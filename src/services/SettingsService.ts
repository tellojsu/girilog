import { BaseService } from './base';
import { Settings } from '@/types/girilog';
import { supabase } from '@/lib/supabase';

export class SettingsService extends BaseService<Settings> {
  protected tableName = 'girilog_settings';

  async getSettings() {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as Settings | null;
  }

  async updateAnnualGoal(goal: number) {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from(this.tableName)
      .update({ annual_revenue_goal: goal, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
  }
}

export const settingsService = new SettingsService();
