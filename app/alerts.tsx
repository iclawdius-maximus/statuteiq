import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><Text style={styles.text}>🔔 Alerts — Coming Day 5</Text></View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, color: '#6B7280' },
});
