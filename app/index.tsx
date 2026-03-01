import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>⚖️ StatuteIQ</Text>
          <Text style={styles.tagline}>Ohio Revised Code · AI-Powered</Text>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchPlaceholder}>🔍  Search statutes...</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/browse')}>
              <Text style={styles.actionIcon}>📚</Text>
              <Text style={styles.actionLabel}>Browse ORC</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/bookmarks')}>
              <Text style={styles.actionIcon}>🔖</Text>
              <Text style={styles.actionLabel}>Bookmarks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/alerts')}>
              <Text style={styles.actionIcon}>🔔</Text>
              <Text style={styles.actionLabel}>Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Features</Text>
          {[
            { icon: '📋', label: 'Citation Formatter', desc: 'One-tap Bluebook & Ohio court citations' },
            { icon: '✉️', label: 'Client Letter Generator', desc: 'AI-drafted plain-English explanations' },
            { icon: '🗺️', label: 'Cross-Jurisdiction Compare', desc: 'How Ohio compares to other states' },
            { icon: '🔔', label: 'Statute Change Alerts', desc: 'Know when bookmarked laws are amended' },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  logo: { fontSize: 32, fontWeight: '800', color: '#1B3A6B', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: { fontSize: 16, color: '#9CA3AF' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#1B3A6B', textAlign: 'center' },
  featureRow: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  featureIcon: { fontSize: 22, marginRight: 14, marginTop: 2 },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 15, fontWeight: '600', color: '#1B3A6B', marginBottom: 2 },
  featureDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
