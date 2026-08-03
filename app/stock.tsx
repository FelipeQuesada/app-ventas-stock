import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryFilter } from '@/components/ui/CategoryFilter';
import { StockBadge } from '@/components/ui/StockBadge';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { subscribeProducts, updateProductStock } from '@/services/products';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { getStockColor, getStockLevel } from '@/utils/stock';
import { showAlert } from '@/utils/alert';
import { colors, spacing, typography, radius } from '@/constants/theme';

export default function StockScreen() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const errorShown = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeProducts(
      (data) => {
        setProducts(data);
        setLoading(false);
        setLive(true);
      },
      () => {
        setLoading(false);
        if (!errorShown.current) {
          errorShown.current = true;
          showAlert('Error', 'No se pudo escuchar el stock en tiempo real');
        }
      }
    );
    return unsubscribe;
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    const term = search.toLowerCase().trim();
    if (term) {
      result = result.filter((p) => p.name.toLowerCase().includes(term));
    }
    return result;
  }, [products, search, selectedCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const product of filtered) {
      if (!groups[product.category]) groups[product.category] = [];
      groups[product.category].push(product);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const adjustStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    try {
      await updateProductStock(product.id, newStock, {
        userId: user?.uid ?? 'unknown',
        userName: profile?.name,
        previousStock: product.stock,
        productName: product.name,
      });
    } catch {
      showAlert('Error', 'No se pudo actualizar el stock');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {live && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En vivo</Text>
          </View>
        )}
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre..." />
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {grouped.map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {items.map((product) => {
              const level = getStockLevel(product.stock);
              return (
                <View key={product.id} style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>{formatCurrency(product.price)}</Text>
                    <StockBadge stock={product.stock} />
                  </View>
                  <View style={styles.controls}>
                    <TouchableOpacity
                      style={styles.btn}
                      onPress={() => adjustStock(product, -1)}
                    >
                      <MaterialIcons name="remove" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.stock, { color: getStockColor(level) }]}>
                      {product.stock}
                    </Text>
                    <TouchableOpacity
                      style={styles.btn}
                      onPress={() => adjustStock(product, 1)}
                    >
                      <MaterialIcons name="add" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.success,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  price: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stock: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    minWidth: 36,
    textAlign: 'center',
  },
});
