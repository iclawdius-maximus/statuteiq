import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
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
  const ref = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<Step>('form');
  const [clientName, setClientName] = useState('');
  const [situation, setSituation] = useState('');
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (visible) {
        ref.current?.present();
      } else {
        ref.current?.dismiss();
      }
    }
  }, [visible]);

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

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
        reset();
      }
    },
    [onClose]
  );

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

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const header = (
    <View style={{ backgroundColor: '#1B3A6B', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>✉️ Draft Client Letter</Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
        Plain-English explanation · Powered by Groq
      </Text>
    </View>
  );

  const formStep = (
    <View style={{ padding: 20 }}>
      <Text style={{ color: '#374151', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>
        Client Name <Text style={{ color: '#EF4444' }}>*</Text>
      </Text>
      <TextInput
        value={clientName}
        onChangeText={setClientName}
        placeholder="e.g. Jane Smith"
        placeholderTextColor="#9CA3AF"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: '#1A1A2E',
          fontSize: 16,
          marginBottom: 20,
          backgroundColor: '#F9FAFB',
        }}
        autoCapitalize="words"
      />

      <Text style={{ color: '#374151', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>
        Client Situation{' '}
        <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text>
      </Text>
      <TextInput
        value={situation}
        onChangeText={setSituation}
        placeholder="e.g. My client is a landlord facing an eviction dispute…"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: '#1A1A2E',
          fontSize: 14,
          marginBottom: 20,
          backgroundColor: '#F9FAFB',
          minHeight: 96,
        }}
      />

      {error ? (
        <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleGenerate}
        disabled={!clientName.trim()}
        style={{
          backgroundColor: clientName.trim() ? '#1B3A6B' : '#9CA3AF',
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 12,
        }}
        activeOpacity={0.85}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Generate Letter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleClose}
        style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
        activeOpacity={0.7}
      >
        <Text style={{ color: '#6B7280', fontWeight: '500' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const loadingStep = (
    <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 }}>
      <ActivityIndicator size="large" color="#1B3A6B" />
      <Text style={{ color: '#1A1A2E', fontSize: 16, fontWeight: '500', marginTop: 16 }}>Drafting letter…</Text>
      <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
        Writing a plain-English explanation for {clientName}
      </Text>
    </View>
  );

  const resultStep = (
    <>
      <View style={{ padding: 20 }}>
        <View style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <Text style={{ color: '#1A1A2E', fontSize: 14, lineHeight: 22 }} selectable>
            {letter}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={handleCopy}
            style={{ flex: 1, borderWidth: 1, borderColor: '#1B3A6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#1B3A6B', fontWeight: '600', fontSize: 14 }}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={{ flex: 1, backgroundColor: '#1B3A6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setStep('form')}
          style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '500' }}>← Back to Form</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.webOverlay}>
          <View style={styles.webCard}>
            {header}
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 600 }}>
              {step === 'form' && formStep}
              {step === 'loading' && loadingStep}
              {step === 'result' && resultStep}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['70%', '92%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleChange}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB' }}
    >
      {header}

      {/* STEP: Form */}
      {step === 'form' && (
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {formStep}
        </BottomSheetScrollView>
      )}

      {/* STEP: Loading */}
      {step === 'loading' && (
        <BottomSheetView style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 }}>
          <ActivityIndicator size="large" color="#1B3A6B" />
          <Text style={{ color: '#1A1A2E', fontSize: 16, fontWeight: '500', marginTop: 16 }}>Drafting letter…</Text>
          <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
            Writing a plain-English explanation for {clientName}
          </Text>
        </BottomSheetView>
      )}

      {/* STEP: Result */}
      {step === 'result' && (
        <>
          <BottomSheetScrollView
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <Text style={{ color: '#1A1A2E', fontSize: 14, lineHeight: 22 }} selectable>
                {letter}
              </Text>
            </View>
          </BottomSheetScrollView>

          <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleCopy}
                style={{ flex: 1, borderWidth: 1, borderColor: '#1B3A6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#1B3A6B', fontWeight: '600', fontSize: 14 }}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={{ flex: 1, backgroundColor: '#1B3A6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setStep('form')}
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '500' }}>← Back to Form</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </>
      )}
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
    maxWidth: 600,
    overflow: 'hidden',
  },
});
