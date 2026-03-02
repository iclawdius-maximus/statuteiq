import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface ChapterRow {
  chapter_num: string;
  chapter_name: string;
}

export default function TitleScreen() {
  const { titleNumber } = useLocalSearchParams<{ titleNumber: string }>();
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [titleName, setTitleName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!titleNumber) return;
    (async () => {
      const { data } = await supabase
        .from('statutes')
        .select('chapter_num, chapter_name, title_name')
        .eq('state_code', 'OH')
        .eq('title_number', titleNumber)
        .order('chapter_num');

      if (data && data.length > 0) {
        setTitleName(data[0].title_name);
        const seen = new Set<string>();
        const unique: ChapterRow[] = [];
        for (const row of data) {
          if (!seen.has(row.chapter_num)) {
            seen.add(row.chapter_num);
            unique.push({ chapter_num: row.chapter_num, chapter_name: row.chapter_name });
          }
        }
        setChapters(unique);
      }
      setLoading(false);
    })();
  }, [titleNumber]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <Stack.Screen options={{ title: `Title ${titleNumber}` }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="text-[#6B7280] text-sm mt-3">Loading chapters…</Text>
        </View>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.chapter_num}
          ListHeaderComponent={
            titleName ? (
              <View className="bg-[#1B3A6B] px-4 py-4 mb-4 rounded-xl">
                <Text className="text-white/70 text-xs uppercase tracking-widest mb-0.5">
                  Title {titleNumber}
                </Text>
                <Text className="text-white font-bold text-base" numberOfLines={2}>
                  {titleName}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/chapter/${item.chapter_num}`)}
              activeOpacity={0.75}
              className="bg-white rounded-xl px-4 py-4 border border-[#E5E7EB] flex-row items-center"
            >
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-[#1B3A6B] mb-0.5">
                  Chapter {item.chapter_num}
                </Text>
                {item.chapter_name ? (
                  <Text className="text-[14px] text-[#6B7280]" numberOfLines={1}>
                    {item.chapter_name}
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
