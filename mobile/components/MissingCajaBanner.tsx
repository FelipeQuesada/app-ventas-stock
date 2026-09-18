import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { getMissingPreviousDayCierre } from '@/services/caja';
import { formatDate } from '@/utils/format';
import { colors, radius, spacing, typography } from '@/constants/theme';

/** Aviso si el día calendario anterior no tiene cierre en la app. */
export function MissingCajaBanner() {
  const router = useRouter();
  const [missingDate, setMissingDate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const missing = await getMissingPreviousDayCierre();
        if (!cancelled) setMissingDate(missing);
      } catch {
        if (!cancelled) setMissingDate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!missingDate) return null;

  const dateParam = format(missingDate, 'yyyy-MM-dd');

  return (
    <View style={styles.banner}>
      <MaterialIcons name="warning" size={22} color="#B45309" />
      <View style={styles.body}>
        <Text style={styles.title}>Falta el cierre del {formatDate(missingDate)}</Text>
        <Text style={styles.subtitle}>
          No hay registro en la app. Si se cerró a mano, cargalo ahora.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.push(`/caja-register?date=${dateParam}`)}
        >
          <Text style={styles.buttonText}>Registrar día faltante</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  body: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: '#92400E',
  },
  subtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: '#B45309',
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  buttonText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: '#92400E',
  },
});
