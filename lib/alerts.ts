import { getDeviceId } from './bookmarks';
import { supabase } from './supabase';

export interface Alert {
  id: string;
  statute_id: string;
  created_at: string;
  statutes: {
    id: string;
    section_num: string;
    section_title: string;
    title_number: string;
  };
}

export async function addAlert(statuteId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await supabase.from('alerts').insert({
    device_id: deviceId,
    statute_id: statuteId,
  });
}

export async function removeAlert(statuteId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await supabase
    .from('alerts')
    .delete()
    .eq('device_id', deviceId)
    .eq('statute_id', statuteId);
}

export async function isAlerted(statuteId: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('device_id', deviceId)
    .eq('statute_id', statuteId)
    .maybeSingle();
  return !!data;
}

export async function getUserAlerts(): Promise<Alert[]> {
  const deviceId = await getDeviceId();
  const { data } = await supabase
    .from('alerts')
    .select('id, statute_id, created_at, statutes(id, section_num, section_title, title_number)')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });
  return (data as unknown as Alert[]) ?? [];
}
