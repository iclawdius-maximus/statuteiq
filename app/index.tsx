import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <ScrollView contentContainerClassName="p-5 pb-10">
        <View className="items-center mb-6 pt-2">
          <Text className="text-[32px] font-extrabold text-[#1B3A6B] tracking-tight">⚖️ StatuteIQ</Text>
          <Text className="text-sm text-[#6B7280] mt-1">Ohio Revised Code · AI-Powered</Text>
        </View>

        <TouchableOpacity
          className="bg-white rounded-xl p-4 mb-6 border border-[#E5E7EB] shadow-sm"
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
        >
          <Text className="text-base text-[#9CA3AF]">🔍  Search statutes...</Text>
        </TouchableOpacity>

        <View className="mb-6">
          <Text className="text-[13px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Quick Actions</Text>
          <View className="flex-row gap-3 mb-3">
            <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center border border-[#E5E7EB] shadow-sm" onPress={() => router.push('/browse')}>
              <Text className="text-2xl mb-2">📚</Text>
              <Text className="text-xs font-semibold text-[#1B3A6B] text-center">Browse ORC</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center border border-[#E5E7EB] shadow-sm" onPress={() => router.push('/bookmarks')}>
              <Text className="text-2xl mb-2">🔖</Text>
              <Text className="text-xs font-semibold text-[#1B3A6B] text-center">My Bookmarks</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center border border-[#E5E7EB] shadow-sm" onPress={() => router.push('/alerts')}>
              <Text className="text-2xl mb-2">🔔</Text>
              <Text className="text-xs font-semibold text-[#1B3A6B] text-center">Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-[13px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">AI Features</Text>
          {[
            { icon: '📋', label: 'Citation Formatter', desc: 'One-tap Bluebook & Ohio court citations' },
            { icon: '✉️', label: 'Client Letter Generator', desc: 'AI-drafted plain-English explanations' },
            { icon: '🗺️', label: 'Cross-Jurisdiction Compare', desc: 'How Ohio compares to other states' },
            { icon: '🔔', label: 'Statute Change Alerts', desc: 'Know when bookmarked laws are amended' },
          ].map((f) => (
            <View key={f.label} className="flex-row items-start bg-white rounded-xl p-4 mb-2.5 border border-[#E5E7EB]">
              <Text className="text-[22px] mr-3.5 mt-0.5">{f.icon}</Text>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1B3A6B] mb-0.5">{f.label}</Text>
                <Text className="text-[13px] text-[#6B7280] leading-5">{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
