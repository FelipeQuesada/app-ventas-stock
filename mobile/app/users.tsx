import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingScreen, EmptyState } from '@/components/ui/EmptyState';
import {
  createUserAsAdmin,
  getAuthErrorMessage,
  listUsers,
  updateUserRole,
} from '@/services/auth';
import { getRecentAuditLogs, AuditLog } from '@/services/audit';
import { UserProfile, UserRole } from '@/types';
import { formatDate } from '@/utils/format';
import { showAlert } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function UsersScreen() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');

  const load = useCallback(async () => {
    try {
      const [usersData, logsData] = await Promise.all([
        listUsers(),
        getRecentAuditLogs(30),
      ]);
      setUsers(usersData);
      setLogs(logsData);
    } catch (error) {
      showAlert('Error', getAuthErrorMessage(error) || 'No se pudieron cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (profile && profile.role !== 'admin') {
    return <Redirect href="/(tabs)/profile" />;
  }

  if (loading) return <LoadingScreen />;

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      showAlert('Error', 'Completá nombre, email y contraseña (mín. 6)');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await createUserAsAdmin(email, password, name, role, {
        userId: user.uid,
        userName: profile?.name,
      });
      showAlert('Listo', 'Usuario creado');
      setName('');
      setEmail('');
      setPassword('');
      setRole('employee');
      await load();
    } catch (error) {
      showAlert('Error', getAuthErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (target: UserProfile) => {
    if (!user || target.uid === user.uid) {
      showAlert('Error', 'No podés cambiar tu propio rol acá');
      return;
    }
    const nextRole: UserRole = target.role === 'admin' ? 'employee' : 'admin';
    try {
      await updateUserRole(target.uid, nextRole, {
        userId: user.uid,
        userName: profile?.name,
      });
      await load();
    } catch (error) {
      showAlert('Error', getAuthErrorMessage(error));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Nuevo usuario</Text>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Nombre completo" />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@ejemplo.com"
        />
        <Input
          label="Contraseña temporal"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Mínimo 6 caracteres"
        />
        <Text style={styles.label}>Rol</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleChip, role === 'employee' && styles.roleChipActive]}
            onPress={() => setRole('employee')}
          >
            <Text style={[styles.roleText, role === 'employee' && styles.roleTextActive]}>
              Empleado
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleChip, role === 'admin' && styles.roleChipActive]}
            onPress={() => setRole('admin')}
          >
            <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>
              Admin
            </Text>
          </Pressable>
        </View>
        <Button title="Crear usuario" onPress={handleCreate} loading={saving} />
      </Card>

      <Text style={styles.section}>Usuarios ({users.length})</Text>
      {users.length === 0 ? (
        <EmptyState icon="people" title="Sin usuarios" subtitle="Creá el primero arriba" />
      ) : (
        users.map((item) => (
          <Card key={item.uid} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <Text style={styles.userRole}>
                {item.role === 'admin' ? 'Administrador' : 'Empleado'}
              </Text>
            </View>
            {item.uid !== user?.uid && (
              <Button
                title={item.role === 'admin' ? 'Hacer empleado' : 'Hacer admin'}
                onPress={() => handleToggleRole(item)}
                variant="outline"
                size="sm"
              />
            )}
          </Card>
        ))
      )}

      <Text style={styles.section}>Auditoría reciente</Text>
      {logs.length === 0 ? (
        <Text style={styles.emptyLogs}>Todavía no hay movimientos registrados</Text>
      ) : (
        logs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <Text style={styles.logSummary}>{log.summary}</Text>
            <Text style={styles.logMeta}>
              {log.userName || 'Usuario'} · {formatDate(log.createdAt)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { gap: spacing.xs },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  roleTextActive: { color: colors.white },
  section: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  userInfo: { flex: 1 },
  userName: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  userEmail: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  userRole: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
    marginTop: 2,
  },
  emptyLogs: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  logRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  logSummary: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  logMeta: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
});
