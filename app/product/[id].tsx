import React, { useState, useEffect, useMemo } from 'react';

import { View, StyleSheet, ScrollView } from 'react-native';

import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { Input } from '@/components/ui/Input';

import { SelectField } from '@/components/ui/SelectField';

import { Button } from '@/components/ui/Button';

import { LoadingScreen } from '@/components/ui/EmptyState';

import { getProduct, getProducts, createProduct, updateProduct } from '@/services/products';

import { getUniqueProductCategories } from '@/utils/productList';

import { showAlert } from '@/utils/alert';

import { colors, spacing } from '@/constants/theme';



export default function ProductFormScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();

  const isNew = id === 'new';



  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');

  const [category, setCategory] = useState('');

  const [description, setDescription] = useState('');

  const [price, setPrice] = useState('');

  const [stock, setStock] = useState('');

  const [categories, setCategories] = useState<string[]>([]);



  useEffect(() => {

    let active = true;



    (async () => {

      try {

        const allProducts = await getProducts();

        if (!active) return;



        let availableCategories = getUniqueProductCategories(allProducts);



        if (!isNew && id) {

          const product = await getProduct(id);

          if (!active) return;



          if (product) {

            if (product.category && !availableCategories.includes(product.category)) {

              availableCategories = [...availableCategories, product.category].sort((a, b) =>

                a.localeCompare(b, 'es')

              );

            }



            setName(product.name);

            setCategory(product.category);

            setDescription(product.description);

            setPrice(product.price.toString());

            setStock(product.stock.toString());

          }

        }



        setCategories(availableCategories);

      } catch (error) {

        console.error(error);

      } finally {

        if (active) setLoading(false);

      }

    })();



    return () => {

      active = false;

    };

  }, [id, isNew]);



  const categoryOptions = useMemo(() => {

    if (category && !categories.includes(category)) {

      return [...categories, category].sort((a, b) => a.localeCompare(b, 'es'));

    }

    return categories;

  }, [categories, category]);



  const handleSave = async () => {

    if (!name.trim()) {

      showAlert('Error', 'Ingresá el nombre del producto');

      return;

    }

    if (!category.trim()) {

      showAlert('Error', 'Seleccioná una categoría');

      return;

    }

    const priceNum = parseFloat(price);

    const stockNum = parseInt(stock, 10);

    if (isNaN(priceNum) || priceNum < 0) {

      showAlert('Error', 'Ingresá un precio válido');

      return;

    }

    if (isNaN(stockNum) || stockNum < 0) {

      showAlert('Error', 'Ingresá un stock válido');

      return;

    }



    setSaving(true);

    try {

      const data = {

        name: name.trim(),

        category: category.trim(),

        description: description.trim(),

        price: priceNum,

        stock: stockNum,

        imageUrl: '',

      };



      if (isNew) {

        await createProduct(data);

        showAlert('¡Producto registrado!', `${name.trim()} fue agregado correctamente`, [

          { text: 'OK', onPress: () => router.back() },

        ]);

      } else {

        await updateProduct(id!, data);

        showAlert('¡Producto actualizado!', 'Los cambios se guardaron correctamente', [

          { text: 'OK', onPress: () => router.back() },

        ]);

      }

    } catch {

      showAlert('Error', 'No se pudo guardar el producto');

    } finally {

      setSaving(false);

    }

  };



  if (loading) return <LoadingScreen />;



  return (

    <>

      <Stack.Screen options={{ headerTitle: isNew ? 'Nuevo producto' : 'Editar producto' }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del producto" />



        <SelectField

          label="Categoría"

          value={category}

          options={categoryOptions}

          onChange={setCategory}

          placeholder="Seleccioná una categoría"

        />



        <Input

          label="Descripción"

          value={description}

          onChangeText={setDescription}

          placeholder="Detalles del producto (opcional)"

          multiline

          numberOfLines={4}

          textAlignVertical="top"

          style={styles.descriptionInput}

        />



        <Input

          label="Precio"

          value={price}

          onChangeText={setPrice}

          keyboardType="decimal-pad"

          placeholder="0"

        />

        <Input

          label="Stock"

          value={stock}

          onChangeText={setStock}

          keyboardType="number-pad"

          placeholder="0"

        />



        <Button title="Guardar" onPress={handleSave} loading={saving} size="lg" style={styles.saveButton} />

      </ScrollView>

    </>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: colors.background,

  },

  content: {

    padding: spacing.md,

    paddingBottom: spacing.xxl,

  },

  descriptionInput: {

    minHeight: 110,

    paddingTop: spacing.sm + 4,

  },

  saveButton: {

    marginTop: spacing.md,

  },

});


