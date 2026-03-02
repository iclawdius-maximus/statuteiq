import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { purchaseUnlock, restorePurchases } from '../lib/purchases';

interface PaywallModalProps {
  visible: boolean;
  onUnlock: () => void;
  onDismiss: () => void;
}

const FEATURES = [
  { icon: '📚', text: 'Full ORC access — all 8,301 statutes' },
  { icon: '🔖', text: 'Unlimited bookmarks' },
  { icon: '🤖', text: 'AI tools — citations, letters, comparisons' },
];

export default function PaywallModal({ visible, onUnlock, onDismiss }: PaywallModalProps) {
  const ref = useRef<BottomSheetModal>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (visible) {
        ref.current?.present();
      } else {
        ref.current?.dismiss();
      }
    }
  }, [visible]);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onDismiss();
    },
    [onDismiss]
  );

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchaseUnlock();
      if (success) onUnlock();
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) onUnlock();
    } finally {
      setRestoring(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const content = (
    <>
      {/* Header */}
      <View style={{ backgroundColor: '#1B3A6B', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28, alignItems: 'center' }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>⚖️</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Unlock Full Access</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
          One-time purchase. No subscription.
        </Text>
      </View>

      {/* Price badge */}
      <View style={{ alignItems: 'center', marginTop: -20 }}>
        <View style={{ backgroundColor: '#E8B84B', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 8 }}>
          <Text style={{ color: '#1B3A6B', fontSize: 20, fontWeight: '800' }}>$9.99</Text>
        </View>
      </View>

      {/* Features */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
        {FEATURES.map((f) => (
          <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>{f.icon}</Text>
            <Text style={{ color: '#1A1A2E', fontSize: 15, flex: 1 }}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}>
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.85}
          style={{ backgroundColor: '#1B3A6B', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Unlock for $9.99</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
          style={{ borderWidth: 1, borderColor: '#1B3A6B', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
        >
          {restoring ? (
            <ActivityIndicator color="#1B3A6B" />
          ) : (
            <Text style={{ color: '#1B3A6B', fontWeight: '600', fontSize: 14 }}>Restore Purchase</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onDismiss} activeOpacity={0.6} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
        <View style={styles.webOverlay}>
          <View style={styles.webCard}>
            {content}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['55%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleChange}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB' }}
    >
      <BottomSheetView>
        {content}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
});
