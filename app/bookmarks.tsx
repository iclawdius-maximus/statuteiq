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
import { getUserBookmarks, type Bookmark } from '../lib/bookmarks';

export default function BookmarksScreen() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getUserBookmarks();
    setBookmarks(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <Stack.Screen options={{ title: 'My Bookmarks' }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="text-[#6B7280] text-sm mt-3">Loading bookmarks…</Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={bookmarks.length === 0 ? { flex: 1 } : { padding: 16 }}
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
              <Text className="text-5xl mb-4">🔖</Text>
              <Text className="text-[#1A1A2E] text-base font-semibold mb-2 text-center">
                No bookmarks yet
              </Text>
              <Text className="text-[#6B7280] text-sm text-center leading-5">
                Tap the bookmark icon on any statute to save it here.
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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/statute/${item.statute_id}`)}
              activeOpacity={0.75}
              className="bg-white rounded-xl px-4 py-4 border border-[#E5E7EB] flex-row items-center"
            >
              <Text className="text-2xl mr-3">🔖</Text>
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
              <Text className="text-[#9CA3AF] text-lg ml-2">›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
