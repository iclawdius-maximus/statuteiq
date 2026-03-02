import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateClientLetter } from '../services/ai';

interface Props {
  visible: boolean;
  onClose: () => void;
  statute: {
    title: string;
    section: string;
    text: string;
  } | null;
}

type Step = 'form' | 'loading' | 'result';

export default function ClientLetterModal({ visible, onClose, statute }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [clientName, setClientName] = useState('');
  const [situation, setSituation] = useState('');
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setStep('form');
    setClientName('');
    setSituation('');
    setLetter('');
    setError('');
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleGenerate = async () => {
    if (!statute || !clientName.trim()) return;
    setError('');
    setStep('loading');

    try {
      const result = await generateClientLetter(statute, clientName.trim(), situation);
      setLetter(result);
      setStep('result');
    } catch {
      setError('Failed to generate letter. Please try again.');
      setStep('form');
    }
  };

  const handleCopy = () => {
    Alert.alert('Copy Letter', 'Letter text shown below — select and copy manually.', [
      { text: 'OK' },
    ]);
  };

  const handleShare = async () => {
    await Share.share({
      message: letter,
      title: `Client Letter — ORC § ${statute?.section ?? ''}`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: '90%' }}>
          {/* Header */}
          <View className="bg-[#1B3A6B] px-5 pt-6 pb-5">
            <Text className="text-white text-xl font-bold">✉️ Draft Client Letter</Text>
            <Text className="text-white/70 text-sm mt-1">
              Plain-English explanation · Powered by Ollama
            </Text>
          </View>

          {/* STEP: Form */}
          {step === 'form' && (
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-[#374151] text-sm font-medium mb-1">
                Client Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="e.g. Jane Smith"
                placeholderTextColor="#9CA3AF"
                className="border border-[#D1D5DB] rounded-xl px-4 py-3 text-[#1A1A2E] text-base mb-5 bg-[#F9FAFB]"
                autoCapitalize="words"
              />

              <Text className="text-[#374151] text-sm font-medium mb-1">
                Client Situation{' '}
                <Text className="text-[#9CA3AF] font-normal">(optional)</Text>
              </Text>
              <TextInput
                value={situation}
                onChangeText={setSituation}
                placeholder="e.g. My client is a landlord facing an eviction dispute…"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="border border-[#D1D5DB] rounded-xl px-4 py-3 text-[#1A1A2E] text-sm mb-5 bg-[#F9FAFB]"
                style={{ minHeight: 96 }}
              />

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <Text className="text-red-600 text-sm">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleGenerate}
                disabled={!clientName.trim()}
                className="rounded-xl py-3.5 items-center mb-3"
                style={{ backgroundColor: clientName.trim() ? '#1B3A6B' : '#9CA3AF' }}
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-base">Generate Letter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                className="border border-[#E5E7EB] rounded-xl py-3.5 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-[#6B7280] font-medium">Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STEP: Loading */}
          {step === 'loading' && (
            <View className="items-center py-16 px-6">
              <ActivityIndicator size="large" color="#1B3A6B" />
              <Text className="text-[#1A1A2E] text-base font-medium mt-4">Drafting letter…</Text>
              <Text className="text-[#6B7280] text-sm mt-1 text-center">
                Writing a plain-English explanation for {clientName}
              </Text>
            </View>
          )}

          {/* STEP: Result */}
          {step === 'result' && (
            <>
              <ScrollView
                contentContainerStyle={{ padding: 20 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              >
                <View className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-5">
                  <Text
                    className="text-[#1A1A2E] text-sm leading-relaxed"
                    selectable
                  >
                    {letter}
                  </Text>
                </View>
              </ScrollView>

              <View className="px-5 pb-6 pt-2 border-t border-[#E5E7EB] gap-3">
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleCopy}
                    className="flex-1 border border-[#1B3A6B] rounded-xl py-3.5 items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-[#1B3A6B] font-semibold text-sm">Copy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShare}
                    className="flex-1 bg-[#1B3A6B] rounded-xl py-3.5 items-center"
                    activeOpacity={0.85}
                  >
                    <Text className="text-white font-semibold text-sm">Share</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setStep('form')}
                  className="border border-[#E5E7EB] rounded-xl py-3 items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-[#6B7280] text-sm font-medium">← Back to Form</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
