import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SaleForm } from '@/components/SaleForm';

export default function EditSaleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Editar venta',
        }}
      />
      <SaleForm mode="edit" saleId={id} />
    </>
  );
}
