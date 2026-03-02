import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { getUserAlerts, removeAlert, type Alert } from '../lib/alerts';

export default function AlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getUserAlerts();
    setAlerts(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRemove = useCallback(async (statuteId: string) => {
    await removeAlert(statuteId);
    setAlerts((prev) => prev.filter((a) => a.statute_id !== statuteId));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <Stack.Screen options={{ title: 'My Alerts' }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="text-[#6B7280] text-sm mt-3">Loading alerts…</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={alerts.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1B3A6B"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-5xl mb-4">🔔</Text>
              <Text className="text-[#1A1A2E] text-base font-semibold mb-2 text-center">
                No alerts yet
              </Text>
              <Text className="text-[#6B7280] text-sm text-center leading-5">
                Tap 🔔 on any statute to get notified of changes
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/browse')}
                className="mt-6 bg-[#1B3A6B] px-6 py-3 rounded-xl"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-sm">Browse ORC</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            alerts.length > 0 ? (
              <Text className="text-[#9CA3AF] text-xs text-center mt-4 px-4 leading-4">
                Alerts notify you when Ohio law changes. Check back regularly.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/statute/${item.statute_id}`)}
              activeOpacity={0.75}
              className="bg-white rounded-xl px-4 py-4 border border-[#E5E7EB] flex-row items-center"
            >
              <Text className="text-2xl mr-3">🔔</Text>
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-[#1B3A6B] mb-0.5">
                  § {item.statutes?.section_num ?? '—'}
                </Text>
                {item.statutes?.section_title ? (
                  <Text className="text-[14px] text-[#1A1A2E]" numberOfLines={2}>
                    {item.statutes.section_title}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(item.statute_id)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="ml-2 p-1"
                activeOpacity={0.6}
              >
                <Text className="text-[#EF4444] text-base">✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
