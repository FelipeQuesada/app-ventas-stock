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
import { registerBrandOwner, getAuthErrorMessage } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography, radius, shadows } from '@/constants/theme';

type Step = 1 | 2;

export default function RegisterScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [cuit, setCuit] = useState('');
  const [loading, setLoading] = useState(false);

  const goStep2 = () => {
    if (brandName.trim().length < 2) {
      Alert.alert('Falta el nombre', 'Ingresá el nombre de tu marca');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Falta el email', 'Ingresá un email válido');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'Mínimo 6 caracteres');
      return;
    }
    if (!accepted) {
      Alert.alert('Términos', 'Tenés que aceptar los términos para continuar');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!ownerName.trim()) {
      Alert.alert('Falta tu nombre', 'Ingresá tu nombre');
      return;
    }
    setLoading(true);
    try {
      await registerBrandOwner({
        email,
        password,
        ownerName,
        brandName,
        phone,
        cuit: cuit.replace(/\D/g, '') || undefined,
      });
      await refreshProfile();
      router.replace('/(tabs)');
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
            <Logo size="lg" tagline={null} />
            <View style={styles.progress}>
              <View style={[styles.bar, step >= 1 && styles.barOn]} />
              <View style={[styles.bar, step >= 2 && styles.barOn]} />
            </View>
            <Text style={styles.meta}>Paso {step} de 2</Text>

            {step === 1 ? (
              <>
                <Text style={styles.title}>Creá tu Control+</Text>
                <Text style={styles.subtitle}>
                  Nombre de marca, email y contraseña. Empezás con plan gratis.
                </Text>
                <Input
                  label="Nombre de tu marca"
                  value={brandName}
                  onChangeText={setBrandName}
                  placeholder="Ejemplo: Mi Kiosco"
                />
                <Input
                  label="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nombre@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Input
                  label="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setAccepted((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
                    {accepted ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkText}>Acepto los términos de uso de Control+</Text>
                </TouchableOpacity>
                <Button title="Continuar" onPress={goStep2} size="lg" style={styles.btn} />
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={styles.back}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Datos de tu marca</Text>
                <Text style={styles.subtitle}>
                  Con esto ya podés empezar a usar la app. El CUIT es opcional.
                </Text>
                <Input
                  label="Tu nombre"
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Nombre y apellido"
                />
                <Input
                  label="WhatsApp / teléfono"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="11 1234-5678"
                  keyboardType="phone-pad"
                />
                <Input
                  label="CUIT / CUIL (opcional)"
                  value={cuit}
                  onChangeText={setCuit}
                  placeholder="20-12345678-9"
                  keyboardType="number-pad"
                />
                <Button
                  title={loading ? 'Creando…' : 'Empezar gratis'}
                  onPress={handleCreate}
                  loading={loading}
                  size="lg"
                  style={styles.btn}
                />
              </>
            )}

            <Text style={styles.hint}>
              ¿Ya tenés cuenta?{' '}
              <Link href="/(auth)/login" style={styles.linkInline}>
                Iniciar sesión
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
  progress: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
  },
  barOn: { backgroundColor: colors.accent },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontFamily: 'Inter_500Medium',
  },
  title: {
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
  btn: { width: '100%', marginTop: spacing.sm },
  back: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontFamily: 'Inter_500Medium',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontFamily: 'Inter_400Regular',
  },
  linkInline: {
    color: colors.accent,
    fontFamily: 'Inter_600SemiBold',
  },
});
