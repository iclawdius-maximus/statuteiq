import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { addBookmark, removeBookmark, isBookmarked } from '../../lib/bookmarks';
import { addAlert, removeAlert, isAlerted } from '../../lib/alerts';
import { checkUnlocked } from '../../lib/purchases';
import PaywallModal from '../../components/PaywallModal';
import CitationModal from '../../components/CitationModal';
import ClientLetterModal from '../../components/ClientLetterModal';

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
  const insets = useSafeAreaInsets();

  const [statute, setStatute] = useState<Statute | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCitation, setShowCitation] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

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
          // Check bookmark + alert state
          const bm = await isBookmarked(id);
          setBookmarked(bm);
          const al = await isAlerted(id);
          setAlerted(al);
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

  const handleAlert = async () => {
    if (!id || alertLoading) return;
    setAlertLoading(true);
    try {
      if (alerted) {
        await removeAlert(id);
        setAlerted(false);
        showToast('Alert removed');
      } else {
        await addAlert(id);
        setAlerted(true);
        Alert.alert('Alert set!', "You'll be notified if this statute changes.");
      }
    } finally {
      setAlertLoading(false);
    }
  };

  const handleCitation = () => {
    if (!statute) return;
    setShowCitation(true);
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
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
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

      <CitationModal
        visible={showCitation}
        onClose={() => setShowCitation(false)}
        statute={statute ? { title: statute.section_title || statute.title_name, section: statute.section_num, text: statute.section_text } : null}
      />

      <ClientLetterModal
        visible={showLetter}
        onClose={() => setShowLetter(false)}
        statute={statute ? { title: statute.section_title || statute.title_name, section: statute.section_num, text: statute.section_text } : null}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
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
            {alerted ? (
              <View className="bg-white/20 rounded-full px-3 py-1">
                <Text className="text-white text-xs">🔔 Alert On</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Statute text */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
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

      {/* Bottom action bar — always pinned, clears home indicator */}
      <View style={{
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <TouchableOpacity
            onPress={handleCitation}
            style={{ alignItems: 'center', paddingHorizontal: 16 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 2 }}>{'📋'}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Citation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBookmark}
            disabled={bookmarkLoading}
            style={{ alignItems: 'center', paddingHorizontal: 16 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 2 }}>{bookmarked ? '🔖' : '📌'}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{bookmarked ? 'Saved' : 'Bookmark'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAlert}
            disabled={alertLoading}
            style={{ alignItems: 'center', paddingHorizontal: 16 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 2 }}>{alerted ? '🔔' : '🔕'}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{alerted ? 'Alert On' : 'Alert'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => statute && setShowLetter(true)}
            style={{ alignItems: 'center', paddingHorizontal: 16 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 2 }}>{'✉️'}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Letter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
