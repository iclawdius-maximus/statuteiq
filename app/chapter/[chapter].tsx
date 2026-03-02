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

interface SectionRow {
  id: string;
  section_num: string;
  section_title: string;
}

export default function ChapterScreen() {
  const { chapter } = useLocalSearchParams<{ chapter: string }>();
  const router = useRouter();
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chapter) return;
    (async () => {
      const { data } = await supabase
        .from('statutes')
        .select('id, section_num, section_title')
        .eq('state_code', 'OH')
        .eq('chapter_num', chapter)
        .order('section_num');

      setSections((data as SectionRow[]) ?? []);
      setLoading(false);
    })();
  }, [chapter]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <Stack.Screen options={{ title: `Chapter ${chapter}` }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="text-[#6B7280] text-sm mt-3">Loading sections…</Text>
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">📄</Text>
          <Text className="text-[#6B7280] text-sm text-center">No sections found for this chapter.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/statute/${item.id}`)}
              activeOpacity={0.75}
              className="bg-white rounded-xl px-4 py-4 border border-[#E5E7EB] flex-row items-center"
            >
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-[#1B3A6B] mb-0.5">
                  § {item.section_num}
                </Text>
                {item.section_title ? (
                  <Text className="text-[14px] text-[#1A1A2E]" numberOfLines={2}>
                    {item.section_title}
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
