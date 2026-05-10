import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_ITEM_W = SCREEN_WIDTH - 40 - 32;
const AVATAR_WRAPPER = Math.round(SCREEN_WIDTH * 0.26);
const AVATAR_PHOTO   = Math.round(AVATAR_WRAPPER * 0.69);
const STAR_CENTER    = AVATAR_WRAPPER / 2;
const STAR_RADIUS    = AVATAR_PHOTO / 2 + 10;
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { participanteService } from '@/services/participante.service';
import { caronaService } from '@/services/carona.service';
import { amizadeService } from '@/services/amizade.service';
import { AvaliacaoResponse } from '@/types/api.types';

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Estrelinhas({ nota, size = 12 }: { nota: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size > 12 ? 4 : 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name="star" size={size} color={n <= nota ? '#FFD700' : '#DDD'} />
      ))}
    </View>
  );
}

function StarRating({ media }: { media?: number }) {
  const valor = media ?? 5;
  const stars = Math.round(valor);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name="star" size={14} color="#FFD700" style={{ opacity: i < stars ? 1 : 0.3 }} />
      ))}
      <Text style={{ color: Colors.TextMuted, fontSize: 12, marginLeft: 4 }}>
        {valor.toFixed(1)}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    ATIVO: Colors.Success,
    INATIVO: Colors.Error,
    PENDENTE_VERIFICACAO: '#FF9800',
  };
  const labelMap: Record<string, string> = {
    ATIVO: 'Ativo',
    INATIVO: 'Inativo',
    PENDENTE_VERIFICACAO: 'Pendente',
  };
  const color = colorMap[status] || Colors.TextMuted;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.statusText, { color }]}>{labelMap[status] || status}</Text>
    </View>
  );
}

// Item de ação completo (para o bloco Motorista — largura total)
type ActionRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  last?: boolean;
  badge?: number;
};

function ActionItem({ icon, label, onPress, last, badge }: ActionRow) {
  return (
    <TouchableOpacity
      style={[styles.actionItem, last && styles.actionItemLast]}
      onPress={onPress}
    >
      <View style={{ position: 'relative', width: 28, marginRight: 12 }}>
        <Ionicons name={icon} size={20} color={Colors.Primary} style={styles.actionIcon} />
        {!!badge && badge > 0 && (
          <View style={styles.badgeDot}>
            <Text style={styles.badgeDotText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.TextMuted} />
    </TouchableOpacity>
  );
}

// Item de ação compacto — para os blocos lado a lado (Passageiro / Social)
type MiniActionRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  last?: boolean;
  badge?: number;
};

function MiniActionItem({ icon, label, onPress, last, badge }: MiniActionRow) {
  return (
    <TouchableOpacity
      style={[styles.miniActionItem, last && styles.miniActionItemLast]}
      onPress={onPress}
    >
      <View style={{ position: 'relative', marginBottom: 6 }}>
        <Ionicons name={icon} size={22} color={Colors.Primary} />
        {!!badge && badge > 0 && (
          <View style={styles.badgeDot}>
            <Text style={styles.badgeDotText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.miniActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

type SidebarProps = {
  visible: boolean;
  onClose: () => void;
  insetTop: number;
  insetBottom: number;
  onLogout: () => void;
  shareProfile?: { username: string; nome: string };
  onShowShare?: () => void;
  children: React.ReactNode;
};

function Sidebar({ visible, onClose, insetTop, insetBottom, onLogout, shareProfile, onShowShare, children }: SidebarProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setConfirmLogout(false);
      setModalVisible(true);
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      setConfirmLogout(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Overlay escuro */}
        <Animated.View style={[styles.sidebarOverlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Painel */}
        <Animated.View
          style={[
            styles.sidebarPanel,
            { paddingTop: insetTop + 16, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Configurações</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.Text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            {children}
            {shareProfile && (
              <TouchableOpacity style={styles.sidebarItem} onPress={() => { onClose(); onShowShare?.(); }}>
                <View style={styles.sidebarItemIcon}>
                  <Ionicons name="share-social-outline" size={20} color={Colors.Primary} />
                </View>
                <Text style={styles.sidebarItemLabel}>Compartilhar perfil</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.TextMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.sidebarLogoutArea, { paddingBottom: insetBottom + 16 }]}>
            <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={() => setConfirmLogout(true)}>
              <Ionicons name="log-out-outline" size={18} color={Colors.Error} />
              <Text style={styles.sidebarLogoutText}>Sair da conta</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Confirmação de logout — overlay dentro do mesmo Modal */}
        {confirmLogout && (
          <View style={styles.sidebarConfirmOverlay} pointerEvents="auto">
            <View style={styles.sidebarConfirmCard}>
              <View style={[styles.sidebarConfirmIcon, { backgroundColor: Colors.Error + '18' }]}>
                <Ionicons name="log-out-outline" size={32} color={Colors.Error} />
              </View>
              <Text style={styles.sidebarConfirmTitle}>Sair da conta</Text>
              <Text style={styles.sidebarConfirmMsg}>Deseja realmente sair?</Text>
              <View style={styles.sidebarConfirmBtns}>
                <TouchableOpacity
                  style={[styles.sidebarConfirmBtn, styles.sidebarConfirmBtnCancel]}
                  onPress={() => setConfirmLogout(false)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sidebarConfirmBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sidebarConfirmBtn, styles.sidebarConfirmBtnDestructive]}
                  onPress={onLogout}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sidebarConfirmBtnText}>Sair</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Item do sidebar
type SidebarItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

function SidebarItem({ icon, label, onPress }: SidebarItemProps) {
  return (
    <TouchableOpacity style={styles.sidebarItem} onPress={onPress}>
      <View style={styles.sidebarItemIcon}>
        <Ionicons name={icon} size={20} color={Colors.Primary} />
      </View>
      <Text style={styles.sidebarItemText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.TextMuted} />
    </TouchableOpacity>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, setUser, logout } = useAuthStore();
  const { amizadesPendentes, solicitacoesPendentes, aprovacoesNaoVistas, caronasComEmbarcados, caronasComMensagemNova, negativosNaoVistos, marcarAmizadesVistas, marcarSolicitacoesVistas, marcarAprovacoesVistas } = useNotificationStore();
  const { showAlert, alertModal } = useAppAlert();
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoModalVisible, setFotoModalVisible] = useState(false);
  const [fotoSheetVisible, setFotoSheetVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Avaliações
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoResponse[]>([]);
  const [loadingAval, setLoadingAval] = useState(false);
  const [activeAvalIndex, setActiveAvalIndex] = useState(0);
  const [avaliacaoDetalhe, setAvaliacaoDetalhe] = useState<AvaliacaoResponse | null>(null);

  // Amigos
  const [totalAmigos, setTotalAmigos] = useState(0);

  useEffect(() => {
    if (!user && token) {
      setLoadingPerfil(true);
      participanteService.meuPerfil()
        .then((perfil) => setUser(perfil))
        .catch(() => router.replace('/(auth)/login'))
        .finally(() => setLoadingPerfil(false));
    } else if (!user && !token) {
      router.replace('/(auth)/login');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    setLoadingAval(true);
    caronaService.listarAvaliacoes(user.id)
      .then((lista) => {
        setAvaliacoes(lista);
        if (lista.length > 0) {
          const media = lista.reduce((acc, a) => acc + a.nota, 0) / lista.length;
          const mediaArredondada = Math.round(media * 10) / 10;
          if (mediaArredondada !== user.mediaAvaliacoes) {
            setUser({ ...user, mediaAvaliacoes: mediaArredondada });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAval(false));
    amizadeService.listarAmigos()
      .then((lista) => setTotalAmigos(lista.length))
      .catch(() => {});
  }, [user?.id]));

  const abrirPickerFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permissão necessária', 'Precisamos de acesso à sua galeria para alterar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
      exif: false,
    });
    if (result.canceled || !result.assets[0].base64) return;
    const { base64, mimeType } = result.assets[0];
    const dataUrl = `data:${mimeType ?? 'image/jpeg'};base64,${base64}`;
    setUploadingFoto(true);
    try {
      const atualizado = await participanteService.atualizarPerfil({ fotoPerfilUrl: dataUrl });
      setUser(atualizado);
    } catch (err: unknown) {
      showAlert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a foto.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleToqueFoto = () => {
    if (!user) return;
    if (user.fotoPerfilUrl) {
      setFotoSheetVisible(true);
    } else {
      abrirPickerFoto();
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          {loadingPerfil ? (
            <ActivityIndicator size="large" color={Colors.Primary} />
          ) : (
            <Text style={styles.noUserText}>Usuário não encontrado</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const avaliacoesRecentes = [...avaliacoes]
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header fixo — não sobrepõe o conteúdo */}
      <View style={styles.topBar}>
        <Text style={styles.topBarUsername}>@{user.username ?? user.nome}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.menuFloatBtn}
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.5}
        >
          <Ionicons name="menu-outline" size={26} color={Colors.Primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Banner CNH em análise */}
        {user.tipo === 'MOTORISTA' && !user.aprovadoAdmin && (
          <View style={styles.bannerAnalise}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hourglass-outline" size={16} color="#795548" />
              <Text style={[styles.bannerAnaliseTexto, { flex: 1 }]}>
                Sua CNH está em análise. Você poderá criar rotinas após a aprovação pelo administrador.
              </Text>
            </View>
          </View>
        )}

        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <View style={styles.card}>
        <View style={styles.avatarSection}>

          {/* Coluna esquerda: foto com estrelas + badge abaixo */}
          <View style={styles.avatarLeft}>
            <View style={styles.avatarOuterWrapper}>
              {Array.from({ length: 5 }).map((_, i) => {
                const angle = (220 + i * 25) * (Math.PI / 180);
                const x = STAR_CENTER + STAR_RADIUS * Math.cos(angle) - 7;
                const y = STAR_CENTER + STAR_RADIUS * Math.sin(angle) - 7;
                const N = user.mediaAvaliacoes ?? 5;
                const opacity = Math.max(0.25, Math.min(1, Math.min(i, 4 - i) - (5 - N) / 2 + 1));
                return (
                  <Ionicons
                    key={i}
                    name="star"
                    size={14}
                    color="#FFD700"
                    style={{ position: 'absolute', left: x, top: y, opacity }}
                  />
                );
              })}
              <TouchableOpacity onPress={handleToqueFoto} style={styles.avatarWrapper} disabled={uploadingFoto}>
                <View style={styles.avatar}>
                  {user.fotoPerfilUrl ? (
                    <Image source={{ uri: user.fotoPerfilUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitial}>{user.nome.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.cameraOverlay}>
                  {uploadingFoto
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            </View>

          </View>

          {/* Coluna direita: nome + média, stats */}
          <View style={styles.profileCard}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user.nome}</Text>
            </View>

            <Text style={styles.tipoInline}>
              <Text style={{ color: Colors.Primary }}>{user.tipo === 'MOTORISTA' ? 'Motorista' : 'Passageiro'}</Text>
              {`  ·  Nota: ${(user.mediaAvaliacoes ?? 5).toFixed(1)}`}
            </Text>

            <View style={styles.statsInline}>
              <TouchableOpacity
                style={styles.statInlineItem}
                onPress={() => { marcarAmizadesVistas(); router.push('/amigos'); }}
                activeOpacity={0.7}
              >
                <Text style={styles.statInlineValue}>{totalAmigos}</Text>
                <Text style={styles.statInlineLabel}>amigos</Text>
              </TouchableOpacity>
              <View style={styles.statInlineSep} />
              <View style={styles.statInlineItem}>
                <Text style={styles.statInlineValue}>{avaliacoes.length}</Text>
                <Text style={styles.statInlineLabel}>avaliações</Text>
              </View>
            </View>

          </View>
        </View>

        {user.miniBiografia ? (
          <Text style={styles.bioInline}>{user.miniBiografia}</Text>
        ) : null}
        </View>

        {user.preferencias && user.preferencias.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Preferências</Text>
            <View style={styles.preferenciasRow}>
              {user.preferencias.map((p) => (
                <View key={p.id} style={styles.preferenciaBadge}>
                  <Text style={styles.preferenciaBadgeText}>{p.nome}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Avaliações recebidas (carrossel) ──────────────── */}
        <View style={styles.card}>
          <View style={styles.avalCardHeader}>
            <Text style={styles.cardLabel}>Avaliações recebidas</Text>
            {avaliacoes.length > 0 && (
              <View style={styles.avalMediaBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.avalMediaValor}>{(user.mediaAvaliacoes ?? 5).toFixed(1)}</Text>
                <Text style={styles.avalMediaCount}>({avaliacoes.length})</Text>
              </View>
            )}
          </View>

          {loadingAval ? (
            <ActivityIndicator color={Colors.Primary} style={{ marginVertical: 16 }} />
          ) : avaliacoesRecentes.length === 0 ? (
            <View style={styles.avalVazio}>
              <Ionicons name="star-half-outline" size={36} color={Colors.Primary} style={{ opacity: 0.5 }} />
              <Text style={styles.avalVazioText}>Nenhuma avaliação recebida ainda</Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carouselScroll}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_ITEM_W);
                  setActiveAvalIndex(idx);
                }}
                scrollEventThrottle={16}
              >
                {avaliacoesRecentes.map((av) => (
                  <TouchableOpacity
                    key={av.id}
                    style={[styles.carouselItem, { width: CAROUSEL_ITEM_W }]}
                    onPress={() => setAvaliacaoDetalhe(av)}
                    activeOpacity={0.8}
                  >
                    {(() => {
                      const somenteEstrelas = !av.comentario && !(av.tags && av.tags.length > 0);
                      return somenteEstrelas ? (
                        <View style={styles.avalItemInner}>
                          <View style={styles.avaliacaoHeader}>
                            <View />
                            <Text style={styles.avaliacaoData}>
                              {new Date(av.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </Text>
                          </View>
                          <View style={styles.avalItemInnerCentrado}>
                            <Estrelinhas nota={av.nota} size={28} />
                          </View>
                          <View style={styles.avalVerMais}>
                            <Text style={styles.avalVerMaisText}>Ver detalhes</Text>
                            <Ionicons name="chevron-forward" size={11} color={Colors.Primary} />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.avalItemInner}>
                          <View style={styles.avaliacaoHeader}>
                            <Estrelinhas nota={av.nota} />
                            <Text style={styles.avaliacaoData}>
                              {new Date(av.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </Text>
                          </View>

                          <Text style={styles.avaliacaoResumo} numberOfLines={2}>
                            {av.comentario ? `"${av.comentario}"` : ''}
                          </Text>

                          {av.tags && av.tags.length > 0 && (
                            <View style={styles.avaliacaoTags}>
                              {av.tags.slice(0, 3).map((t) => (
                                <View key={t} style={styles.avaliacaoTag}>
                                  <Text style={styles.avaliacaoTagText}>{t}</Text>
                                </View>
                              ))}
                              {av.tags.length > 3 && (
                                <Text style={styles.avaliacaoTagMais}>+{av.tags.length - 3}</Text>
                              )}
                            </View>
                          )}

                          <View style={styles.avalVerMais}>
                            <Text style={styles.avalVerMaisText}>Ver detalhes</Text>
                            <Ionicons name="chevron-forward" size={11} color={Colors.Primary} />
                          </View>
                        </View>
                      );
                    })()}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {avaliacoesRecentes.length > 1 && (
                <View style={styles.carouselDots}>
                  {avaliacoesRecentes.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeAvalIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Passageiro + Social lado a lado ───────────────── */}
        <View style={styles.dualRow}>
          {/* Passageiro */}
          <View style={[styles.actionsSection, styles.dualBlock]}>
            <Text style={styles.sectionHeader}>Passageiro</Text>
            <MiniActionItem
              icon="car-outline"
              label="Minhas caronas"
              badge={aprovacoesNaoVistas + caronasComEmbarcados.length + caronasComMensagemNova.length + negativosNaoVistos}
              onPress={() => {
                marcarSolicitacoesVistas();
                marcarAprovacoesVistas();
                router.push('/minhas-solicitacoes');
              }}
              last
            />
          </View>

          {/* Social */}
          <View style={[styles.actionsSection, styles.dualBlock]}>
            <Text style={styles.sectionHeader}>Social</Text>
            <MiniActionItem
              icon="earth-outline"
              label="Comunidade"
              badge={amizadesPendentes}
              onPress={() => router.push('/comunidade')}
              last
            />
          </View>
        </View>

        {/* ── Bloco Motorista (largura total) ───────────────── */}
        {user.tipo === 'MOTORISTA' && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionHeader}>Motorista</Text>
            <ActionItem
              icon="car-sport-outline"
              label="Meus veículos"
              onPress={() => router.push('/perfil/veiculo')}
            />
            <ActionItem
              icon="map-outline"
              label="Minhas rotinas"
              onPress={() => router.push('/perfil/corridas')}
              last
            />
          </View>
        )}

        {user.instituicao && (
          <View style={styles.card}>
            <View style={styles.instRow}>
              <View style={styles.instIconWrap}>
                <Ionicons name="school" size={22} color={Colors.Primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.instNome} numberOfLines={2}>{user.instituicao.nome}</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        onLogout={async () => {
          setSidebarVisible(false);
          await logout();
          router.replace('/(auth)/login');
        }}
        shareProfile={user.username ? { username: user.username, nome: user.nome } : undefined}
        onShowShare={() => setShowShare(true)}
      >
        <SidebarItem
          icon="person-outline"
          label="Editar perfil"
          onPress={() => { setSidebarVisible(false); router.push('/perfil/editar'); }}
        />
      </Sidebar>

      {/* Modal — compartilhar perfil */}
      <Modal visible={showShare && !!user?.username} transparent animationType="fade" onRequestClose={() => setShowShare(false)}>
        <View style={styles.sidebarConfirmOverlay} pointerEvents="auto">
          <View style={styles.sidebarConfirmCard}>
            <TouchableOpacity style={styles.sidebarShareClose} onPress={() => setShowShare(false)}>
              <Ionicons name="close" size={22} color={Colors.TextMuted} />
            </TouchableOpacity>
            <Text style={styles.sidebarConfirmTitle}>Compartilhar perfil</Text>
            <Text style={[styles.sidebarConfirmMsg, { color: Colors.Primary, fontWeight: '600', marginBottom: 20 }]}>
              @{user?.username}
            </Text>
            <View style={styles.sidebarQrWrap}>
              <QRCode
                value={`uniride://perfil/${user?.username}`}
                size={160}
                color={Colors.Primary}
                backgroundColor="#fff"
              />
            </View>
            <View style={styles.sidebarLinkBox}>
              <Ionicons name="link-outline" size={14} color={Colors.TextMuted} />
              <Text style={styles.sidebarLinkText} numberOfLines={1}>
                uniride://perfil/{user?.username}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sidebarShareBtn}
              onPress={async () => {
                try {
                  await Share.share({
                    message: `Confira o perfil de ${user?.nome} no UniRide!\nuniride://perfil/${user?.username}`,
                    title: `Perfil de ${user?.nome}`,
                  });
                } catch {}
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.sidebarShareBtnText}>Compartilhar link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom sheet — opções foto */}
      <BottomSheet
        visible={fotoSheetVisible}
        onClose={() => setFotoSheetVisible(false)}
        containerStyle={styles.sheetContainer}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetBotoes}>
          <TouchableOpacity
            style={styles.fotoBtn}
            onPress={() => { setFotoSheetVisible(false); setFotoModalVisible(true); }}
          >
            <Ionicons name="eye-outline" size={36} color={Colors.Primary} />
            <Text style={styles.fotoBtnText}>Ver foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fotoBtn}
            onPress={() => { setFotoSheetVisible(false); abrirPickerFoto(); }}
          >
            <Ionicons name="image-outline" size={36} color={Colors.Primary} />
            <Text style={styles.fotoBtnText}>Alterar foto</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Modal fullscreen — ver foto */}
      <Modal visible={fotoModalVisible} transparent animationType="fade" onRequestClose={() => setFotoModalVisible(false)}>
        <View style={styles.fotoModalOverlay}>
          <TouchableOpacity style={styles.fotoModalClose} onPress={() => setFotoModalVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {user?.fotoPerfilUrl && (
            <Image source={{ uri: user.fotoPerfilUrl }} style={styles.fotoModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Modal — detalhe da avaliação (avaliador anônimo) */}
      <Modal
        visible={!!avaliacaoDetalhe}
        transparent
        animationType="fade"
        onRequestClose={() => setAvaliacaoDetalhe(null)}
      >
        <Pressable style={styles.avalDetalheOverlay} onPress={() => setAvaliacaoDetalhe(null)}>
          <Pressable style={styles.avalDetalheCard} onPress={() => {}}>
            <View style={styles.avalDetalheIconWrap}>
              <Ionicons name="star" size={28} color="#FFD700" />
            </View>

            <View style={styles.avalDetalheStarsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name="star"
                  size={26}
                  color={n <= (avaliacaoDetalhe?.nota ?? 0) ? '#FFD700' : '#E0E0E0'}
                />
              ))}
            </View>

            <Text style={styles.avalDetalheNota}>
              {avaliacaoDetalhe?.nota}/5
            </Text>

            <Text style={styles.avalDetalheData}>
              {avaliacaoDetalhe
                ? new Date(avaliacaoDetalhe.criadoEm).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })
                : ''}
            </Text>

            {avaliacaoDetalhe?.comentario ? (
              <Text style={styles.avalDetalheComentario}>
                "{avaliacaoDetalhe.comentario}"
              </Text>
            ) : null}

            {avaliacaoDetalhe?.tags && avaliacaoDetalhe.tags.length > 0 && (
              <View style={styles.avalDetalheTags}>
                {avaliacaoDetalhe.tags.map((t) => (
                  <View key={t} style={styles.avalDetalheTag}>
                    <Text style={styles.avalDetalheTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.avalDetalheAnonRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.TextMuted} />
              <Text style={styles.avalDetalheAnonText}>Avaliador anônimo</Text>
            </View>

            <TouchableOpacity
              style={styles.avalDetalheFechar}
              onPress={() => setAvaliacaoDetalhe(null)}
              activeOpacity={0.75}
            >
              <Text style={styles.avalDetalheFecharText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {alertModal}
    </SafeAreaView>
  );
}

const SIDEBAR_WIDTH = 280;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:   { flexGrow: 1, padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noUserText: { color: Colors.TextMuted, fontSize: 16 },

  // ── Header + botão menu
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarUsername: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.Text,
  },
  menuFloatBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Cabeçalho
  avatarSection: {
    flexDirection: 'row', alignItems: 'stretch', gap: 12,
  },
  avatarLeft: {
    alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  avatarOuterWrapper: {
    width: AVATAR_WRAPPER, height: AVATAR_WRAPPER,
    alignItems: 'center', justifyContent: 'center',
  },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(123,47,190,0.1)',
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 2,
  },
  mediaInline: {
    fontSize: 12,
    color: Colors.TextMuted,
    fontWeight: '500',
  },
  tipoInline: {
    fontSize: 12,
    color: Colors.TextMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  notaInline: {
    fontSize: 12,
    color: Colors.TextMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  bioInline: {
    fontSize: 13,
    color: Colors.TextMuted,
    lineHeight: 19,
    marginTop: 14,
    marginHorizontal: 4,
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: AVATAR_PHOTO, height: AVATAR_PHOTO, borderRadius: AVATAR_PHOTO / 2,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  avatarImage:   { width: AVATAR_PHOTO, height: AVATAR_PHOTO, borderRadius: AVATAR_PHOTO / 2 },
  avatarInitial: { fontSize: Math.round(AVATAR_PHOTO * 0.42), color: '#fff', fontWeight: '700' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.Primary, borderWidth: 2, borderColor: Colors.Surface,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: 4 },
  userName:   { fontSize: 18, fontWeight: '800', color: Colors.Text, textAlign: 'center' },
  userHandle: { fontSize: 13, color: Colors.Primary, fontWeight: '600' },
  tipoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.PrimaryLight + '22', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.PrimaryLight,
  },
  tipoBadgeText: { color: Colors.Primary, fontSize: 12, fontWeight: '600' },
  statsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  statInlineItem: { flex: 1, alignItems: 'center' },
  statInlineValue: { fontSize: 16, fontWeight: '800', color: Colors.Text },
  statInlineLabel: { fontSize: 11, color: Colors.TextMuted, fontWeight: '500' },
  statInlineSep: {
    width: 1, height: 24, backgroundColor: Colors.SurfaceLight,
  },
  ratingRow: { marginTop: 6 },
  ratingCard: {
    backgroundColor: Colors.Surface,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Stats rápidas
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.Surface, borderRadius: 16, marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  statItemBorder: { borderLeftWidth: 1, borderLeftColor: Colors.SurfaceLight },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.Primary },
  statLabel: { fontSize: 11, color: Colors.TextMuted, fontWeight: '600', marginTop: 2 },

  // ── Cards info
  card: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.Primary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.Text },
  cardText:  { fontSize: 14, color: Colors.TextMuted, lineHeight: 20 },
  preferenciasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  preferenciaBadge: {
    backgroundColor: Colors.PrimaryLight + '22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.PrimaryLight,
  },
  preferenciaBadgeText: { fontSize: 12, color: Colors.Primary, fontWeight: '600' },

  // ── Instituição
  instRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  instIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.PrimaryLight + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.PrimaryLight + '44',
  },
  instNome: {
    fontSize: 14, fontWeight: '700', color: Colors.Text, lineHeight: 20, marginBottom: 6,
  },
  instMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  instSiglaBadge: {
    backgroundColor: Colors.Primary + '18', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.Primary + '33',
  },
  instSiglaText: { fontSize: 11, fontWeight: '700', color: Colors.Primary },
  instLocalText: { fontSize: 12, color: Colors.TextMuted },

  // ── Avaliações (carrossel)
  avalCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  avalMediaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFD70018', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FFD70044',
  },
  avalMediaValor: { fontSize: 13, fontWeight: '700', color: Colors.Text },
  avalMediaCount: { fontSize: 11, color: Colors.TextMuted },
  avalVazio: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
  },
  avalVazioText: { fontSize: 13, color: Colors.TextMuted, textAlign: 'center' },
  carouselScroll: {},
  carouselItem: { paddingVertical: 2 },
  avalItemInner: {
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(123,47,190,0.08)',
    height: 160,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  avalItemInnerCentrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avaliacaoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avaliacaoData:   { fontSize: 11, color: Colors.TextMuted },
  avaliacaoResumo: {
    fontSize: 13, color: Colors.Text, fontStyle: 'italic', lineHeight: 19, minHeight: 38,
  },
  avaliacaoTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avaliacaoTag: {
    backgroundColor: Colors.PrimaryLight + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.PrimaryLight,
  },
  avaliacaoTagText: { fontSize: 11, color: Colors.Primary, fontWeight: '600' },
  avaliacaoTagMais: { fontSize: 11, color: Colors.TextMuted, alignSelf: 'center' },
  avalVerMais: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  avalVerMaisText: { fontSize: 11, color: Colors.Primary, fontWeight: '600' },
  carouselDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(123,47,190,0.15)',
  },
  dotActive: {
    backgroundColor: Colors.Primary,
    width: 20, borderRadius: 3,
  },

  // ── Modal detalhe avaliação
  avalDetalheOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  avalDetalheCard: {
    width: '100%', backgroundColor: Colors.Surface,
    borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  avalDetalheIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFD70018',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avalDetalheStarsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  avalDetalheNota: {
    fontSize: 13, fontWeight: '700', color: Colors.TextMuted, marginBottom: 4,
  },
  avalDetalheData: { fontSize: 12, color: Colors.TextMuted, marginBottom: 16 },
  avalDetalheComentario: {
    fontSize: 15, color: Colors.Text, fontStyle: 'italic',
    lineHeight: 22, textAlign: 'center', marginBottom: 16,
  },
  avalDetalheTags: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginBottom: 16,
  },
  avalDetalheTag: {
    backgroundColor: Colors.PrimaryLight + '22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.PrimaryLight,
  },
  avalDetalheTagText: { fontSize: 12, color: Colors.Primary, fontWeight: '600' },
  avalDetalheAnonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20,
  },
  avalDetalheAnonText: { fontSize: 12, color: Colors.TextMuted },
  avalDetalheFechar: {
    width: '100%', backgroundColor: Colors.SurfaceLight,
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  avalDetalheFecharText: { fontSize: 15, fontWeight: '700', color: Colors.TextMuted },

  // ── Seções de ação (largura total — Motorista)
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: Colors.Primary,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  actionsSection: {
    backgroundColor: Colors.Surface, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
  },
  actionItemLast: { borderBottomWidth: 0 },
  actionIcon:     { textAlign: 'center' },
  actionText:     { flex: 1, fontSize: 15, color: Colors.Text, fontWeight: '500' },

  // ── Duo row (Passageiro + Social lado a lado)
  dualRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  dualBlock: {
    flex: 1,
    marginBottom: 12,
  },

  // ── Mini action item (para blocos lado a lado)
  miniActionItem: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
  },
  miniActionItemLast: { borderBottomWidth: 0 },
  miniActionText: {
    fontSize: 12, color: Colors.Text, fontWeight: '500',
    textAlign: 'center', marginTop: 2,
  },

  // Badge de notificação
  badgeDot: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF6B00',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },


  // ── Modal foto
  fotoModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  fotoModalClose: {
    position: 'absolute', top: 52, right: 20,
    zIndex: 10, padding: 8,
  },
  fotoModalImage: { width: '100%', height: '80%' },

  // ── Bottom sheet foto
  sheetContainer: {
    backgroundColor: Colors.Surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.SurfaceLight,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetBotoes: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingHorizontal: 24, paddingVertical: 20,
  },
  fotoBtn: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.SurfaceLight, borderRadius: 16,
    paddingVertical: 20, gap: 8,
  },
  fotoBtnText: {
    fontSize: 13, color: Colors.Text, fontWeight: '600', textAlign: 'center',
  },

  // ── Banner
  bannerAnalise: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#FFD54F',
  },
  bannerAnaliseTexto: { fontSize: 13, color: '#795548', lineHeight: 18, textAlign: 'center' },

  // ── Sidebar
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebarPanel: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.Surface,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
    marginBottom: 8,
  },
  sidebarTitle: { fontSize: 17, fontWeight: '700', color: Colors.Text },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
  },
  sidebarItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.PrimaryLight + '22',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  sidebarItemText: { flex: 1, fontSize: 15, color: Colors.Text, fontWeight: '500' },

  // Logout fixo no fundo da sidebar
  sidebarLogoutArea: {
    borderTopWidth: 1,
    borderTopColor: Colors.SurfaceLight,
    paddingTop: 8,
  },
  sidebarLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sidebarLogoutText: {
    fontSize: 15,
    color: Colors.Error,
    fontWeight: '600',
  },

  sidebarShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.Primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 13, width: '100%',
  },
  sidebarShareBtnText: {
    color: '#fff', fontSize: 15, fontWeight: '700',
  },
  sidebarShareClose: {
    position: 'absolute', top: 12, right: 12, padding: 4,
  },
  sidebarQrWrap: {
    padding: 16, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  sidebarLinkBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.SurfaceLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, width: '100%',
  },
  sidebarLinkText: {
    flex: 1, fontSize: 12, color: Colors.TextMuted,
  },

  sidebarConfirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  sidebarConfirmCard: {
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
  sidebarConfirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sidebarConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.Text,
    textAlign: 'center',
    marginBottom: 8,
  },
  sidebarConfirmMsg: {
    fontSize: 14,
    color: Colors.TextMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  sidebarConfirmBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  sidebarConfirmBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sidebarConfirmBtnCancel: {
    backgroundColor: Colors.SurfaceLight,
  },
  sidebarConfirmBtnDestructive: {
    backgroundColor: Colors.Error,
  },
  sidebarConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TextLight,
  },
  sidebarConfirmBtnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TextMuted,
  },
});
