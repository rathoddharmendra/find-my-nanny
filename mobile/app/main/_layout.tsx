import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MainLayout() {
  useColorScheme();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
