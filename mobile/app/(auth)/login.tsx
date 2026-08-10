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
import { signIn, resetPassword, registerUser, getAuthErrorMessage } from '@/services/auth';
import { colors, spacing, typography } from '@/constants/theme';

type Mode = 'login' | 'register';

/** En web no se permite registro público; solo login. */
const ALLOW_REGISTER = Platform.OS !== 'web';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Ingresá tu email';
    if (!password) newErrors.password = 'Ingresá tu contraseña';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Ingresá tu nombre';
    if (!email.trim()) newErrors.email = 'Ingresá tu email';
    if (!password) newErrors.password = 'Ingresá una contraseña';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
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

  const handleRegister = async () => {
    if (!validateRegister()) return;
    setLoading(true);
    try {
      await registerUser(email, password, name.trim());
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

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  const isLogin = mode === 'login';

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
          <Text style={styles.welcome}>{isLogin ? 'Bienvenido' : 'Crear cuenta'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Iniciá sesión para continuar' : 'Registrate para usar la app'}
          </Text>

          {!isLogin && (
            <Input
              label="Nombre"
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              autoCapitalize="words"
              error={errors.name}
            />
          )}

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
            autoComplete={isLogin ? 'password' : 'new-password'}
            error={errors.password}
          />

          {!isLogin && (
            <Input
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
              error={errors.confirmPassword}
            />
          )}

          <Button
            title={isLogin ? 'Iniciar sesión' : 'Registrarse'}
            onPress={isLogin ? handleLogin : handleRegister}
            loading={loading}
            size="lg"
            style={styles.mainButton}
          />

          {isLogin && (
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.link}>Olvidé mi contraseña</Text>
            </TouchableOpacity>
          )}

          {ALLOW_REGISTER && (
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {isLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
              </Text>
              <TouchableOpacity onPress={() => switchMode(isLogin ? 'register' : 'login')}>
                <Text style={styles.switchLink}>
                  {isLogin ? 'Registrate' : 'Iniciar sesión'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  switchText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  switchLink: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.accent,
  },
});
