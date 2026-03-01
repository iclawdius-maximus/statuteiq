import { View, Text } from 'uniwind';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BrowseScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-[#6B7280]">📚 Browse ORC — Coming Day 2</Text>
      </View>
    </SafeAreaView>
  );
}
