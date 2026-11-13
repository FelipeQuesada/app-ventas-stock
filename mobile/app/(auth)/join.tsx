import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  registerEmployeeWithInviteCode,
  getAuthErrorMessage,
} from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography, radius, shadows } from '@/constants/theme';

export default function JoinScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!name.trim() || !email.trim() || password.length < 6 || inviteCode.trim().length < 4) {
      Alert.alert('Faltan datos', 'Completá nombre, email, contraseña (mín. 6) y el código de marca');
      return;
    }
    setLoading(true);
    try {
      const result = await registerEmployeeWithInviteCode({
        email,
        password,
        name,
        inviteCode,
      });
      await refreshProfile();
      Alert.alert(
        'Pedido enviado',
        `Te sumaste a ${result.brandName}. Cuando el admin te apruebe vas a poder entrar.`
      );
      router.replace('/(auth)/pending');
    } catch (error) {
      Alert.alert('Error', getAuthErrorMessage(error));
      await refreshProfile().catch(() => undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#DBEAFE', '#F1F4F9', '#E0E7FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Logo size="lg" />
            <Text style={styles.title}>Sumarme a una marca</Text>
            <Text style={styles.subtitle}>
              Pedile el código a tu administrador. Quedás pendiente hasta que te aprueben.
            </Text>
            <Input label="Tu nombre" value={name} onChangeText={setName} placeholder="Nombre" />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
            />
            <Input
              label="Código de marca"
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="Ej. K7M2QX"
            />
            <Button title="Enviar solicitud" onPress={() => void handleJoin()} loading={loading} />
            <Link href="/(auth)/login" asChild>
              <Text style={styles.link}>Ya tengo cuenta · Iniciar sesión</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    color: colors.text,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  link: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
