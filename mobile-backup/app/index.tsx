import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

export default function IndexScreen() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.TextLight} />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(app)/solicitar" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
