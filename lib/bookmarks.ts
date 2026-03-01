import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DEVICE_ID_KEY = 'statuteiq_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function addBookmark(statuteId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await supabase.from('bookmarks').insert({
    device_id: deviceId,
    statute_id: statuteId,
  });
}

export async function removeBookmark(statuteId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await supabase
    .from('bookmarks')
    .delete()
    .eq('device_id', deviceId)
    .eq('statute_id', statuteId);
}

export async function isBookmarked(statuteId: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('device_id', deviceId)
    .eq('statute_id', statuteId)
    .maybeSingle();
  return !!data;
}

export interface Bookmark {
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

export async function getUserBookmarks(): Promise<Bookmark[]> {
  const deviceId = await getDeviceId();
  const { data } = await supabase
    .from('bookmarks')
    .select('id, statute_id, created_at, statutes(id, section_num, section_title, title_number)')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });
  return (data as unknown as Bookmark[]) ?? [];
}
