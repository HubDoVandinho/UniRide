import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { amizadeService } from '@/services/amizade.service';
import { caronaService } from '@/services/carona.service';
import { useAppAlert } from '@/hooks/useAppAlert';
import { AvaliacaoResponse, PerfilPublicoResponse, StatusRelacaoAmizade } from '@/types/api.types';
import { ShareProfileModal } from '@/components/ui/ShareProfileModal';
import { useAuthStore } from '@/stores/auth.store';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { denunciaService, MotivoDenuncia, MOTIVOS_LABEL } from '@/services/denuncia.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_ITEM_W = SCREEN_WIDTH - 40 - 32;
const AVATAR_WRAPPER = Math.round(SCREEN_WIDTH * 0.26);
const AVATAR_PHOTO   = Math.round(AVATAR_WRAPPER * 0.69);
const STAR_CENTER    = AVATAR_WRAPPER / 2;
const STAR_RADIUS    = AVATAR_PHOTO / 2 + 10;

function Estrelinhas({ nota, size = 12 }: { nota: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size > 12 ? 4 : 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name="star" size={size} color={n <= nota ? '#FFD700' : '#DDD'} />
      ))}
    </View>
  );
}

export default function PerfilPublicoScreen() {
  const router = useRouter();
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { showAlert, alertModal } = useAppAlert();
  const { user } = useAuthStore();

  const [perfil, setPerfil]     = useState<PerfilPublicoResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const [fotoModalVisible, setFotoModalVisible] = useState(false);

  const [statusAmizade, setStatusAmizade] = useState<StatusRelacaoAmizade>('NENHUMA');
  const [amizadeId, setAmizadeId]         = useState<number | null>(null);
  const [amizadeLoading, setAmizadeLoading] = useState(false);

  const [avaliacoes, setAvaliacoes]           = useState<AvaliacaoResponse[]>([]);
  const [loadingAval, setLoadingAval]         = useState(false);
  const [activeAvalIndex, setActiveAvalIndex] = useState(0);
  const [avaliacaoDetalhe, setAvaliacaoDetalhe] = useState<AvaliacaoResponse | null>(null);

  const [denunciaSheetVisible, setDenunciaSheetVisible] = useState(false);
  const [denunciaMotivo, setDenunciaMotivo] = useState<MotivoDenuncia | null>(null);
  const [denunciaDescricao, setDenunciaDescricao] = useState('');
  const [denunciaEnviando, setDenunciaEnviando] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numericId = Number(id);
    const ehProprioPerfil = isNaN(numericId)
      ? String(id).replace('@', '') === user?.username
      : numericId === user?.id;
    if (ehProprioPerfil) {
      router.replace('/(app)/(tabs)/perfil');
      return;
    }
    const promise = isNaN(numericId)
      ? amizadeService.perfilPublicoPorUsername(String(id))
      : amizadeService.perfilPublico(numericId);
    promise
      .then((p) => { setPerfil(p); })
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!perfil) return;
    setStatusAmizade(perfil.statusAmizade ?? 'NENHUMA');
    setAmizadeId(perfil.amizadeId ?? null);
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil) return;
    setLoadingAval(true);
    caronaService.listarAvaliacoes(perfil.id)
      .then(setAvaliacoes)
      .catch(() => {})
      .finally(() => setLoadingAval(false));
  }, [perfil?.id]);

  const handleAmizade = async () => {
    if (!perfil || amizadeLoading) return;
    setAmizadeLoading(true);
    try {
      if (statusAmizade === 'NENHUMA') {
        const res = await amizadeService.enviar(perfil.id);
        setStatusAmizade('PENDENTE_ENVIADA');
        setAmizadeId(res.id);
      } else if (statusAmizade === 'PENDENTE_ENVIADA') {
        if (!amizadeId) return;
        await amizadeService.cancelar(amizadeId);
        setStatusAmizade('NENHUMA');
        setAmizadeId(null);
      }
    } catch (e: any) {
      showAlert('Erro', e?.message ?? 'Não foi possível completar a ação.');
    } finally {
      setAmizadeLoading(false);
    }
  };

  const handleAceitarAmizade = async () => {
    if (!amizadeId || amizadeLoading) return;
    setAmizadeLoading(true);
    try {
      await amizadeService.aceitar(amizadeId);
      setStatusAmizade('ACEITA');
    } catch {
      // falha silenciosa
    } finally {
      setAmizadeLoading(false);
    }
  };

  const handleRecusarAmizade = async () => {
    if (!amizadeId || amizadeLoading) return;
    setAmizadeLoading(true);
    try {
      await amizadeService.recusar(amizadeId);
      setStatusAmizade('NENHUMA');
      setAmizadeId(null);
    } catch {
      // falha silenciosa
    } finally {
      setAmizadeLoading(false);
    }
  };

  const handleRemoverAmizade = () => {
    if (!amizadeId || amizadeLoading) return;
    showAlert('Remover amigo', `Deseja remover ${perfil?.nome} da sua lista de amigos?`, [
      { text: 'Cancelar', style: 'cancel', onPress: () => {} },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setAmizadeLoading(true);
          try {
            await amizadeService.remover(amizadeId);
            setStatusAmizade('NENHUMA');
            setAmizadeId(null);
          } catch {
            // falha silenciosa
          } finally {
            setAmizadeLoading(false);
          }
        },
      },
    ]);
  };

  const handleEnviarDenuncia = async () => {
    if (!perfil || !denunciaMotivo || denunciaEnviando) return;
    setDenunciaEnviando(true);
    try {
      await denunciaService.criar({
        denunciadoId: perfil.id,
        motivo: denunciaMotivo,
        descricao: denunciaDescricao.trim() || undefined,
      });
      setDenunciaSheetVisible(false);
      setDenunciaMotivo(null);
      setDenunciaDescricao('');
      showAlert('Denúncia enviada', 'Sua denúncia foi registrada e será analisada pela equipe UniRide.');
    } catch (e: any) {
      showAlert('Erro', e?.message ?? 'Não foi possível enviar a denúncia.');
    } finally {
      setDenunciaEnviando(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (erro || !perfil) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnSolo}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.erroText}>Não foi possível carregar o perfil.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isMotorista = perfil.tipo === 'MOTORISTA';
  const inicial = (perfil.nome ?? nome ?? '?').charAt(0).toUpperCase();
  const mediaVal = avaliacoes.length > 0
    ? avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length
    : (perfil.avaliacaoMedia ?? 5);

  const avaliacoesRecentes = [...avaliacoes]
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safe}>
      {alertModal}

      {/* ── Top bar ───────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <Text style={styles.topBarUsername} numberOfLines={1}>
          {perfil.username ? `@${perfil.username}` : perfil.nome}
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.topBarBtn} onPress={() => setDenunciaSheetVisible(true)}>
          <Ionicons name="flag-outline" size={22} color={Colors.Error} />
        </TouchableOpacity>
        {perfil.username ? (
          <TouchableOpacity style={styles.topBarBtn} onPress={() => setShareVisible(true)}>
            <Ionicons name="share-social-outline" size={22} color={Colors.Primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Amizade ───────────────────────────────────────── */}
        {user && perfil.id !== user.id && statusAmizade !== 'BLOQUEADA' && (
          <View style={styles.card}>
            <View style={styles.amizadeCardRow}>

              {/* Ícone de status */}
              <View style={[
                styles.amizadeCardIconWrap,
                statusAmizade === 'ACEITA'           && styles.amizadeCardIconAceita,
                statusAmizade === 'PENDENTE_ENVIADA' && styles.amizadeCardIconPendente,
                statusAmizade === 'PENDENTE_RECEBIDA'&& styles.amizadeCardIconRecebida,
              ]}>
                <Ionicons
                  name={
                    statusAmizade === 'ACEITA'            ? 'people'             :
                    statusAmizade === 'PENDENTE_ENVIADA'  ? 'time-outline'       :
                    statusAmizade === 'PENDENTE_RECEBIDA' ? 'person-add-outline' :
                    'person-add-outline'
                  }
                  size={20}
                  color={
                    statusAmizade === 'ACEITA'            ? '#2e7d32'      :
                    statusAmizade === 'PENDENTE_ENVIADA'  ? '#795548'      :
                    statusAmizade === 'PENDENTE_RECEBIDA' ? Colors.Primary :
                    Colors.Primary
                  }
                />
              </View>

              {/* Texto */}
              <View style={styles.amizadeCardInfo}>
                <Text style={styles.amizadeCardLabel}>
                  {statusAmizade === 'ACEITA'            ? 'Vocês são amigos'                :
                   statusAmizade === 'PENDENTE_ENVIADA'  ? 'Solicitação enviada'             :
                   statusAmizade === 'PENDENTE_RECEBIDA' ? `${perfil.nome} quer ser seu amigo` :
                   'Adicionar como amigo'}
                </Text>
                {statusAmizade === 'PENDENTE_ENVIADA' && (
                  <Text style={styles.amizadeCardSub}>Aguardando resposta</Text>
                )}
              </View>

              {/* Botão direito (NENHUMA, PENDENTE_ENVIADA, ACEITA) */}
              {statusAmizade === 'NENHUMA' && (
                <TouchableOpacity style={styles.amizadeCardBtnPrimary} onPress={handleAmizade} disabled={amizadeLoading} activeOpacity={0.75}>
                  {amizadeLoading
                    ? <ActivityIndicator size={14} color="#fff" />
                    : <><Ionicons name="person-add-outline" size={14} color="#fff" /><Text style={styles.amizadeCardBtnPrimaryText}>Adicionar</Text></>}
                </TouchableOpacity>
              )}
              {statusAmizade === 'PENDENTE_ENVIADA' && (
                <TouchableOpacity style={styles.amizadeCardBtnCancel} onPress={handleAmizade} disabled={amizadeLoading} activeOpacity={0.75}>
                  {amizadeLoading
                    ? <ActivityIndicator size={14} color={Colors.Error} />
                    : <Text style={styles.amizadeCardBtnCancelText}>Cancelar</Text>}
                </TouchableOpacity>
              )}
              {statusAmizade === 'ACEITA' && (
                <TouchableOpacity style={styles.amizadeCardBtnGray} onPress={handleRemoverAmizade} disabled={amizadeLoading} activeOpacity={0.75}>
                  {amizadeLoading
                    ? <ActivityIndicator size={14} color={Colors.TextMuted} />
                    : <Text style={styles.amizadeCardBtnGrayText}>Remover</Text>}
                </TouchableOpacity>
              )}
            </View>

            {/* Botões Aceitar / Recusar (PENDENTE_RECEBIDA) */}
            {statusAmizade === 'PENDENTE_RECEBIDA' && (
              <View style={styles.amizadeCardDualRow}>
                <TouchableOpacity style={styles.amizadeCardBtnAceitar} onPress={handleAceitarAmizade} disabled={amizadeLoading} activeOpacity={0.75}>
                  {amizadeLoading
                    ? <ActivityIndicator size={14} color="#fff" />
                    : <><Ionicons name="checkmark-outline" size={15} color="#fff" /><Text style={styles.amizadeCardBtnAceitarText}>Aceitar</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.amizadeCardBtnRecusar} onPress={handleRecusarAmizade} disabled={amizadeLoading} activeOpacity={0.75}>
                  <Ionicons name="close-outline" size={15} color={Colors.Error} />
                  <Text style={styles.amizadeCardBtnRecusarText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.avatarSection}>

            <View style={styles.avatarLeft}>
              <View style={styles.avatarOuterWrapper}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const angle = (220 + i * 25) * (Math.PI / 180);
                  const x = STAR_CENTER + STAR_RADIUS * Math.cos(angle) - 7;
                  const y = STAR_CENTER + STAR_RADIUS * Math.sin(angle) - 7;
                  const opacity = Math.max(0.25, Math.min(1, Math.min(i, 4 - i) - (5 - mediaVal) / 2 + 1));
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
                <TouchableOpacity
                  style={styles.avatar}
                  onPress={() => perfil.fotoPerfil && setFotoModalVisible(true)}
                  activeOpacity={perfil.fotoPerfil ? 0.8 : 1}
                >
                  {perfil.fotoPerfil ? (
                    <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitial}>{inicial}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{perfil.nome}</Text>
              </View>

              <Text style={styles.tipoInline}>
                <Text style={{ color: Colors.Primary }}>
                  {isMotorista ? 'Motorista' : 'Passageiro'}
                </Text>
                {`  ·  Nota: ${mediaVal.toFixed(1)}`}
              </Text>

              {/* Stats — mesmo padrão do perfil próprio */}
              <View style={styles.statsInline}>
                {statusAmizade === 'ACEITA' ? (
                  <TouchableOpacity
                    style={styles.statInlineItem}
                    onPress={() => router.push({
                      pathname: '/(app)/amigos-do-perfil',
                      params: { userId: perfil.id, nome: perfil.nome },
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statInlineValue}>{perfil.totalAmigos ?? 0}</Text>
                    <Text style={styles.statInlineLabel}>amigos</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.statInlineItem}>
                    <Text style={styles.statInlineValue}>{perfil.totalAmigos ?? 0}</Text>
                    <Text style={styles.statInlineLabel}>amigos</Text>
                  </View>
                )}
                <View style={styles.statInlineSep} />
                <View style={styles.statInlineItem}>
                  <Text style={styles.statInlineValue}>{avaliacoes.length}</Text>
                  <Text style={styles.statInlineLabel}>avaliações</Text>
                </View>
              </View>

            </View>
          </View>

          {perfil.miniBiografia ? (
            <Text style={styles.bioInline}>{perfil.miniBiografia}</Text>
          ) : null}
        </View>

        {/* ── Preferências ──────────────────────────────────── */}
        {perfil.preferencias && perfil.preferencias.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Preferências</Text>
            <View style={styles.preferenciasRow}>
              {perfil.preferencias.map((p, i) => (
                <View key={i} style={styles.preferenciaBadge}>
                  <Text style={styles.preferenciaBadgeText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Avaliações (carrossel) ────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.avalCardHeader}>
            <Text style={styles.cardLabel}>Avaliações recebidas</Text>
            {avaliacoes.length > 0 && (
              <View style={styles.avalMediaBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.avalMediaValor}>{mediaVal.toFixed(1)}</Text>
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

        {/* ── Instituição ───────────────────────────────────── */}
        {perfil.instituicao ? (
          <View style={styles.card}>
            <View style={styles.instRow}>
              <View style={styles.instIconWrap}>
                <Ionicons name="school" size={22} color={Colors.Primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.instNome} numberOfLines={2}>{perfil.instituicao}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Ver agenda (motorista) ────────────────────────── */}
        {isMotorista && (
          <Button
            title="Ver agenda de caronas"
            onPress={() =>
              router.push({
                pathname: '/(app)/agenda-motorista',
                params: { motoristaId: perfil.id, motoristaNome: perfil.nome },
              })
            }
            variant="primary"
            style={{ marginTop: 4 }}
          />
        )}

      </ScrollView>

      {/* ── Modal detalhe avaliação ───────────────────────────── */}
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

            <Text style={styles.avalDetalheNota}>{avaliacaoDetalhe?.nota}/5</Text>

            <Text style={styles.avalDetalheData}>
              {avaliacaoDetalhe
                ? new Date(avaliacaoDetalhe.criadoEm).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })
                : ''}
            </Text>

            {avaliacaoDetalhe?.comentario ? (
              <Text style={styles.avalDetalheComentario}>"{avaliacaoDetalhe.comentario}"</Text>
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

      {/* Modal fullscreen — ver foto */}
      <Modal visible={fotoModalVisible} transparent animationType="fade" onRequestClose={() => setFotoModalVisible(false)}>
        <View style={styles.fotoModalOverlay}>
          <TouchableOpacity style={styles.fotoModalClose} onPress={() => setFotoModalVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {perfil.fotoPerfil && (
            <Image source={{ uri: perfil.fotoPerfil }} style={styles.fotoModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {perfil.username && (
        <ShareProfileModal
          visible={shareVisible}
          onClose={() => setShareVisible(false)}
          username={perfil.username}
          nome={perfil.nome}
        />
      )}

      {/* ── Bottom Sheet Denúncia ──────────────────────────── */}
      <BottomSheet visible={denunciaSheetVisible} onClose={() => setDenunciaSheetVisible(false)}>
        <Text style={styles.denunciaTitle}>Denunciar {perfil.nome}</Text>
        <Text style={styles.denunciaSubtitle}>Selecione o motivo:</Text>

        {(Object.keys(MOTIVOS_LABEL) as MotivoDenuncia[]).map((motivo) => (
          <TouchableOpacity
            key={motivo}
            style={[styles.denunciaMotivoBtn, denunciaMotivo === motivo && styles.denunciaMotivoBtnAtivo]}
            onPress={() => setDenunciaMotivo(motivo)}
            activeOpacity={0.75}
          >
            <Text style={[styles.denunciaMotivoText, denunciaMotivo === motivo && styles.denunciaMotivoTextAtivo]}>
              {MOTIVOS_LABEL[motivo]}
            </Text>
            {denunciaMotivo === motivo && (
              <Ionicons name="checkmark-circle" size={18} color={Colors.Primary} />
            )}
          </TouchableOpacity>
        ))}

        {denunciaMotivo && (
          <TextInput
            style={styles.denunciaInput}
            placeholder="Descrição adicional (opcional)"
            placeholderTextColor={Colors.TextMuted}
            value={denunciaDescricao}
            onChangeText={setDenunciaDescricao}
            multiline
            maxLength={500}
          />
        )}

        <Button
          title={denunciaEnviando ? 'Enviando...' : 'Enviar denúncia'}
          onPress={handleEnviarDenuncia}
          variant="primary"
          disabled={!denunciaMotivo || denunciaEnviando}
          style={styles.denunciaBtn}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:   { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  erroText: { color: Colors.TextMuted, fontSize: 15 },
  backBtnSolo: { padding: 4, margin: 16 },

  // ── Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  topBarBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  topBarUsername: { fontSize: 17, fontWeight: '700', color: Colors.Text, marginLeft: 8 },

  // ── Card base
  card: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.Primary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  cardText: { fontSize: 14, color: Colors.Text, lineHeight: 20 },

  // ── Cabeçalho
  avatarSection: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  avatarLeft: { alignItems: 'center', justifyContent: 'center' },
  avatarOuterWrapper: { width: AVATAR_WRAPPER, height: AVATAR_WRAPPER, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: AVATAR_PHOTO, height: AVATAR_PHOTO, borderRadius: AVATAR_PHOTO / 2,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  avatarImage:   { width: AVATAR_PHOTO, height: AVATAR_PHOTO, borderRadius: AVATAR_PHOTO / 2 },
  avatarInitial: { fontSize: Math.round(AVATAR_PHOTO * 0.42), color: '#fff', fontWeight: '700' },
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
    flexDirection: 'row', alignItems: 'center', marginBottom: 2,
  },
  userName:    { fontSize: 18, fontWeight: '800', color: Colors.Text, textAlign: 'center' },
  tipoInline: {
    fontSize: 12, color: Colors.TextMuted, fontWeight: '500', marginBottom: 2, textAlign: 'center',
  },
  bioInline: {
    fontSize: 13, color: Colors.TextMuted, lineHeight: 19,
    marginTop: 14, marginHorizontal: 4,
  },

  // ── Instituição
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  instIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.PrimaryLight + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.PrimaryLight + '44',
  },
  instNome: { fontSize: 14, fontWeight: '700', color: Colors.Text, lineHeight: 20 },

  // ── Preferências
  preferenciasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preferenciaBadge: {
    backgroundColor: Colors.PrimaryLight + '22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.PrimaryLight,
  },
  preferenciaBadgeText: { fontSize: 12, color: Colors.Primary, fontWeight: '600' },

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
  avalVazio: { alignItems: 'center', paddingVertical: 24, gap: 8 },
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
  avaliacaoResumo: { fontSize: 13, color: Colors.Text, fontStyle: 'italic', lineHeight: 19, minHeight: 38 },
  avaliacaoTags:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avaliacaoTag: {
    backgroundColor: Colors.PrimaryLight + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.PrimaryLight,
  },
  avaliacaoTagText: { fontSize: 11, color: Colors.Primary, fontWeight: '600' },
  avaliacaoTagMais: { fontSize: 11, color: Colors.TextMuted, alignSelf: 'center' },
  avalVerMais:     { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  avalVerMaisText: { fontSize: 11, color: Colors.Primary, fontWeight: '600' },
  carouselDots:    { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(123,47,190,0.15)' },
  dotActive: { backgroundColor: Colors.Primary, width: 20, borderRadius: 3 },

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
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avalDetalheStarsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  avalDetalheNota:     { fontSize: 13, fontWeight: '700', color: Colors.TextMuted, marginBottom: 4 },
  avalDetalheData:     { fontSize: 12, color: Colors.TextMuted, marginBottom: 16 },
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
  avalDetalheTagText:  { fontSize: 12, color: Colors.Primary, fontWeight: '600' },
  avalDetalheAnonRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  avalDetalheAnonText: { fontSize: 12, color: Colors.TextMuted },
  avalDetalheFechar: {
    width: '100%', backgroundColor: Colors.SurfaceLight,
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  avalDetalheFecharText: { fontSize: 15, fontWeight: '700', color: Colors.TextMuted },

  // ── Stats inline (espelha perfil próprio)
  statsInline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  statInlineItem: { flex: 1, alignItems: 'center' },
  statInlineValue: { fontSize: 16, fontWeight: '800', color: Colors.Text },
  statInlineLabel: { fontSize: 11, color: Colors.TextMuted, fontWeight: '500' },
  statInlineSep: { width: 1, height: 24, backgroundColor: 'rgba(123,47,190,0.12)' },

  // ── Card de amizade
  amizadeCardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  amizadeCardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.PrimaryLight + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.PrimaryLight + '44',
  },
  amizadeCardIconAceita: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  amizadeCardIconPendente: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD54F',
  },
  amizadeCardIconRecebida: {
    backgroundColor: Colors.PrimaryLight + '33',
    borderColor: Colors.PrimaryLight,
  },
  amizadeCardInfo: { flex: 1 },
  amizadeCardLabel: { fontSize: 14, fontWeight: '700', color: Colors.Text },
  amizadeCardSub:   { fontSize: 12, color: Colors.TextMuted, marginTop: 2 },

  amizadeCardBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.Primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  amizadeCardBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  amizadeCardBtnCancel: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.Error,
  },
  amizadeCardBtnCancelText: { fontSize: 13, fontWeight: '700', color: Colors.Error },

  amizadeCardBtnGray: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#CCC',
  },
  amizadeCardBtnGrayText: { fontSize: 13, fontWeight: '600', color: Colors.TextMuted },

  amizadeCardDualRow: {
    flexDirection: 'row', gap: 10, marginTop: 12,
  },
  amizadeCardBtnAceitar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#2e7d32', borderRadius: 14, paddingVertical: 11,
  },
  amizadeCardBtnAceitarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  amizadeCardBtnRecusar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: Colors.Error,
  },
  amizadeCardBtnRecusarText: { fontSize: 14, fontWeight: '700', color: Colors.Error },

  fotoModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  fotoModalClose: {
    position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8,
  },
  fotoModalImage: { width: '100%', height: '80%' },

  // ── Bottom sheet denúncia
  denunciaTitle: {
    fontSize: 18, fontWeight: '800', color: Colors.Text,
    marginBottom: 4,
  },
  denunciaSubtitle: {
    fontSize: 13, color: Colors.TextMuted, marginBottom: 14,
  },
  denunciaMotivoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E8E8',
    marginBottom: 8, backgroundColor: Colors.SurfaceLight,
  },
  denunciaMotivoBtnAtivo: {
    borderColor: Colors.Primary,
    backgroundColor: Colors.Primary + '12',
  },
  denunciaMotivoText: { fontSize: 14, color: Colors.TextMuted },
  denunciaMotivoTextAtivo: { color: Colors.Primary, fontWeight: '700' },
  denunciaInput: {
    borderWidth: 1.5, borderColor: '#E0D6F0', borderRadius: 12,
    padding: 12, fontSize: 14, color: Colors.Text,
    backgroundColor: Colors.SurfaceLight, minHeight: 80,
    textAlignVertical: 'top', marginBottom: 16, marginTop: 6,
  },
  denunciaBtn: { marginTop: 4 },
});
