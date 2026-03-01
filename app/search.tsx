import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { View, Text } from 'uniwind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nwfafhsbcwwhapbrwjys.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFmaHNiY3d3aGFwYnJ3anlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzE1NjgsImV4cCI6MjA4NzkwNzU2OH0.J7vBylNTrFb1ycQtXoI8s4sLqtpd3MHbp3XQFlyvDu8';
const EDGE_FUNCTION_URL =
  'https://nwfafhsbcwwhapbrwjys.supabase.co/functions/v1/search-statutes';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface StatuteResult {
  id: string;
  section_num: string;
  section_title: string;
  section_text: string;
  title_number: string;
  title_name: string;
  chapter_num: string;
  chapter_name: string;
  similarity?: number;
}

const EXAMPLE_SEARCHES = [
  '3517.01 — Campaign finance',
  'landlord tenant obligations',
  'criminal assault',
  '2903.01 — Aggravated murder',
  'workers compensation',
];

async function searchViaEdgeFunction(query: string): Promise<StatuteResult[]> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query, state_code: 'OH', mode: 'auto' }),
  });

  if (!res.ok) throw new Error(`Edge function error: ${res.status}`);
  const json = await res.json();
  return json.results || [];
}

async function searchViaSupabase(query: string): Promise<StatuteResult[]> {
  // Fallback: direct full-text search
  const { data, error } = await supabase
    .from('statutes')
    .select(
      'id, section_num, section_title, section_text, title_number, title_name, chapter_num, chapter_name'
    )
    .eq('state_code', 'OH')
    .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
    .limit(20);

  if (error) throw error;
  return (data || []) as StatuteResult[];
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StatuteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      let data: StatuteResult[];
      try {
        data = await searchViaEdgeFunction(trimmed);
      } catch {
        // Edge function not deployed yet — fall back to direct Supabase query
        data = await searchViaSupabase(trimmed);
      }
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, performSearch]);

  const handleExamplePress = (example: string) => {
    // Strip everything after the dash for search
    const q = example.split('—')[0].trim();
    setQuery(q);
  };

  const renderResult = ({ item }: { item: StatuteResult }) => (
    <TouchableOpacity
      onPress={() => {
        Keyboard.dismiss();
        router.push(`/statute/${item.id}`);
      }}
      activeOpacity={0.7}
    >
      <View className="bg-white mx-4 mb-3 rounded-xl p-4 border border-[#E5E7EB]">
        <Text className="text-xs font-semibold text-[#2A5298] mb-1">
          ORC § {item.section_num}
        </Text>
        <Text className="text-base font-semibold text-[#1A1A2E] mb-1" numberOfLines={2}>
          {item.section_title || 'Untitled'}
        </Text>
        <Text className="text-sm text-[#6B7280]" numberOfLines={3}>
          {item.section_text?.slice(0, 120)}
          {(item.section_text?.length || 0) > 120 ? '…' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-[#1B3A6B] mb-3">Search ORC</Text>

        {/* Search Input */}
        <View className="flex-row items-center bg-white rounded-xl border border-[#E5E7EB] px-3">
          <Text className="text-[#6B7280] mr-2 text-lg">🔍</Text>
          <TextInput
            className="flex-1 py-3 text-base text-[#1A1A2E]"
            placeholder="Search statutes or enter section number…"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => performSearch(query)}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="mt-3 text-sm text-[#6B7280]">Searching…</Text>
        </View>
      ) : !hasSearched ? (
        /* Empty state with example searches */
        <View className="flex-1 px-4 pt-4">
          <Text className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">
            Example searches
          </Text>
          {EXAMPLE_SEARCHES.map((example) => (
            <TouchableOpacity
              key={example}
              onPress={() => handleExamplePress(example)}
              activeOpacity={0.7}
            >
              <View className="bg-white rounded-xl px-4 py-3 mb-2 border border-[#E5E7EB] flex-row items-center">
                <Text className="text-[#2A5298] mr-2">→</Text>
                <Text className="text-sm text-[#374151]">{example}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text className="text-xs text-[#9CA3AF] mt-4 text-center">
            Search by keyword, topic, or ORC section number
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-lg font-semibold text-[#1A1A2E] mb-2 text-center">
            No results found
          </Text>
          <Text className="text-sm text-[#6B7280] text-center">
            Try different keywords or a section number like "3517.01"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text className="text-xs text-[#6B7280] px-4 pb-2">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
