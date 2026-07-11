import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signOutUser, changeUserPassword } from '@/services/auth';
import { colors, spacing, typography, radius } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await changeUserPassword(newPassword);
      Alert.alert('Listo', 'Contraseña actualizada');
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      Alert.alert('Error', 'No se pudo cambiar la contraseña. Volvé a iniciar sesión e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = profile?.role === 'admin' ? 'Administrador' : 'Empleado';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </Text>
      </View>
      <Text style={styles.name}>{profile?.name ?? 'Usuario'}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{roleLabel}</Text>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Datos del usuario</Text>
        <InfoRow icon="person" label="Nombre" value={profile?.name ?? '-'} />
        <InfoRow icon="email" label="Email" value={user?.email ?? '-'} />
        <InfoRow icon="badge" label="Rol" value={roleLabel} />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        <MenuItem
          icon="lock"
          label="Cambiar contraseña"
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        />
        <MenuItem icon="warehouse" label="Control de stock" onPress={() => router.push('/stock')} />
      </Card>

      {showPasswordForm && (
        <Card style={styles.section}>
          <Input
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Confirmar contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button title="Guardar contraseña" onPress={handleChangePassword} loading={loading} />
        </Card>
      )}

      <Button
        title="Cerrar sesión"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutButton}
        textStyle={{ color: colors.danger }}
      />
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={20} color={colors.textSecondary} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
  name: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  email: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  section: {
    width: '100%',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  logoutButton: {
    width: '100%',
    marginTop: spacing.md,
    borderColor: colors.danger,
  },
});
