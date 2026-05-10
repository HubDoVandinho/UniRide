import React from 'react';
import {
  ScrollView,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  padded?: boolean;
}

export function Screen({
  children,
  style,
  scrollable = false,
  padded = true,
}: ScreenProps) {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : null;

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scrollable ? (
          content
        ) : (
          <SafeAreaView style={[styles.inner, padded && styles.padded, style]}>
            {children}
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    padding: 20,
  },
});
