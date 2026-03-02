import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AlertsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-[#6B7280]">🔔 Alerts — Coming Day 5</Text>
      </View>
    </SafeAreaView>
  );
}
