import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signIn, resetPassword, getAuthErrorMessage } from '@/services/auth';
import { colors, spacing, typography } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Ingresá tu email';
    if (!password) newErrors.password = 'Ingresá tu contraseña';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      Alert.alert('Error', getAuthErrorMessage(error));
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email requerido', 'Ingresá tu email para recuperar la contraseña');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Listo', 'Te enviamos un email para restablecer tu contraseña');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el email de recuperación');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Logo size="lg" />
          <Text style={styles.welcome}>Bienvenido</Text>
          <Text style={styles.subtitle}>Iniciá sesión para continuar</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            error={errors.password}
          />

          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.mainButton}
          />

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.link}>Olvidé mi contraseña</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>¿Necesitás una cuenta? Pedile al administrador.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  welcome: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  mainButton: {
    marginTop: spacing.sm,
    width: '100%',
  },
  link: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  hint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
