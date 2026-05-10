import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  style?: ViewStyle;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  borderColor?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  style,
  autoCapitalize = 'none',
  autoCorrect = false,
  editable = true,
  multiline = false,
  numberOfLines,
  borderColor,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = secureTextEntry;

  // Android bug: secureTextEntry troca a fonte e quebra o placeholder.
  // Solução: só ativa secureTextEntry quando o campo está focado ou já tem conteúdo.
  const effectiveSecure = isPassword && !showPassword && (isFocused || value.length > 0);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : borderColor ? { borderColor } : null, multiline && styles.inputWrapperMultiline]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.TextMuted}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.TextMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.InputBg,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: Colors.Text,
  },
  inputMultiline: {
    height: undefined,
    minHeight: 80,
    paddingVertical: 10,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  inputError: {
    borderColor: Colors.Error,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: Colors.Error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
});
