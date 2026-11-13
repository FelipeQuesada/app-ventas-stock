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
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signIn, resetPassword, getAuthErrorMessage } from '@/services/auth';
import { colors, spacing, typography, radius, shadows } from '@/constants/theme';

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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Logo size="lg" />
            <Text style={styles.welcome}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>
              Entrá con el email de tu marca o el que te asignó tu administrador.
            </Text>

            <Input
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secureTextEntry
              autoComplete="password"
              error={errors.password}
            />

            <Button
              title="Ingresar"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.mainButton}
            />

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              ¿Sos empleado?{' '}
              <Link href="/(auth)/join" style={styles.linkInline}>
                Sumarme con código
              </Link>
            </Text>
            <Text style={styles.hint}>
              ¿Sos dueño de un negocio?{' '}
              <Link href="/(auth)/register" style={styles.linkInline}>
                Registrá tu marca
              </Link>
            </Text>
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
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    ...shadows.md,
  },
  welcome: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
  linkInline: {
    color: colors.accent,
    fontFamily: 'Inter_600SemiBold',
  },
});
