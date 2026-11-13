import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { colors } from '@/constants/theme';

const SPRING = { damping: 22, stiffness: 320, mass: 0.85 };

const PRIMARY_TABS = ['index', 'sales', 'products', 'caja'] as const;

type TabOptions = {
  href?: string | null;
  title?: string;
  tabBarLabel?:
    | string
    | ((props: {
        focused: boolean;
        color: string;
        position: string;
        children: string;
      }) => React.ReactNode);
  tabBarIcon?: (props: {
    focused: boolean;
    color: string;
    size: number;
  }) => React.ReactNode;
  tabBarAccessibilityLabel?: string;
};

type TabRoute = {
  key: string;
  name: string;
  params?: object;
};

type FloatingTabBarProps = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, { options: TabOptions }>;
  navigation: {
    emit: (event: {
      type: string;
      target?: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

type MoreItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
};

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { limits, isBrandAdmin } = useBrand();
  const [trackWidth, setTrackWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryRoutes = useMemo(
    () =>
      PRIMARY_TABS.map((name) => state.routes.find((route) => route.name === name)).filter(
        (route): route is TabRoute => Boolean(route)
      ),
    [state.routes]
  );

  const focusedRouteName = state.routes[state.index]?.name;
  const primaryFocused = PRIMARY_TABS.includes(
    focusedRouteName as (typeof PRIMARY_TABS)[number]
  );
  const activeIndex = Math.max(
    0,
    primaryRoutes.findIndex((route) => route.name === focusedRouteName)
  );
  const moreActive = !primaryFocused || moreOpen;

  const indicatorX = useSharedValue(0);
  const slotCount = primaryRoutes.length + 1;
  const itemWidth = trackWidth > 0 && slotCount > 0 ? trackWidth / slotCount : 0;

  useEffect(() => {
    if (itemWidth <= 0) return;
    const index = moreActive ? primaryRoutes.length : activeIndex;
    indicatorX.value = withSpring(index * itemWidth, SPRING);
  }, [activeIndex, itemWidth, indicatorX, moreActive, primaryRoutes.length]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: itemWidth,
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  const moreItems = useMemo(() => {
    const items: MoreItem[] = [
      {
        key: 'profile',
        label: 'Perfil',
        icon: 'person',
        onPress: () => navigation.navigate('profile'),
      },
      {
        key: 'sales-list',
        label: 'Historial ventas',
        icon: 'receipt-long',
        onPress: () => router.push('/sales-list'),
      },
      {
        key: 'customers',
        label: 'Clientes',
        icon: 'people',
        onPress: () => router.push('/customers'),
      },
      {
        key: 'stock',
        label: 'Stock',
        icon: 'warehouse',
        onPress: () => router.push('/stock'),
      },
      {
        key: 'caja-list',
        label: 'Historial caja',
        icon: 'history',
        onPress: () => router.push('/caja-list'),
      },
    ];

    if (limits.presupuestos) {
      items.push(
        {
          key: 'presupuesto',
          label: 'Presupuesto',
          icon: 'description',
          onPress: () => router.push('/presupuesto'),
        },
        {
          key: 'presupuesto-list',
          label: 'Hist. presupuestos',
          icon: 'folder-open',
          onPress: () => router.push('/presupuesto-list'),
        }
      );
    }

    if (limits.flex) {
      items.push({
        key: 'flex',
        label: 'Flex',
        icon: 'local-shipping',
        onPress: () => router.push('/flex'),
      });
    }

    if (limits.statistics && isBrandAdmin) {
      items.push({
        key: 'statistics',
        label: 'Estadísticas',
        icon: 'bar-chart',
        onPress: () => navigation.navigate('statistics'),
      });
    }

    if (isBrandAdmin) {
      items.push({
        key: 'users',
        label: 'Usuarios',
        icon: 'admin-panel-settings',
        onPress: () => router.push('/users'),
      });
    }

    return items;
  }, [limits.flex, limits.presupuestos, limits.statistics, isBrandAdmin, navigation, router, profile?.role]);

  function openMoreItem(item: MoreItem) {
    setMoreOpen(false);
    // defer navigation so modal can close first
    requestAnimationFrame(() => item.onPress());
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <View style={styles.track} onLayout={onTrackLayout}>
          {itemWidth > 0 ? (
            <Animated.View style={[styles.indicator, indicatorStyle]} />
          ) : null}
          {primaryRoutes.map((route) => {
            const options = descriptors[route.key].options;
            const isFocused = route.name === focusedRouteName && !moreOpen;
            const color = isFocused ? '#2563EB' : colors.textSecondary;

            let label: React.ReactNode = options.tabBarLabel ?? options.title ?? route.name;
            if (typeof options.tabBarLabel === 'function') {
              label = options.tabBarLabel({
                focused: isFocused,
                color,
                position: 'below-icon',
                children: options.title ?? route.name,
              });
            }

            const icon = options.tabBarIcon?.({
              focused: isFocused,
              color,
              size: isFocused ? 22 : 20,
            });

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={() => {
                  setMoreOpen(false);
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                style={styles.item}
              >
                {icon}
                {typeof label === 'string' || typeof label === 'number' ? (
                  <Text
                    style={[
                      styles.label,
                      { color },
                      isFocused ? styles.labelActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                ) : (
                  label
                )}
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            accessibilityState={moreActive ? { selected: true } : {}}
            accessibilityLabel="Más"
            onPress={() => setMoreOpen(true)}
            style={styles.item}
          >
            <MaterialIcons
              name="more-horiz"
              size={moreActive ? 22 : 20}
              color={moreActive ? '#2563EB' : colors.textSecondary}
            />
            <Text
              style={[
                styles.label,
                { color: moreActive ? '#2563EB' : colors.textSecondary },
                moreActive ? styles.labelActive : null,
              ]}
              numberOfLines={1}
            >
              Más
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.moreBackdrop} onPress={() => setMoreOpen(false)}>
          <Pressable style={[styles.moreSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.moreTitle}>Más opciones</Text>
            {moreItems.map((item) => (
              <Pressable
                key={item.key}
                style={styles.moreRow}
                onPress={() => openMoreItem(item)}
              >
                <MaterialIcons name={item.icon} size={22} color={colors.primary} />
                <Text style={styles.moreLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  pill: {
    backgroundColor: '#F0F2F7',
    borderRadius: 999,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(26, 26, 46, 0.06)',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  track: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: colors.white,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  item: {
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
  },
  labelActive: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
  },
  moreBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  moreSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  moreTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  moreLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.text,
  },
});
