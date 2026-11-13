import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { signOutUser } from '@/services/auth';
import { colors, spacing, typography, radius, shadows } from '@/constants/theme';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { brand } = useBrand();

  const handleRefresh = async () => {
    await refreshProfile();
  };

  const handleLogout = async () => {
    await signOutUser();
    router.replace('/(auth)/login');
  };

  return (
    <LinearGradient colors={['#DBEAFE', '#F1F4F9']} style={styles.gradient}>
      <View style={styles.card}>
        <Logo size="lg" />
        <Text style={styles.title}>Esperando aprobación</Text>
        <Text style={styles.body}>
          Tu cuenta
          {brand?.name ? ` en ${brand.name}` : profile?.brandId ? '' : ''} está pendiente. Pedile al
          administrador que te valide en Usuarios.
        </Text>
        <Button title="Ya me aprobaron · Actualizar" onPress={() => void handleRefresh()} />
        <Button title="Cerrar sesión" onPress={() => void handleLogout()} variant="outline" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    color: colors.text,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
