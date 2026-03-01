import { useEffect, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { View, Text } from 'uniwind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { addBookmark, removeBookmark, isBookmarked } from '../../lib/bookmarks';
import { checkUnlocked } from '../../lib/purchases';
import PaywallModal from '../../components/PaywallModal';

const VIEWS_KEY = 'statuteiq_free_views';
const FREE_VIEW_LIMIT = 3;

interface Statute {
  id: string;
  state_code: string;
  title_number: string;
  title_name: string;
  chapter_num: string;
  chapter_name: string;
  section_num: string;
  section_title: string;
  section_text: string;
  last_updated: string | null;
}

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
}

function formatParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

async function incrementViewCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(VIEWS_KEY);
  const count = raw ? parseInt(raw, 10) : 0;
  const next = count + 1;
  await AsyncStorage.setItem(VIEWS_KEY, String(next));
  return next;
}

export default function StatuteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [statute, setStatute] = useState<Statute | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Check paywall
        const unlocked = await checkUnlocked();
        if (!unlocked) {
          const views = await incrementViewCount();
          if (views > FREE_VIEW_LIMIT) {
            setShowPaywall(true);
          }
        }

        // Load statute
        const { data, error } = await supabase
          .from('statutes')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setStatute(data as Statute);
          // Check bookmark state
          const bm = await isBookmarked(id);
          setBookmarked(bm);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBookmark = async () => {
    if (!id || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await removeBookmark(id);
        setBookmarked(false);
        showToast('Bookmark removed');
      } else {
        await addBookmark(id);
        setBookmarked(true);
        showToast('Bookmarked!');
      }
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleCitation = () => {
    if (!statute) return;
    const citation = `Ohio Rev. Code § ${statute.section_num}`;
    Share.share({ message: citation, title: 'ORC Citation' });
  };

  const handleUnlock = async () => {
    setShowPaywall(false);
    // Reset view count
    await AsyncStorage.setItem(VIEWS_KEY, '0');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F7FA]">
        <Stack.Screen options={{ title: 'Loading…' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text className="text-[#6B7280] text-sm mt-3">Loading statute…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !statute) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F7FA]">
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">{'⚠️'}</Text>
          <Text className="text-lg font-semibold text-[#1A1A2E] mb-2 text-center">
            Statute Not Found
          </Text>
          <Text className="text-sm text-[#6B7280] text-center mb-6">
            This section could not be found in the database.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-[#1B3A6B] px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const paragraphs = formatParagraphs(statute.section_text);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <Stack.Screen
        options={{
          title: `ORC § ${statute.section_num}`,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleBookmark}
              disabled={bookmarkLoading}
              style={{ marginRight: 4, padding: 8 }}
            >
              <Text style={{ fontSize: 20 }}>{bookmarked ? '🔖' : '🔖'}</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <PaywallModal
        visible={showPaywall}
        onUnlock={handleUnlock}
        onDismiss={() => setShowPaywall(false)}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section header */}
        <View className="bg-[#1B3A6B] px-5 pt-5 pb-6">
          <Text className="text-white text-3xl font-bold mb-1">
            § {statute.section_num}
          </Text>
          {statute.section_title ? (
            <Text className="text-white text-base font-medium opacity-90" numberOfLines={3}>
              {statute.section_title}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap mt-3 gap-2">
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white text-xs">Title {statute.title_number}</Text>
            </View>
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white text-xs">Chapter {statute.chapter_num}</Text>
            </View>
            {statute.last_updated ? (
              <View className="bg-white/20 rounded-full px-3 py-1">
                <Text className="text-white text-xs">Updated {statute.last_updated}</Text>
              </View>
            ) : null}
            {bookmarked ? (
              <View className="bg-white/20 rounded-full px-3 py-1">
                <Text className="text-white text-xs">🔖 Saved</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Statute text */}
        <View className="px-5 pt-5">
          {paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <Text
                key={i}
                className="text-[#1A1A2E] text-sm leading-relaxed mb-3"
                selectable
              >
                {para}
              </Text>
            ))
          ) : (
            <Text className="text-[#6B7280] text-sm italic">No text available.</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="border-t border-[#E5E7EB] bg-white px-4 py-3">
        <View className="flex-row justify-around">
          <TouchableOpacity
            onPress={handleCitation}
            className="items-center px-4"
            activeOpacity={0.7}
          >
            <Text className="text-xl mb-0.5">{'📋'}</Text>
            <Text className="text-xs text-[#6B7280]">Citation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBookmark}
            disabled={bookmarkLoading}
            className="items-center px-4"
            activeOpacity={0.7}
          >
            <Text className="text-xl mb-0.5">{bookmarked ? '🔖' : '📌'}</Text>
            <Text className="text-xs text-[#6B7280]">{bookmarked ? 'Saved' : 'Bookmark'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => showToast('Compare coming in Day 4')}
            className="items-center px-4"
            activeOpacity={0.7}
          >
            <Text className="text-xl mb-0.5">{'🗺️'}</Text>
            <Text className="text-xs text-[#6B7280]">Compare</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => showToast('Letter drafting coming in Day 4')}
            className="items-center px-4"
            activeOpacity={0.7}
          >
            <Text className="text-xl mb-0.5">{'✉️'}</Text>
            <Text className="text-xs text-[#6B7280]">Letter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
