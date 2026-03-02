import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
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
  const ref = useRef<BottomSheetModal>(null);
  const [loading, setLoading] = useState(false);
  const [citation, setCitation] = useState('');
  const [note, setNote] = useState('');
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

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const content = (
    <>
      {/* Header */}
      <View style={{ backgroundColor: '#1B3A6B', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>📋 AI Citation Generator</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
          Bluebook format · Powered by Groq
        </Text>
      </View>

      <View style={{ padding: 20 }}>
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#1B3A6B" />
            <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 12 }}>Generating citation…</Text>
          </View>
        )}

        {error ? (
          <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 16 }}>
            <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {!loading && citation ? (
          <>
            <View style={{ backgroundColor: '#F0F4FF', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Bluebook Citation
              </Text>
              <Text style={{ color: '#1A1A2E', fontSize: 16, fontWeight: '500', lineHeight: 24 }} selectable>
                {citation}
              </Text>
            </View>

            {note ? (
              <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 12, color: '#92400E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Usage Note
                </Text>
                <Text style={{ color: '#78350F', fontSize: 14, lineHeight: 20 }}>{note}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleCopy}
              style={{ backgroundColor: '#1B3A6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Copy Citation</Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity
          onPress={onClose}
          style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#6B7280', fontWeight: '500' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
      snapPoints={['60%', '85%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleChange}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB' }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 0 }} showsVerticalScrollIndicator={false}>
        {content}
      </BottomSheetScrollView>
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
    maxWidth: 560,
    overflow: 'hidden',
  },
});
