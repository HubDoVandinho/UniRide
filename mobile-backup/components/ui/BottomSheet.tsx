import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function BottomSheet({ visible, onClose, children, containerStyle }: BottomSheetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 14,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 400,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[styles.content, containerStyle, { transform: [{ translateY: slideY }] }]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
});
