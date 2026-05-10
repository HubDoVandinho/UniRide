import React from 'react';
import {
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  nome: string;
}

export function ShareProfileModal({ visible, onClose, username, nome }: ShareProfileModalProps) {
  const deepLink = `uniride://perfil/${username}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Confira o perfil de ${nome} no UniRide!\n${deepLink}`,
        title: `Perfil de ${nome}`,
      });
    } catch {
      // usuário cancelou ou erro silencioso
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Fechar */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.TextMuted} />
          </TouchableOpacity>

          {/* Título */}
          <Text style={styles.title}>Compartilhar perfil</Text>
          <Text style={styles.subtitle}>@{username}</Text>

          {/* QR Code */}
          <View style={styles.qrWrap}>
            <QRCode
              value={deepLink}
              size={180}
              color={Colors.Primary}
              backgroundColor="#fff"
            />
          </View>

          {/* Link */}
          <View style={styles.linkBox}>
            <Ionicons name="link-outline" size={14} color={Colors.TextMuted} />
            <Text style={styles.linkText} numberOfLines={1}>{deepLink}</Text>
          </View>

          {/* Botão compartilhar */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Compartilhar link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.Text,
    marginBottom: 4,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.Primary,
    fontWeight: '600',
    marginBottom: 24,
  },
  qrWrap: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    width: '100%',
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    color: Colors.TextMuted,
    fontFamily: 'monospace',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.Primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
