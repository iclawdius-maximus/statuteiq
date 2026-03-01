import { View, Text } from 'uniwind';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookmarksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-[#6B7280]">🔖 Bookmarks — Coming Day 3</Text>
      </View>
    </SafeAreaView>
  );
}
