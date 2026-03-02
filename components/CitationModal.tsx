import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateCitation } from '../services/ai';

interface Props {
  visible: boolean;
  onClose: () => void;
  statute: {
    title: string;
    section: string;
    text: string;
  } | null;
}

export default function CitationModal({ visible, onClose, statute }: Props) {
  const [loading, setLoading] = useState(false);
  const [citation, setCitation] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !statute) return;
    setCitation('');
    setNote('');
    setError('');
    setLoading(true);

    generateCitation(statute)
      .then((result) => {
        setCitation(result.citation);
        setNote(result.note);
      })
      .catch(() => setError('Failed to generate citation. Please try again.'))
      .finally(() => setLoading(false));
  }, [visible]);

  const handleCopy = () => {
    Alert.alert('Copy Citation', citation, [{ text: 'OK' }]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: '80%' }}>
          {/* Header */}
          <View className="bg-[#1B3A6B] px-5 pt-6 pb-5">
            <Text className="text-white text-xl font-bold">📋 AI Citation Generator</Text>
            <Text className="text-white/70 text-sm mt-1">Bluebook format · Powered by Ollama</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {loading && (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#1B3A6B" />
                <Text className="text-[#6B7280] text-sm mt-3">Generating citation…</Text>
              </View>
            )}

            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            {!loading && citation ? (
              <>
                {/* Citation box */}
                <View className="bg-[#F0F4FF] border border-[#C7D2FE] rounded-xl p-4 mb-4">
                  <Text className="text-xs text-[#6B7280] uppercase tracking-wider mb-2">
                    Bluebook Citation
                  </Text>
                  <Text className="text-[#1A1A2E] text-base font-medium leading-relaxed" selectable>
                    {citation}
                  </Text>
                </View>

                {/* Usage note */}
                {note ? (
                  <View className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 mb-6">
                    <Text className="text-xs text-[#92400E] uppercase tracking-wider mb-2">
                      Usage Note
                    </Text>
                    <Text className="text-[#78350F] text-sm leading-relaxed">{note}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleCopy}
                  className="bg-[#1B3A6B] rounded-xl py-3.5 items-center mb-3"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-semibold text-base">Copy Citation</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              onPress={onClose}
              className="border border-[#E5E7EB] rounded-xl py-3.5 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-[#6B7280] font-medium">Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
