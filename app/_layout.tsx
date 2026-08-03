import { useEffect, useState, useCallback } from 'react';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { HeaderTitle } from '@/components/HeaderTitle';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const stackHeaderOptions = {
  headerShown: true,
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' as const },
  headerTitle: ({ children }: { children: string }) => <HeaderTitle>{children}</HeaderTitle>,
};

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
              ...stackHeaderOptions,
              title: 'Producto',
            }}
          />
          <Stack.Screen
            name="stock"
            options={{
              ...stackHeaderOptions,
              title: 'Control de Stock',
            }}
          />
          <Stack.Screen
            name="caja"
            options={{
              ...stackHeaderOptions,
              title: 'Caja',
              headerBackTitle: 'Volver',
            }}
          />
          <Stack.Screen
            name="sales-list"
            options={{
              ...stackHeaderOptions,
              title: 'Ventas',
              headerBackTitle: 'Volver',
            }}
          />
          <Stack.Screen
            name="customers"
            options={{
              ...stackHeaderOptions,
              title: 'Clientes',
              headerBackTitle: 'Volver',
            }}
          />
          <Stack.Screen
            name="caja-list"
            options={{
              ...stackHeaderOptions,
              title: 'Historial de caja',
              headerBackTitle: 'Volver',
            }}
          />
          <Stack.Screen
            name="caja-edit/[date]"
            options={{
              ...stackHeaderOptions,
              title: 'Editar caja',
              headerBackTitle: 'Volver',
            }}
          />
          <Stack.Screen
            name="sale/[id]"
            options={{
              ...stackHeaderOptions,
              title: 'Editar venta',
              headerBackTitle: 'Volver',
            }}
          />
          <Stack.Screen
            name="users"
            options={{
              ...stackHeaderOptions,
              title: 'Usuarios',
              headerBackTitle: 'Volver',
            }}
          />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}
