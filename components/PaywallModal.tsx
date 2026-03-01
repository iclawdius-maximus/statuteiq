import { Modal, ActivityIndicator } from 'react-native';
import { View, Text, TouchableOpacity } from 'uniwind';
import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-white rounded-2xl w-full overflow-hidden">
          {/* Header */}
          <View className="bg-[#1B3A6B] px-6 pt-8 pb-7 items-center">
            <Text className="text-4xl mb-3">⚖️</Text>
            <Text className="text-white text-2xl font-bold text-center">Unlock Full Access</Text>
            <Text className="text-white/80 text-sm mt-1 text-center">
              One-time purchase. No subscription.
            </Text>
          </View>

          {/* Price badge */}
          <View className="items-center -mt-5">
            <View className="bg-[#E8B84B] rounded-full px-6 py-2 shadow-sm">
              <Text className="text-[#1B3A6B] text-xl font-extrabold">$9.99</Text>
            </View>
          </View>

          {/* Features */}
          <View className="px-6 pt-5 pb-4">
            {FEATURES.map((f) => (
              <View key={f.text} className="flex-row items-center mb-3">
                <Text className="text-xl mr-3">{f.icon}</Text>
                <Text className="text-[#1A1A2E] text-[15px] flex-1">{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View className="px-6 pb-6 gap-3">
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading}
              activeOpacity={0.85}
              className="bg-[#1B3A6B] rounded-xl py-4 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Unlock for $9.99</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              activeOpacity={0.7}
              className="border border-[#1B3A6B] rounded-xl py-3 items-center"
            >
              {restoring ? (
                <ActivityIndicator color="#1B3A6B" />
              ) : (
                <Text className="text-[#1B3A6B] font-semibold text-sm">Restore Purchase</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onDismiss} activeOpacity={0.6} className="items-center py-2">
              <Text className="text-[#9CA3AF] text-xs">Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
