import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Card } from './ui/Card';
import { colors, spacing, typography } from '@/constants/theme';

interface QuickActionProps {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  href: string;
  color?: string;
}

export function QuickAction({ title, icon, href, color = colors.primary }: QuickActionProps) {
  const router = useRouter();

  return (
    <TouchableOpacity style={styles.wrapper} onPress={() => router.push(href as never)} activeOpacity={0.7}>
      <Card style={styles.card} padding={spacing.md}>
        <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
          <MaterialIcons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    textAlign: 'center',
  },
});
