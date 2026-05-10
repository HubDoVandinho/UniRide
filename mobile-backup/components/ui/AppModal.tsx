import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export interface AppModalButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress: () => void;
}

interface AppModalProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons: AppModalButton[];
  onRequestClose?: () => void;
}

export function AppModal({
  visible,
  title,
  message,
  icon,
  iconColor,
  buttons,
  onRequestClose,
}: AppModalProps) {
  const cancelBtn = buttons.find((b) => b.style === 'cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose ?? cancelBtn?.onPress}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: (iconColor ?? Colors.Primary) + '18' }]}>
              <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color={iconColor ?? Colors.Primary} />
            </View>
          )}

          <Text style={styles.title}>{title}</Text>

          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

          <View style={[styles.buttonGroup, buttons.length > 2 && styles.buttonGroupColumn]}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  buttons.length <= 2 && styles.buttonRow,
                  btn.style === 'destructive' && styles.buttonDestructive,
                  btn.style === 'cancel' && styles.buttonCancel,
                ]}
                onPress={btn.onPress}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === 'destructive' && styles.buttonTextDestructive,
                    btn.style === 'cancel' && styles.buttonTextCancel,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.Surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.Text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.TextMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  buttonGroupColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Primary,
  },
  buttonRow: {
    flex: 1,
  },
  buttonDestructive: {
    backgroundColor: Colors.Error,
  },
  buttonCancel: {
    backgroundColor: Colors.SurfaceLight,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TextLight,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  buttonTextDestructive: {
    color: Colors.TextLight,
  },
  buttonTextCancel: {
    color: Colors.TextMuted,
  },
});
