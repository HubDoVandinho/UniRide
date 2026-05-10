import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? Colors.TextLight : Colors.Primary}
          size="small"
        />
      ) : (
        <Text style={[styles.baseText, styles[`${variant}Text`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: {
    backgroundColor: Colors.Primary,
  },
  secondary: {
    backgroundColor: Colors.Surface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.Primary,
  },
  danger: {
    backgroundColor: Colors.Error,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: Colors.TextLight,
  },
  secondaryText: {
    color: Colors.Primary,
  },
  outlineText: {
    color: Colors.Primary,
  },
  dangerText: {
    color: Colors.TextLight,
  },
});
