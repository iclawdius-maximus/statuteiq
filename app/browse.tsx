import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';

interface TitleRow {
  title_number: string;
  title_name: string;
}

export default function BrowseScreen() {
  const router = useRouter();
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('statutes')
        .select('title_number, title_name')
        .eq('state_code', 'OH')
        .order('title_number');

      if (data) {
        // Deduplicate by title_number
        const seen = new Set<string>();
        const unique: TitleRow[] = [];
        for (const row of data) {
          if (!seen.has(row.title_number)) {
            seen.add(row.title_number);
            unique.push({ title_number: row.title_number, title_name: row.title_name });
          }
        }
        setTitles(unique);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <Stack.Screen options={{ title: 'Browse ORC' }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="text-[#6B7280] text-sm mt-3">Loading titles…</Text>
        </View>
      ) : (
        <FlatList
          data={titles}
          keyExtractor={(item) => item.title_number}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/title/${item.title_number}`)}
              activeOpacity={0.75}
              className="bg-white rounded-xl px-4 py-4 border border-[#E5E7EB] flex-row items-center"
            >
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-[#1B3A6B] mb-0.5 uppercase tracking-wide">
                  Title {item.title_number}
                </Text>
                <Text className="text-[15px] text-[#1A1A2E] font-medium" numberOfLines={2}>
                  {item.title_name}
                </Text>
              </View>
              <Text className="text-[#9CA3AF] text-lg ml-2">›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
