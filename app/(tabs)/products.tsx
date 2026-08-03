import React, { useState, useCallback, useMemo } from 'react';

import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

import { useRouter, useFocusEffect } from 'expo-router';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { SearchBar } from '@/components/ui/SearchBar';

import { Button } from '@/components/ui/Button';

import { ProductListItem } from '@/components/ui/ProductListItem';

import { ProductFilters } from '@/components/ProductFilters';

import { ImportProductsModal } from '@/components/ImportProductsModal';

import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';

import { getProducts, subscribeProducts } from '@/services/products';

import { getSales } from '@/services/sales';

import { Product, Sale } from '@/types';

import {

  filterAndSortProducts,

  getProductSalesCounts,

  getUniqueProductCategories,

} from '@/utils/productList';

import { showAlert } from '@/utils/alert';

import { colors, spacing } from '@/constants/theme';



export default function ProductsScreen() {

  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);

  const [sales, setSales] = useState<Sale[]>([]);

  const [search, setSearch] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showOutOfStock, setShowOutOfStock] = useState(false);

  const [showLowStock, setShowLowStock] = useState(false);

  const [loading, setLoading] = useState(true);

  const [importVisible, setImportVisible] = useState(false);



  const loadProducts = useCallback(async () => {
    try {
      const [productsData, salesData] = await Promise.all([
        getProducts(),
        getSales().catch(() => [] as Sale[]),
      ]);
      setProducts(productsData);
      setSales(salesData);
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      const unsubscribe = subscribeProducts(
        (data) => {
          setProducts(data);
          setLoading(false);
        },
        () => {
          showAlert('Error', 'Se perdió la conexión en tiempo real de productos');
        }
      );
      return () => unsubscribe();
    }, [loadProducts])
  );



  const salesCounts = useMemo(() => getProductSalesCounts(sales), [sales]);



  const categories = useMemo(() => getUniqueProductCategories(products), [products]);



  const filtered = useMemo(

    () =>

      filterAndSortProducts(

        products,

        {

          search,

          category: selectedCategory,

          showOutOfStock,

          showLowStock,

        },

        salesCounts

      ),

    [products, search, selectedCategory, showOutOfStock, showLowStock, salesCounts]

  );



  if (loading) return <LoadingScreen />;



  return (

    <View style={styles.container}>

      <View style={styles.header}>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar productos..." />

        <Button

          title="Importar productos"

          variant="outline"

          size="sm"

          onPress={() => setImportVisible(true)}

          icon={<MaterialIcons name="upload-file" size={18} color={colors.primary} />}

          style={styles.importButton}

        />

        <ProductFilters

          categories={categories}

          selectedCategory={selectedCategory}

          onSelectCategory={setSelectedCategory}

          showOutOfStock={showOutOfStock}

          showLowStock={showLowStock}

          onToggleOutOfStock={() => setShowOutOfStock((value) => !value)}

          onToggleLowStock={() => setShowLowStock((value) => !value)}

        />

      </View>



      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (

          <ProductListItem

            product={item}

            onPress={() => router.push(`/product/${item.id}`)}

          />

        )}

        contentContainerStyle={styles.list}

        ListEmptyComponent={

          <EmptyState

            icon="inventory-2"

            title="No hay productos"

            subtitle={

              selectedCategory || showOutOfStock || showLowStock || search

                ? 'No hay productos con estos filtros'

                : 'Tocá + para agregar el primero'

            }

          />

        }

      />



      <TouchableOpacity

        style={styles.fab}

        onPress={() => router.push('/product/new')}

        activeOpacity={0.8}

      >

        <MaterialIcons name="add" size={28} color={colors.white} />

      </TouchableOpacity>



      <ImportProductsModal

        visible={importVisible}

        onClose={() => setImportVisible(false)}

        onImported={loadProducts}

      />

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

    paddingBottom: spacing.sm,

    gap: spacing.sm,

  },

  importButton: {

    alignSelf: 'flex-start',

  },

  list: {

    padding: spacing.md,

    paddingTop: 0,

    paddingBottom: 100,

  },

  fab: {

    position: 'absolute',

    right: spacing.lg,

    bottom: spacing.lg,

    width: 56,

    height: 56,

    borderRadius: 28,

    backgroundColor: colors.accent,

    alignItems: 'center',

    justifyContent: 'center',

    elevation: 4,

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.25,

    shadowRadius: 4,

  },

});


