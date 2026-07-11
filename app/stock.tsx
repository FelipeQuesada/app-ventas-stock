import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryFilter } from '@/components/ui/CategoryFilter';
import { StockBadge } from '@/components/ui/StockBadge';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getProducts, updateProductStock } from '@/services/products';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { getStockColor, getStockLevel } from '@/utils/stock';
import { colors, spacing, typography, radius } from '@/constants/theme';

export default function StockScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

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
      await updateProductStock(product.id, newStock);
      setProducts(
        products.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p))
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el stock');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
              const stockColor = getStockColor(level);
              return (
                <View
                  key={product.id}
                  style={[styles.stockItem, { borderLeftColor: stockColor, borderLeftWidth: 4 }]}
                >
                  <View style={styles.stockInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                    <StockBadge stock={product.stock} showLabel />
                  </View>
                  <View style={styles.stockControls}>
                    <TouchableOpacity
                      style={styles.stockButton}
                      onPress={() => adjustStock(product, -1)}
                    >
                      <MaterialIcons name="remove" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stockValue}>{product.stock}</Text>
                    <TouchableOpacity
                      style={styles.stockButton}
                      onPress={() => adjustStock(product, 1)}
                    >
                      <MaterialIcons name="add" size={20} color={colors.primary} />
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
    paddingBottom: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stockInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  productName: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  productPrice: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stockButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
});
