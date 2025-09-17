import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }

    return data?.value || null;
  } catch (error) {
    console.error(`Unexpected error fetching setting ${key}:`, error);
    return null;
  }
}

export async function isAutoRenewalEnabled(): Promise<boolean> {
  const value = await getAppSetting('ENABLE_AUTO_RENEWAL');
  return value === 'true';
}