import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from '@/stores/auth.store';
import { useAppAlert } from '@/hooks/useAppAlert';
import { CaronaResponse, MensagemResponse, SolicitacaoResponse } from '@/types/api.types';
import { useNotificationStore } from '@/stores/notification.store';

const STATUS_PAG_LABEL: Record<string, string> = {
  COMPROVANTE_ENVIADO: 'Comprovante enviado — aguardando confirmação do motorista',
  PAGO_CONFIRMADO: 'Pagamento confirmado pelo motorista',
};

const STATUS_PAG_COLOR: Record<string, string> = {
  COMPROVANTE_ENVIADO: '#FF9800',
  PAGO_CONFIRMADO: Colors.Success,
};

export default function ChatScreen() {
  const router = useRouter();
  const { caronaId } = useLocalSearchParams<{ caronaId: string }>();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const { marcarChatVisto } = useNotificationStore();
  const isMotorista = user?.tipo === 'MOTORISTA';
  const cId = Number(caronaId);

  const [mensagens, setMensagens] = useState<MensagemResponse[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoResponse[]>([]);
  const [carona, setCarona] = useState<CaronaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [imagemFullscreen, setImagemFullscreen] = useState<string | null>(null);
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const [enviandoPix, setEnviandoPix] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minhaSolicitacao = !isMotorista
    ? solicitacoes.find(s => s.caronaId === cId)
    : undefined;

  const carregar = useCallback(async () => {
    try {
      const [msgs, sols] = await Promise.all([
        caronaService.listarMensagens(cId),
        isMotorista
          ? caronaService.listarPorCarona(cId)
          : caronaService.listarMinhasSolicitacoes(),
      ]);
      setMensagens(msgs);
      setSolicitacoes(sols);
    } catch {
      // silent em background polling
    }
  }, [cId, isMotorista]);

  const carregarInicial = useCallback(async () => {
    setLoading(true);
    try {
      const [, caronaData] = await Promise.all([
        carregar(),
        caronaService.buscarPorId(cId),
      ]);
      setCarona(caronaData);
    } catch {
      // ignora erro de carona — UI ainda funciona
    }
    setLoading(false);
  }, [carregar, cId]);

  useEffect(() => { carregarInicial(); }, [carregarInicial]);

  useEffect(() => {
    intervalRef.current = setInterval(carregar, 3_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [carregar]);

  useEffect(() => {
    if (mensagens.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [mensagens.length]);

  // Marca todas as mensagens como lidas sempre que a lista atualiza (chat está aberto)
  useEffect(() => {
    if (mensagens.length === 0) return;
    const visiveis = mensagens.filter((m) => m.tipo !== 'PIX_KEY');
    const ultimoId = visiveis.length > 0 ? Math.max(...visiveis.map((m) => m.id)) : 0;
    marcarChatVisto(cId, ultimoId);
  }, [mensagens, cId, marcarChatVisto]);

  const enviarTexto = async () => {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setTexto('');
    setEnviando(true);
    try {
      const nova = await caronaService.enviarMensagem(cId, { tipo: 'TEXTO', conteudo });
      setMensagens(prev => [...prev, nova]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar a mensagem.');
      setTexto(conteudo);
    } finally {
      setEnviando(false);
    }
  };

  const enviarComprovante = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('Permissão necessária', 'Permita o acesso à galeria para enviar o comprovante.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.4,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setEnviando(true);
    try {
      const nova = await caronaService.enviarMensagem(cId, {
        tipo: 'COMPROVANTE',
        imagemBase64: `data:image/jpeg;base64,${result.assets[0].base64}`,
      });
      setMensagens(prev => [...prev, nova]);
      await carregar();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar o comprovante.');
    } finally {
      setEnviando(false);
    }
  };

  const handleConfirmarPagamento = async (sol: SolicitacaoResponse) => {
    setConfirmando(sol.id);
    try {
      await caronaService.confirmarPagamento(sol.id);
      await carregar();
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível confirmar o pagamento.');
    } finally {
      setConfirmando(null);
    }
  };

  const enviarPixKey = async () => {
    const chave = pixInput.trim();
    if (!chave || enviandoPix) return;
    setEnviandoPix(true);
    try {
      const nova = await caronaService.enviarMensagem(cId, { tipo: 'PIX_KEY', conteudo: chave });
      setMensagens(prev => [...prev, nova]);
      setPixModalVisible(false);
      setPixInput('');
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível definir a chave PIX.');
    } finally {
      setEnviandoPix(false);
    }
  };

  const copiarPix = (chave: string) => {
    Clipboard.setString(chave);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  };

  const getSolicitacaoPorPassageiro = (passageiroId: number) =>
    solicitacoes.find(s => s.passageiroId === passageiroId);

  const statusPag = minhaSolicitacao?.statusPagamento;
  const caronaConcluida = carona?.status === 'CONCLUIDA';
  const headerTitle = carona?.nome ?? 'Chat da carona';
  const pixKeyMsg   = mensagens.filter(m => m.tipo === 'PIX_KEY').at(-1) ?? null;
  const pixKeyAtiva = pixKeyMsg?.conteudo ?? carona?.pixKey ?? null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Chat da carona</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        {isMotorista && !caronaConcluida ? (
          <TouchableOpacity onPress={() => setPixModalVisible(true)} style={styles.pixHeaderBtn}>
            <Ionicons name="key-outline" size={20} color={Colors.Primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 30 }} />
        )}
      </View>

      {/* Banner de status de pagamento (só passageiro) */}
      {!isMotorista && statusPag && statusPag !== 'PENDENTE' && (
        <View style={[
          styles.statusBanner,
          { backgroundColor: STATUS_PAG_COLOR[statusPag] + '20', borderColor: STATUS_PAG_COLOR[statusPag] },
        ]}>
          <Ionicons
            name={statusPag === 'PAGO_CONFIRMADO' ? 'checkmark-circle' : 'time-outline'}
            size={15}
            color={STATUS_PAG_COLOR[statusPag]}
          />
          <Text style={[styles.statusBannerText, { color: STATUS_PAG_COLOR[statusPag] }]}>
            {STATUS_PAG_LABEL[statusPag]}
          </Text>
        </View>
      )}

      {/* Banner PIX fixado */}
      {pixKeyAtiva && (isMotorista || statusPag !== 'PAGO_CONFIRMADO') && (
        <View style={styles.pixBanner}>
          <Ionicons name="key-outline" size={14} color={Colors.Primary} />
          <Text style={styles.pixBannerKey} numberOfLines={1}>{pixKeyAtiva}</Text>
          <TouchableOpacity onPress={() => copiarPix(pixKeyAtiva)} style={styles.pixCopyBtn}>
            <Ionicons name={pixCopiado ? 'checkmark' : 'copy-outline'} size={15} color={Colors.Primary} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {mensagens.length === 0 && (
            <Text style={styles.vazio}>
              {'Nenhuma mensagem ainda.\n'}
              {!isMotorista
                ? 'Envie o comprovante de pagamento ou tire dúvidas com o motorista.'
                : 'Aguardando mensagens dos passageiros.'}
            </Text>
          )}

          {mensagens.filter(m => m.tipo !== 'PIX_KEY').map(msg => {
            const isMe = msg.remetenteId === user?.id;
            const sol = isMotorista && !isMe
              ? getSolicitacaoPorPassageiro(msg.remetenteId)
              : undefined;
            const statusPagMsg = sol?.statusPagamento;

            return (
              <View
                key={msg.id}
                style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}
              >
                {!isMe && (
                  <View style={styles.avatar}>
                    {msg.fotoRemetente
                      ? <Image source={{ uri: msg.fotoRemetente }} style={styles.avatarImg} />
                      : <Text style={styles.avatarText}>
                          {(msg.nomeRemetente ?? 'U').charAt(0).toUpperCase()}
                        </Text>
                    }
                  </View>
                )}

                <View style={[
                  styles.msgBubble,
                  isMe ? styles.msgBubbleMe : styles.msgBubbleOther,
                ]}>
                  {!isMe && msg.nomeRemetente && (
                    <Text style={styles.msgNome}>{msg.nomeRemetente}</Text>
                  )}

                  {msg.tipo === 'TEXTO' && (
                    <Text style={[styles.msgTexto, isMe && styles.msgTextoMe]}>
                      {msg.conteudo}
                    </Text>
                  )}

                  {msg.tipo === 'COMPROVANTE' && msg.imagemBase64 && (
                    <View>
                      <Text style={[styles.msgComprovanteLbl, isMe && { color: '#ffffffcc' }]}>
                        Comprovante de pagamento
                      </Text>
                      <TouchableOpacity onPress={() => setImagemFullscreen(msg.imagemBase64!)} activeOpacity={0.9}>
                        <Image
                          source={{ uri: msg.imagemBase64 }}
                          style={styles.msgImagem}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={[styles.msgHora, isMe && styles.msgHoraMe]}>
                    {new Date(msg.criadoEm).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>

                  {/* Confirmar pagamento (motorista, em mensagens COMPROVANTE de passageiros) */}
                  {isMotorista && !isMe && msg.tipo === 'COMPROVANTE' && (
                    statusPagMsg === 'COMPROVANTE_ENVIADO' ? (
                      <TouchableOpacity
                        style={styles.confirmarBtn}
                        onPress={() => sol && handleConfirmarPagamento(sol)}
                        disabled={confirmando === sol?.id}
                        activeOpacity={0.8}
                      >
                        {confirmando === sol?.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <>
                              <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                              <Text style={styles.confirmarBtnText}>Confirmar recebimento</Text>
                            </>
                        }
                      </TouchableOpacity>
                    ) : statusPagMsg === 'PAGO_CONFIRMADO' ? (
                      <View style={styles.pagoBadge}>
                        <Ionicons name="checkmark-circle" size={13} color={Colors.Success} />
                        <Text style={styles.pagoBadgeText}>Pagamento confirmado</Text>
                      </View>
                    ) : null
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Barra de input */}
        {caronaConcluida ? (
          <View style={styles.inputBarConcluida}>
            <Ionicons name="lock-closed-outline" size={15} color={Colors.TextMuted} />
            <Text style={styles.inputBarConcluidaText}>Chat encerrado — carona concluída</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            {!isMotorista && (
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={enviarComprovante}
                disabled={enviando}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={24} color={Colors.Primary} />
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.input}
              placeholder={isMotorista ? 'Chave PIX ou mensagem...' : 'Mensagem...'}
              placeholderTextColor="#999"
              value={texto}
              onChangeText={setTexto}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
              onPress={enviarTexto}
              disabled={!texto.trim() || enviando}
              activeOpacity={0.8}
            >
              {enviando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal chave PIX (motorista) */}
      <Modal visible={pixModalVisible} transparent animationType="slide" onRequestClose={() => setPixModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPixModalVisible(false)}>
          <View style={styles.pixModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.pixModalHandle} />
            <Text style={styles.pixModalTitle}>Chave PIX</Text>
            {pixKeyAtiva && (
              <Text style={styles.pixModalSub} numberOfLines={1}>
                Atual: {pixKeyAtiva}
              </Text>
            )}
            <TextInput
              style={styles.pixModalInput}
              placeholder="Digite a chave PIX..."
              placeholderTextColor="#999"
              value={pixInput}
              onChangeText={setPixInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.pixModalBtn, (!pixInput.trim() || enviandoPix) && { opacity: 0.5 }]}
              onPress={enviarPixKey}
              disabled={!pixInput.trim() || enviandoPix}
              activeOpacity={0.85}
            >
              {enviandoPix
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.pixModalBtnText}>{pixKeyAtiva ? 'Atualizar chave' : 'Definir chave PIX'}</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen image viewer */}
      <Modal visible={!!imagemFullscreen} transparent animationType="fade" onRequestClose={() => setImagemFullscreen(null)}>
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setImagemFullscreen(null)} activeOpacity={0.8}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {imagemFullscreen && (
            <Image
              source={{ uri: imagemFullscreen }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.SurfaceLight },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.Surface,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.Text },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9,
    borderBottomWidth: 1,
  },
  statusBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  messagesList:   { flex: 1 },
  messagesContent:{ padding: 16, gap: 6, paddingBottom: 12 },

  vazio: {
    textAlign: 'center', color: Colors.TextMuted,
    fontSize: 14, marginTop: 40, lineHeight: 22,
  },

  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  msgRowMe:    { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg:  { width: 32, height: 32, borderRadius: 16 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  msgBubble: {
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    maxWidth: '75%', gap: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  msgBubbleMe:    { backgroundColor: Colors.Primary, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: Colors.Surface, borderBottomLeftRadius: 4 },

  msgNome:         { fontSize: 11, fontWeight: '700', color: Colors.Primary, marginBottom: 2 },
  msgTexto:        { fontSize: 14, color: Colors.Text, lineHeight: 20 },
  msgTextoMe:      { color: '#fff' },
  msgComprovanteLbl:{ fontSize: 11, fontWeight: '600', color: Colors.TextMuted, marginBottom: 6 },
  msgImagem: {
    width: 200, height: 200, borderRadius: 10,
    backgroundColor: Colors.SurfaceLight,
  },
  msgHora:   { fontSize: 10, color: Colors.TextMuted, alignSelf: 'flex-end', marginTop: 2 },
  msgHoraMe: { color: '#ffffffaa' },

  confirmarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.Primary, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    marginTop: 6, alignSelf: 'flex-start',
  },
  confirmarBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  pagoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
  },
  pagoBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.Success },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.Surface,
    borderTopWidth: 1, borderTopColor: Colors.SurfaceLight,
  },
  inputBarConcluida: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: Colors.Surface,
    borderTopWidth: 1, borderTopColor: Colors.SurfaceLight,
  },
  inputBarConcluidaText: { fontSize: 13, color: Colors.TextMuted, fontWeight: '500' },
  attachBtn: { padding: 8, marginBottom: 2 },
  input: {
    flex: 1,
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 22, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: Colors.Text,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  pixHeaderBtn: { padding: 4, width: 30, alignItems: 'center' },

  pixBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: Colors.Primary + '10',
    borderBottomWidth: 1, borderBottomColor: Colors.Primary + '30',
  },
  pixBannerKey: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.Primary },
  pixCopyBtn: { padding: 4 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pixModalCard: {
    backgroundColor: Colors.Surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, gap: 12,
  },
  pixModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 8,
  },
  pixModalTitle: { fontSize: 16, fontWeight: '800', color: Colors.Primary, textAlign: 'center' },
  pixModalSub:   { fontSize: 13, color: Colors.TextMuted, textAlign: 'center' },
  pixModalInput: {
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.Text,
  },
  pixModalBtn: {
    backgroundColor: Colors.Primary,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  pixModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  fullscreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  fullscreenImage: {
    width: '100%', height: '80%',
  },
});
