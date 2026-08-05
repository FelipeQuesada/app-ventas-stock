import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Button } from '@/components/ui/Button';
import { sharePdfFromHtml } from '@/services/export';
import { showAlert } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

export type PdfPreviewState = {
  html: string;
  title: string;
} | null;

type Props = {
  visible: boolean;
  html: string | null;
  title?: string;
  onClose: () => void;
};

export function PdfPreviewModal({
  visible,
  html,
  title = 'Vista previa PDF',
  onClose,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const [downloading, setDownloading] = useState(false);

  const previewHeight = Math.min(520, Math.max(280, windowHeight * 0.55));
  const show = visible && !!html;

  const handleDownload = async () => {
    if (!html) return;
    setDownloading(true);
    try {
      await sharePdfFromHtml(html, title);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo descargar el PDF';
      showAlert('Error', message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight: windowHeight * 0.9 }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                Vista previa
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.preview, { height: previewHeight }]}>
            {html ? (
              Platform.OS === 'web' ? (
                <iframe
                  title={title}
                  srcDoc={html}
                  style={{
                    width: '100%',
                    height: previewHeight,
                    border: 'none',
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    display: 'block',
                  }}
                />
              ) : (
                <WebView
                  originWhitelist={['*']}
                  source={{ html }}
                  style={styles.webview}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.loading}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  )}
                />
              )
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button title="Cerrar" variant="outline" onPress={onClose} style={styles.btn} />
            <Button
              title="Descargar PDF"
              onPress={handleDownload}
              loading={downloading}
              style={styles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    ...Platform.select({
      web: { zIndex: 9999 } as object,
      default: {},
    }),
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    width: '100%',
    maxWidth: 720,
    padding: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
      } as object,
      default: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  preview: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
  },
});
