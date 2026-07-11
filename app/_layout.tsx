import { useEffect, useState, useCallback } from 'react';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="product/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Producto',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="stock"
            options={{
              headerShown: true,
              headerTitle: 'Control de Stock',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="caja"
            options={{
              headerShown: true,
              headerTitle: 'Caja',
              headerBackTitle: 'Volver',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="sales-list"
            options={{
              headerShown: true,
              headerTitle: 'Ventas',
              headerBackTitle: 'Volver',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="customers"
            options={{
              headerShown: true,
              headerTitle: 'Clientes',
              headerBackTitle: 'Volver',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="caja-list"
            options={{
              headerShown: true,
              headerTitle: 'Historial de caja',
              headerBackTitle: 'Volver',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="caja-edit/[date]"
            options={{
              headerShown: true,
              headerTitle: 'Editar caja',
              headerBackTitle: 'Volver',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
          <Stack.Screen
            name="sale/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Editar venta',
              headerBackTitle: 'Volver',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            }}
          />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}
