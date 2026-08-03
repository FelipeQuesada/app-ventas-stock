import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderCajaButton } from '@/components/HeaderCajaButton';
import { HeaderTitle } from '@/components/HeaderTitle';
import { colors, typography } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // En tablets Android la barra de navegación del sistema suele tapar el menú
  const minBottom = Platform.OS === 'android' ? 16 : 8;
  const tabBarBottomPad = Math.max(insets.bottom, minBottom);
  const tabBarHeight = 56 + tabBarBottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', ...typography.h3 },
        headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPad,
          paddingTop: 8,
        },
        tabBarSafeAreaInsets: { bottom: 0 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerRight: () => <HeaderCajaButton />,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Registrar Venta',
          tabBarLabel: 'Ventas',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="point-of-sale" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
