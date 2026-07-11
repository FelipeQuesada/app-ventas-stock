import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SaleForm } from '@/components/SaleForm';
import { colors } from '@/constants/theme';

export default function EditSaleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Editar venta',
          headerBackTitle: 'Volver',
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        }}
      />
      <SaleForm mode="edit" saleId={id} />
    </>
  );
}
