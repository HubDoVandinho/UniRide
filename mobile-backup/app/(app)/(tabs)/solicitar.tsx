import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import {
  Animated,
  Easing,
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { TimePicker } from '@/components/ui/TimePicker';
import { useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { amizadeService } from '@/services/amizade.service';
import { participanteService } from '@/services/participante.service';
import { useAuthStore } from '@/stores/auth.store';
import { CaronaResponse, EnderecoResponse } from '@/types/api.types';
import { BottomSheet } from '@/components/ui/BottomSheet';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarEnderecoSalvo(e: EnderecoResponse): string {
  return [e.rua, e.numero, e.bairro, e.cidade, e.estado].filter(Boolean).join(', ');
}

function labelEnderecoSalvo(e: EnderecoResponse): string {
  return e.nome ?? formatarEnderecoSalvo(e);
}

function formatarData(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const isoHoje = hoje.toISOString().split('T')[0];
  const isoAmanha = amanha.toISOString().split('T')[0];
  if (iso === isoHoje) return 'Hoje';
  if (iso === isoAmanha) return 'Amanhã';
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${diasSemana[d.getDay()]}, ${day} ${meses[month - 1]}`;
}

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  municipality?: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

function pontoRota(s: string): string { return s.split(' — ')[0].trim(); }
function isoParaBR(iso: string): string { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

function formatarSugestao(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name;
  const rua = a.road
    ? (a.house_number ? `${a.road}, ${a.house_number}` : a.road)
    : null;
  const bairro = a.suburb || a.neighbourhood || null;
  const cidade = a.city || a.town || a.municipality || null;
  const partes = [rua, bairro, cidade].filter(Boolean);
  return partes.length ? partes.join(' — ') : r.display_name;
}

async function geocodificarTexto(texto: string, contexto?: string): Promise<NominatimResult[]> {
  const query = contexto ? `${texto}, ${contexto}` : texto;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=br`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'UniRide/1.0 (uniride@contato.com)' } });
  if (!res.ok) return [];
  return res.json();
}

async function geocodificarNativo(texto: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const results = await Location.geocodeAsync(texto);
    if (results.length > 0) return { lat: results[0].latitude, lng: results[0].longitude };
  } catch {}
  return null;
}

async function geocodificarNominatim(
  rua: string, numero: string, bairro: string, cidade: string, estado: string, cep?: string,
): Promise<{ lat: number; lng: number } | null> {
  const street = [rua, numero].filter(Boolean).join(' ');

  try {
    const params = new URLSearchParams({ format: 'json', street, city: cidade, state: estado, country: 'Brazil', countrycodes: 'br', limit: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'pt-BR' } });
    if (res.ok) {
      const json: NominatimResult[] = await res.json();
      if (json.length > 0) return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
    }
  } catch {}

  if (cep) {
    try {
      const params = new URLSearchParams({ format: 'json', postalcode: cep, country: 'Brazil', countrycodes: 'br', limit: '1' });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'pt-BR' } });
      if (res.ok) {
        const json: NominatimResult[] = await res.json();
        if (json.length > 0) return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
      }
    } catch {}
  }

  try {
    const q = [street, bairro, cidade, estado, 'Brasil'].filter(Boolean).join(', ');
    const params = new URLSearchParams({ format: 'json', q, limit: '1', countrycodes: 'br' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'pt-BR' } });
    if (res.ok) {
      const json: NominatimResult[] = await res.json();
      if (json.length > 0) return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
    }
  } catch {}

  return null;
}

async function geocodificarEnderecoSalvo(e: EnderecoResponse): Promise<{ lat: number; lng: number } | null> {
  const texto = [e.rua, e.numero, e.cidade, e.estado, 'Brasil'].filter(Boolean).join(', ');
  const nativo = await geocodificarNativo(texto);
  if (nativo) return nativo;
  return geocodificarNominatim(e.rua, e.numero ?? '', e.bairro, e.cidade, e.estado, e.cep);
}

// ── Tipos locais ──────────────────────────────────────────────────────────────

type CaronaComMotorista = CaronaResponse & { motoristaNome: string; motoristaId: number };

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function SolicitarScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();

  const [caronas, setCaronas] = useState<CaronaComMotorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [solicitando, setSolicitando] = useState<number | null>(null);

  // Animações do swap
  const swapRotation  = useRef(new Animated.Value(0)).current;
  const swapDeg       = useRef(0);
  const camposOpacity = useRef(new Animated.Value(1)).current;
  const camposScaleY  = useRef(new Animated.Value(1)).current;
  const animando      = useRef(false);

  // Busca com dois campos: faculdade (fixo) + endereço livre + direção
  type DirecaoBusca = 'IDA' | 'VOLTA'; // IDA = livre→faculdade | VOLTA = faculdade→livre
  const [direcaoBusca, setDirecaoBusca] = useState<DirecaoBusca>('IDA');
  const [enderecoLivreTexto, setEnderecoLivreTexto] = useState('');
  const [enderecoLivreLat, setEnderecoLivreLat] = useState<number | null>(null);
  const [enderecoLivreLng, setEnderecoLivreLng] = useState<number | null>(null);
  const [enderecoLivreLabel, setEnderecoLivreLabel] = useState<string | null>(null);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [sugestoesDestino, setSugestoesDestino] = useState<NominatimResult[]>([]);
  const [inputFocado, setInputFocado] = useState(false);
  const [geocodificandoSalvo, setGeocodificandoSalvo] = useState(false);
  const [enderecosSalvos, setEnderecosSalvos] = useState<EnderecoResponse[]>([]);
  // compat aliases usados no useFocusEffect e no refresh
  const destinoLat = enderecoLivreLat;
  const destinoLng = enderecoLivreLng;

  // Filtros locais
  const [filtroModalVisible, setFiltroModalVisible] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerValue, setTimePickerValue] = useState(new Date());

  // Modal de solicitação
  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [caronaSelecionada, setCaronaSelecionada] = useState<CaronaComMotorista | null>(null);
  const [enderecoDestino, setEnderecoDestino] = useState('');
  const [mensagemSolicitacao, setMensagemSolicitacao] = useState('');
  const [latDestino, setLatDestino] = useState<number | null>(null);
  const [lngDestino, setLngDestino] = useState<number | null>(null);

  // Autocomplete dentro do modal
  const [modalEnderecoTexto, setModalEnderecoTexto] = useState('');
  const [modalSugestoes, setModalSugestoes] = useState<NominatimResult[]>([]);
  const [modalBuscando, setModalBuscando] = useState(false);
  const modalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Busca de sugestões do campo livre (com debounce) ──────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enderecoInputRef = useRef<TextInput>(null);

  const buscarSugestoesLivre = useCallback(async (texto: string) => {
    if (texto.trim().length < 3) { setSugestoesDestino([]); return; }
    setBuscandoSugestoes(true);
    setSugestoesDestino([]);
    try {
      const contexto = user?.instituicao ? `${user.instituicao.cidade}, ${user.instituicao.estado}` : undefined;
      const res = await geocodificarTexto(texto.trim(), contexto);
      setSugestoesDestino(res);
    } catch {
      setSugestoesDestino([]);
    } finally {
      setBuscandoSugestoes(false);
    }
  }, [user]);

  const enderecosSalvosFiltrados = useMemo(() => {
    if (!enderecoLivreTexto.trim()) return enderecosSalvos;
    const q = enderecoLivreTexto.toLowerCase().trim();
    return enderecosSalvos.filter((e) =>
      (e.nome ?? '').toLowerCase().includes(q) ||
      formatarEnderecoSalvo(e).toLowerCase().includes(q)
    );
  }, [enderecosSalvos, enderecoLivreTexto]);

  const onChangeEnderecoLivre = useCallback((t: string) => {
    setEnderecoLivreTexto(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (t.trim().length === 0) { setSugestoesDestino([]); return; }
    debounceRef.current = setTimeout(() => buscarSugestoesLivre(t), 400);
  }, [buscarSugestoesLivre]);

  const selecionarSugestaoLivre = useCallback((s: NominatimResult) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setEnderecoLivreLat(lat);
    setEnderecoLivreLng(lng);
    // Usa o texto digitado pelo usuário (preserva número do imóvel que o Nominatim omite)
    setEnderecoLivreLabel(enderecoLivreTexto.trim() || formatarSugestao(s));
    setEnderecoLivreTexto('');
    setSugestoesDestino([]);
    setInputFocado(false);
    buscarCaronas(lat, lng, direcaoBusca);
  }, [buscarCaronas, direcaoBusca, enderecoLivreTexto]);

  // Confirma o texto digitado diretamente (return key / botão buscar).
  // Tenta geocodificar via geocodificador nativo (Google Maps) primeiro para maior
  // precisão; cai no Nominatim se o nativo falhar; se ambos falharem, busca sem filtro geo.
  const confirmarEnderecoLivre = useCallback(async () => {
    const texto = enderecoLivreTexto.trim();
    if (!texto) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSugestoesDestino([]);
    setInputFocado(false);
    setGeocodificandoSalvo(true);
    try {
      // 1. Geocodificador nativo (mais preciso — mesmo usado ao salvar endereços)
      const nativo = await geocodificarNativo(texto);
      if (nativo) {
        setEnderecoLivreLat(nativo.lat);
        setEnderecoLivreLng(nativo.lng);
        setEnderecoLivreLabel(texto);
        setEnderecoLivreTexto('');
        buscarCaronas(nativo.lat, nativo.lng, direcaoBusca);
        return;
      }
      // 2. Fallback Nominatim com contexto de cidade/estado
      const contexto = user?.instituicao ? `${user.instituicao.cidade}, ${user.instituicao.estado}` : undefined;
      const res = await geocodificarTexto(texto, contexto);
      if (res.length > 0) {
        const lat = parseFloat(res[0].lat);
        const lng = parseFloat(res[0].lon);
        setEnderecoLivreLat(lat);
        setEnderecoLivreLng(lng);
        setEnderecoLivreLabel(texto);
        setEnderecoLivreTexto('');
        buscarCaronas(lat, lng, direcaoBusca);
      } else {
        showAlert(
          'Endereço não localizado',
          'Não foi possível obter as coordenadas deste endereço. Selecione uma sugestão da lista ou tente um endereço mais completo (ex: Rua, número, cidade).',
        );
      }
    } catch {
      showAlert('Erro', 'Não foi possível processar o endereço. Tente novamente.');
    } finally {
      setGeocodificandoSalvo(false);
    }
  }, [enderecoLivreTexto, user, buscarCaronas, direcaoBusca]);

  const selecionarEnderecoSalvo = useCallback(async (e: EnderecoResponse) => {
    const label = formatarEnderecoSalvo(e);
    setSugestoesDestino([]);
    setInputFocado(false);

    // Se o endereço já tem coordenadas, usa direto sem geocodificar
    if (e.lat != null && e.lng != null) {
      setEnderecoLivreLat(e.lat);
      setEnderecoLivreLng(e.lng);
      setEnderecoLivreLabel(label);
      setEnderecoLivreTexto('');
      buscarCaronas(e.lat, e.lng, direcaoBusca);
      return;
    }

    setEnderecoLivreTexto('');
    setGeocodificandoSalvo(true);
    const result = await geocodificarEnderecoSalvo(e);
    setGeocodificandoSalvo(false);
    if (result) {
      setEnderecoLivreLat(result.lat);
      setEnderecoLivreLng(result.lng);
      setEnderecoLivreLabel(label);
      buscarCaronas(result.lat, result.lng, direcaoBusca);
    } else {
      showAlert('Endereço não localizado', 'Não foi possível encontrar as coordenadas desse endereço. Tente digitar manualmente.');
      setEnderecoLivreTexto(label);
    }
  }, [buscarCaronas, direcaoBusca, showAlert]);

  const limparEnderecoLivre = () => {
    setEnderecoLivreLat(null);
    setEnderecoLivreLng(null);
    setEnderecoLivreLabel(null);
    setEnderecoLivreTexto('');
    setSugestoesDestino([]);
    setCaronas([]);
  };

  const editarEnderecoLivre = () => {
    setEnderecoLivreTexto(enderecoLivreLabel ?? '');
    setEnderecoLivreLabel(null);
    setInputFocado(true);
    setTimeout(() => enderecoInputRef.current?.focus(), 50);
  };

  const trocarDirecao = () => {
    if (animando.current) return;
    animando.current = true;

    const nova: DirecaoBusca = direcaoBusca === 'IDA' ? 'VOLTA' : 'IDA';
    swapDeg.current += 180;

    // Ícone gira (independente)
    Animated.spring(swapRotation, {
      toValue: swapDeg.current,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();

    // Campos: encolhem e somem → estado troca → crescem e aparecem
    Animated.parallel([
      Animated.timing(camposOpacity, { toValue: 0,   duration: 110, easing: Easing.ease, useNativeDriver: true }),
      Animated.timing(camposScaleY,  { toValue: 0.85, duration: 110, easing: Easing.ease, useNativeDriver: true }),
    ]).start(() => {
      setDirecaoBusca(nova);
      setSugestoesDestino([]);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(camposOpacity, { toValue: 1, duration: 130, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(camposScaleY,  { toValue: 1, duration: 130, easing: Easing.ease, useNativeDriver: true }),
        ]).start(() => { animando.current = false; });
        if (enderecoLivreLat != null && enderecoLivreLng != null) {
          buscarCaronas(enderecoLivreLat, enderecoLivreLng, nova);
        }
      }, 0);
    });
  };

  // ── Busca de caronas ───────────────────────────────────────────────────────

  const buscarCaronas = useCallback(async (lat?: number, lng?: number, direcao?: 'IDA' | 'VOLTA') => {
    setLoading(true);
    console.log('[Solicitar] buscarCaronas lat=', lat, 'lng=', lng, 'direcao=', direcao);
    try {
      const lista = await caronaService.buscarPorDestino(lat ?? null, lng ?? null, direcao ?? null);
      console.log('[Solicitar] resposta backend:', lista.length, 'caronas');

      let caronasValidas = (lista as CaronaResponse[]).filter(
        (c) => c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA'
      );
      console.log('[Solicitar] após filtro status:', caronasValidas.length);

      try {
        const minhasSolic = await caronaService.listarMinhasSolicitacoes();
        const caronasAtivas = new Set(
          minhasSolic
            .filter((s) => s.status === 'PENDENTE' || s.status === 'APROVADA')
            .map((s) => s.caronaId)
        );
        caronasValidas = caronasValidas.filter((c) => !caronasAtivas.has(c.id));
        console.log('[Solicitar] após filtro solicitações ativas:', caronasValidas.length);
      } catch { /* silencia */ }

      const idsUnicos = [...new Set(caronasValidas.map((c) => c.motoristaId))];
      const perfis = await Promise.allSettled(idsUnicos.map((id) => amizadeService.perfilPublico(id)));
      const nomeMap: Record<number, string> = {};
      perfis.forEach((r, i) => {
        if (r.status === 'fulfilled') nomeMap[idsUnicos[i]] = r.value.nome;
      });

      const comMotorista: CaronaComMotorista[] = caronasValidas.map((c) => ({
        ...c,
        motoristaNome: nomeMap[c.motoristaId] ?? `Motorista #${c.motoristaId}`,
        motoristaId: c.motoristaId,
      }));

      setCaronas(comMotorista);
    } catch (e) {
      console.error('[Solicitar] erro ao buscar caronas:', e);
      showAlert('Erro', 'Não foi possível carregar as caronas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setInputFocado(false);
    participanteService.listarEnderecos().then(setEnderecosSalvos).catch(() => {});
    if (enderecoLivreLat != null && enderecoLivreLng != null) {
      buscarCaronas(enderecoLivreLat, enderecoLivreLng, direcaoBusca);
    }
  }, [buscarCaronas, enderecoLivreLat, enderecoLivreLng, direcaoBusca]));

  // ── Polling 30s ────────────────────────────────────────────────────────────

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSilencioso = useCallback(async () => {
    if (enderecoLivreLat == null || enderecoLivreLng == null) return;
    try {
      const lista = await caronaService.buscarPorDestino(enderecoLivreLat, enderecoLivreLng, direcaoBusca ?? null);
      let caronasValidas = (lista as CaronaComMotorista[]).filter(
        (c) => c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA'
      );
      try {
        const minhasSolic = await caronaService.listarMinhasSolicitacoes();
        const ativas = new Set(
          minhasSolic.filter((s) => s.status === 'PENDENTE' || s.status === 'APROVADA').map((s) => s.caronaId)
        );
        caronasValidas = caronasValidas.filter((c) => !ativas.has(c.id));
      } catch { /* silent */ }
      const idsUnicos = [...new Set(caronasValidas.map((c) => c.motoristaId))];
      const perfis = await Promise.allSettled(idsUnicos.map((id) => amizadeService.perfilPublico(id)));
      const nomeMap: Record<number, string> = {};
      perfis.forEach((r, i) => { if (r.status === 'fulfilled') nomeMap[idsUnicos[i]] = r.value.nome; });
      setCaronas(caronasValidas.map((c) => ({ ...c, motoristaNome: nomeMap[c.motoristaId] ?? `Motorista #${c.motoristaId}` })));
    } catch { /* silent */ }
  }, [enderecoLivreLat, enderecoLivreLng, direcaoBusca]);

  useEffect(() => {
    pollingRef.current = setInterval(refreshSilencioso, 5_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollingRef.current = setInterval(refreshSilencioso, 5_000);
      } else {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    });
    return () => {
      sub.remove();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refreshSilencioso]);

  // ── Filtros locais ─────────────────────────────────────────────────────────

  const caronasFiltradas = caronas.filter((c) => {
    const iso = typeof c.data === 'string' ? c.data : String(c.data);
    if (filtroData && iso !== filtroData) return false;
    if (filtroHora && !c.horarioSaida.startsWith(filtroHora)) return false;
    return true;
  });

  const filtrosAtivos = (filtroData ? 1 : 0) + (filtroHora ? 1 : 0);
  const limparFiltros = () => { setFiltroData(''); setFiltroHora(''); };

  // ── Autocomplete do modal ──────────────────────────────────────────────────

  const onChangeModalEndereco = useCallback((t: string) => {
    setModalEnderecoTexto(t);
    if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
    if (t.trim().length < 3) { setModalSugestoes([]); return; }
    modalDebounceRef.current = setTimeout(async () => {
      setModalBuscando(true);
      try {
        const contexto = user?.instituicao ? `${user.instituicao.cidade}, ${user.instituicao.estado}` : undefined;
        const res = await geocodificarTexto(t.trim(), contexto);
        setModalSugestoes(res);
      } catch {
        setModalSugestoes([]);
      } finally {
        setModalBuscando(false);
      }
    }, 450);
  }, [user]);

  const selecionarSugestaoModal = useCallback((s: NominatimResult) => {
    // Usa o texto digitado (preserva número do imóvel), cai no label formatado só se vazio
    setEnderecoDestino(modalEnderecoTexto.trim() || formatarSugestao(s));
    setLatDestino(parseFloat(s.lat));
    setLngDestino(parseFloat(s.lon));
    setModalEnderecoTexto('');
    setModalSugestoes([]);
  }, [modalEnderecoTexto]);

  // ── Modal solicitação — geocoding ──────────────────────────────────────────

  const abrirModalSolicitar = async (carona: CaronaComMotorista) => {
    setCaronaSelecionada(carona);
    setMensagemSolicitacao('');
    setModalEnderecoTexto('');
    setModalSugestoes([]);
    // Pré-preenche com o endereço já digitado na busca
    if (enderecoLivreLabel && enderecoLivreLat != null && enderecoLivreLng != null) {
      setEnderecoDestino(enderecoLivreLabel);
      setLatDestino(enderecoLivreLat);
      setLngDestino(enderecoLivreLng);
    } else {
      setEnderecoDestino('');
      setLatDestino(null);
      setLngDestino(null);
    }
    setModalSolicitar(true);
  };

  const confirmarSolicitacao = async () => {
    if (!caronaSelecionada) return;
    if (!enderecoDestino.trim()) {
      showAlert('Campo obrigatório', 'Informe o endereço de destino para continuar.');
      return;
    }
    const id = caronaSelecionada.id;
    setModalSolicitar(false);
    setSolicitando(id);
    try {
      await caronaService.solicitarVaga(id, {
        enderecoDestino: enderecoDestino.trim(),
        mensagem: mensagemSolicitacao.trim() || undefined,
        latDestino: latDestino ?? undefined,
        lngDestino: lngDestino ?? undefined,
      });
      showAlert('Solicitação enviada!', 'Aguarde a confirmação do motorista.');
      setCaronas((prev) => prev.filter((c) => c.id !== id));
    } catch (error: unknown) {
      showAlert('Erro', error instanceof Error ? error.message : 'Não foi possível solicitar a carona.');
    } finally {
      setSolicitando(null);
      setCaronaSelecionada(null);
    }
  };

  // ── Render card ────────────────────────────────────────────────────────────

  const renderCarona = ({ item }: { item: CaronaComMotorista }) => {
    const iso = typeof item.data === 'string' ? item.data : String(item.data);
    return (
      <View style={styles.card}>
        <View style={styles.cardMeta}>
          <View style={styles.dataBadge}>
            <Text style={styles.dataText}>{formatarData(iso)}</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/perfil/[id]', params: { id: item.motoristaId, nome: item.motoristaNome } })
            }
          >
            <Text style={styles.motoristaNome}>{item.motoristaNome} ›</Text>
          </TouchableOpacity>
        </View>

        {item.nome && <Text style={styles.caronaNome}>{item.nome}</Text>}
        <Text style={styles.rota}>{pontoRota(item.origem)} → {pontoRota(item.destino)}</Text>

        <View style={styles.detalhesRow}>
          <View style={styles.detalhePair}>
            <Ionicons name="time-outline" size={13} color={Colors.TextMuted} />
            <Text style={styles.detalhe}>{item.horarioSaida.slice(0, 5)}</Text>
          </View>
          <View style={styles.detalhePair}>
            <Ionicons name="people-outline" size={13} color={Colors.TextMuted} />
            <Text style={styles.detalhe}>{item.vagasDisponiveis} vaga{item.vagasDisponiveis !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {(item.veiculoMarca || item.veiculoModelo || item.veiculoTipo) && (
          <View style={[styles.detalhePair, { marginBottom: 10 }]}>
            <Ionicons name="car-outline" size={13} color={Colors.TextMuted} />
            <Text style={styles.detalhe}>
              {[item.veiculoMarca, item.veiculoModelo, item.veiculoTipo].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}

        {item.valorSugerido != null && (
          <View style={styles.valorChip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="cash-outline" size={14} color={Colors.Primary} />
              <Text style={styles.valorChipText}>
                R$ {item.valorSugerido.toFixed(2)}
                <Text style={styles.valorChipLabel}> /integrante se você entrar</Text>
              </Text>
            </View>
            {item.custoTotal != null && (
              <Text style={styles.valorChipEst}>Total: R$ {item.custoTotal.toFixed(2)}</Text>
            )}
          </View>
        )}

        {item.observacoes && (
          <Text style={styles.cardObs}>"{item.observacoes}"</Text>
        )}

        <Button
          title="Solicitar vaga"
          onPress={() => abrirModalSolicitar(item)}
          variant="primary"
          loading={solicitando === item.id}
          disabled={item.vagasDisponiveis === 0}
          style={styles.solicitarBtn}
        />
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Solicitar carona</Text>
          <TouchableOpacity
            style={[styles.filtroBtn, filtrosAtivos > 0 && styles.filtroBtnAtivo]}
            onPress={() => setFiltroModalVisible(true)}
          >
            <Ionicons name="options-outline" size={14} color={filtrosAtivos > 0 ? '#fff' : Colors.TextMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.filtroBtnText, filtrosAtivos > 0 && styles.filtroBtnTextAtivo]}>
              {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : 'Filtros'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Busca com dois campos + direção */}
        <View style={styles.buscaWrapper}>
        <View style={styles.buscaCard}>
          {/* Campos + botão swap à direita */}
          <View style={styles.buscaRow}>
            {/* Coluna com os dois campos */}
            <Animated.View style={[styles.buscaCampos, { opacity: camposOpacity, transform: [{ scaleY: camposScaleY }] }]}>
              {/* Campo de cima */}
              <View>
                {direcaoBusca === 'IDA' ? (
                  enderecoLivreLabel ? (
                    <View style={styles.buscaCampoSelecionado}>
                      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={editarEnderecoLivre}>
                        <Text style={[styles.buscaCampoSelecionadoTexto, { flex: 1 }]} numberOfLines={1}>{enderecoLivreLabel}</Text>
                        <Ionicons name="create-outline" size={15} color={Colors.Primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={limparEnderecoLivre} style={{ marginLeft: 6 }}>
                        <Ionicons name="close-circle" size={18} color={Colors.TextMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.buscaInputWrap}>
                      <TextInput
                        ref={enderecoInputRef}
                        style={styles.buscaInput}
                        placeholder="Rua, número"
                        placeholderTextColor="#999"
                        value={enderecoLivreTexto}
                        onChangeText={onChangeEnderecoLivre}
                        autoCapitalize="sentences"
                        returnKeyType="search"
                        onSubmitEditing={confirmarEnderecoLivre}
                        onFocus={() => setInputFocado(true)}
                        onBlur={() => setTimeout(() => setInputFocado(false), 200)}
                      />
                      {(buscandoSugestoes || geocodificandoSalvo) && (
                        <ActivityIndicator size="small" color={Colors.Primary} style={{ marginRight: 6 }} />
                      )}
                    </View>
                  )
                ) : (
                  <View style={styles.buscaCampoFixo}>
                    <Text style={styles.buscaCampoFixoTexto} numberOfLines={1}>
                      {user?.instituicao?.nome ?? 'Faculdade'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.buscaSeparador} />

              {/* Campo de baixo */}
              <View>
                {direcaoBusca === 'IDA' ? (
                  <View style={styles.buscaCampoFixo}>
                    <Text style={styles.buscaCampoFixoTexto} numberOfLines={1}>
                      {user?.instituicao?.nome ?? 'Faculdade'}
                    </Text>
                  </View>
                ) : (
                  enderecoLivreLabel ? (
                    <View style={styles.buscaCampoSelecionado}>
                      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={editarEnderecoLivre}>
                        <Text style={[styles.buscaCampoSelecionadoTexto, { flex: 1 }]} numberOfLines={1}>{enderecoLivreLabel}</Text>
                        <Ionicons name="create-outline" size={15} color={Colors.Primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={limparEnderecoLivre} style={{ marginLeft: 6 }}>
                        <Ionicons name="close-circle" size={18} color={Colors.TextMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.buscaInputWrap}>
                      <TextInput
                        ref={enderecoInputRef}
                        style={styles.buscaInput}
                        placeholder="Rua, número"
                        placeholderTextColor="#999"
                        value={enderecoLivreTexto}
                        onChangeText={onChangeEnderecoLivre}
                        autoCapitalize="sentences"
                        returnKeyType="search"
                        onSubmitEditing={confirmarEnderecoLivre}
                        onFocus={() => setInputFocado(true)}
                        onBlur={() => setTimeout(() => setInputFocado(false), 200)}
                      />
                      {(buscandoSugestoes || geocodificandoSalvo) && (
                        <ActivityIndicator size="small" color={Colors.Primary} style={{ marginRight: 6 }} />
                      )}
                    </View>
                  )
                )}
              </View>
            </Animated.View>

            {/* Botão swap — sempre à direita, centralizado */}
            <TouchableOpacity style={styles.buscaSwapBtn} onPress={trocarDirecao}>
              <Animated.View style={{ transform: [{ rotate: swapRotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
                extrapolate: 'extend',
              }) }] }}>
                <Ionicons name="swap-vertical" size={20} color={Colors.Primary} />
              </Animated.View>
            </TouchableOpacity>
          </View>


        </View>
        </View>

        {/* Dropdown unificado: endereços salvos + Nominatim */}
        {inputFocado && (
          enderecosSalvosFiltrados.length > 0 ||
          sugestoesDestino.length > 0 ||
          (buscandoSugestoes && enderecoLivreTexto.trim().length >= 3)
        ) && (
          <View style={[styles.sugestoesCard, { maxHeight: 260, zIndex: 20, elevation: 20 }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {/* Meus endereços */}
              {enderecosSalvosFiltrados.length > 0 && (
                <>
                  <View style={styles.sugestaoSalvoHeader}>
                    <Ionicons name="bookmark-outline" size={12} color={Colors.TextMuted} />
                    <Text style={styles.sugestaoSalvoHeaderTexto}>Meus endereços</Text>
                  </View>
                  {enderecosSalvosFiltrados.map((e) => (
                    <TouchableOpacity key={e.id} style={styles.sugestaoDestinoItem} onPress={() => selecionarEnderecoSalvo(e)}>
                      <Ionicons name="home-outline" size={14} color={Colors.Primary} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: Colors.Text, fontWeight: '600', lineHeight: 18 }} numberOfLines={1}>
                          {labelEnderecoSalvo(e)}
                        </Text>
                        {e.nome ? (
                          <Text style={{ fontSize: 12, color: Colors.TextMuted, lineHeight: 17 }} numberOfLines={1}>
                            {formatarEnderecoSalvo(e)}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Resultados Nominatim */}
              {enderecoLivreTexto.trim().length >= 3 && (
                <>
                  {enderecosSalvosFiltrados.length > 0 && (sugestoesDestino.length > 0 || buscandoSugestoes) && (
                    <View style={styles.sugestaoSalvoHeader}>
                      <Ionicons name="search-outline" size={12} color={Colors.TextMuted} />
                      <Text style={styles.sugestaoSalvoHeaderTexto}>Resultados da busca</Text>
                    </View>
                  )}
                  {buscandoSugestoes && (
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={Colors.Primary} />
                    </View>
                  )}
                  {sugestoesDestino.map((s, i) => (
                    <TouchableOpacity key={i} style={styles.sugestaoDestinoItem} onPress={() => selecionarSugestaoLivre(s)}>
                      <Ionicons name="location-outline" size={14} color={Colors.Primary} style={{ marginTop: 1 }} />
                      <Text style={styles.sugestaoDestinoText} numberOfLines={2}>{formatarSugestao(s)}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* Contador de resultados */}
        {enderecoLivreLabel && !loading && caronas.length > 0 && (
          <Text style={styles.resultadosLabel}>
            {caronasFiltradas.length} carona{caronasFiltradas.length !== 1 ? 's' : ''} encontrada{caronasFiltradas.length !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Conteúdo */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.Primary} size="large" />
            <Text style={styles.loadingText}>Buscando caronas...</Text>
          </View>
        ) : !enderecoLivreLabel ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Informe seu endereço</Text>
            <Text style={styles.emptySubtitle}>
              Digite e selecione seu endereço de {direcaoBusca === 'IDA' ? 'saída' : 'chegada'} para ver as caronas disponíveis.
            </Text>
          </View>
        ) : caronas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhuma carona encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Não há caronas com destino nessa área. Tente outro endereço ou volte mais tarde.
            </Text>
          </View>
        ) : caronasFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.Primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nenhum resultado</Text>
            <Text style={styles.emptySubtitle}>Tente remover ou ajustar os filtros aplicados.</Text>
            <TouchableOpacity style={styles.clearBtn} onPress={limparFiltros}>
              <Text style={styles.clearBtnText}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={caronasFiltradas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCarona}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            onRefresh={() => buscarCaronas(enderecoLivreLat ?? undefined, enderecoLivreLng ?? undefined, direcaoBusca)}
            refreshing={loading}
          />
        )}
      </View>

      {/* ── BottomSheet filtros ───────────────────────────── */}
      <BottomSheet visible={filtroModalVisible} onClose={() => setFiltroModalVisible(false)}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitulo}>Filtrar caronas</Text>

        <Text style={styles.filterLabel}>Data</Text>
        <TouchableOpacity style={styles.filterInput} onPress={() => setCalendarVisible(true)}>
          <Text style={filtroData ? styles.filterInputText : styles.filterInputPlaceholder}>
            {filtroData ? isoParaBR(filtroData) : 'Selecionar data'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={Colors.TextMuted} />
        </TouchableOpacity>
        {calendarVisible && (
          <View style={styles.calendarWrap}>
            <Calendar
              onDayPress={(day: { dateString: string }) => {
                setFiltroData(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={filtroData ? { [filtroData]: { selected: true, selectedColor: Colors.Primary } } : {}}
              theme={{ todayTextColor: Colors.Primary, arrowColor: Colors.Primary, selectedDayBackgroundColor: Colors.Primary }}
            />
          </View>
        )}

        <Text style={styles.filterLabel}>Horário</Text>
        <TouchableOpacity style={styles.filterInput} onPress={() => setTimePickerVisible(true)}>
          <Text style={filtroHora ? styles.filterInputText : styles.filterInputPlaceholder}>
            {filtroHora ? filtroHora : 'Selecionar horário'}
          </Text>
          <Ionicons name="time-outline" size={18} color={Colors.TextMuted} />
        </TouchableOpacity>
        <TimePicker
          visible={timePickerVisible}
          value={timePickerValue}
          title="Filtrar por horário"
          onConfirm={(date) => {
            setTimePickerValue(date);
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            setFiltroHora(`${h}:${m}`);
          }}
          onClose={() => setTimePickerVisible(false)}
        />

        <View style={styles.modalRodape}>
          <TouchableOpacity style={styles.limparBtn} onPress={() => { limparFiltros(); setFiltroModalVisible(false); }}>
            <Text style={styles.limparBtnText}>Limpar</Text>
          </TouchableOpacity>
          <Button title="Aplicar" onPress={() => setFiltroModalVisible(false)} variant="primary" style={styles.aplicarBtn} />
        </View>
      </BottomSheet>

      {/* ── BottomSheet solicitação ───────────────────────── */}
      <BottomSheet visible={modalSolicitar} onClose={() => setModalSolicitar(false)} containerStyle={{ maxHeight: '92%', padding: 0 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitulo}>Solicitar vaga</Text>
            {caronaSelecionada && (
              <Text style={styles.modalSubtitulo}>
                {caronaSelecionada.nome ?? `${pontoRota(caronaSelecionada.origem)} → ${pontoRota(caronaSelecionada.destino)}`}
              </Text>
            )}

            {caronaSelecionada?.valorSugerido != null && (
              <View style={styles.modalCustoCard}>
                <Ionicons name="cash-outline" size={16} color={Colors.Primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCustoValor}>
                    R$ {caronaSelecionada.valorSugerido.toFixed(2)}
                    <Text style={styles.modalCustoLabel}> /integrante</Text>
                  </Text>
                  <Text style={styles.modalCustoNota}>
                    Calculado com seu endereço · dividido entre motorista e passageiros
                  </Text>
                </View>
              </View>
            )}

            {/* Endereço de destino */}
            <Text style={styles.labelObrigatorio}>Seu endereço de embarque</Text>

            {enderecoDestino ? (
              <View style={styles.enderecoChip}>
                <Ionicons name="location" size={16} color={Colors.Primary} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.enderecoChipTexto}>{enderecoDestino}</Text>
                  {latDestino == null && (
                    <Text style={{ fontSize: 11, color: '#FF9800', marginTop: 2 }}>
                      Sem coordenadas — não aparecerá na rota do motorista
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.modalInputRow}>
                  <TextInput
                    style={styles.modalEnderecoInput}
                    placeholder="Ex: Rua das Flores, 123"
                    placeholderTextColor="#999"
                    value={modalEnderecoTexto}
                    onChangeText={onChangeModalEndereco}
                    autoCapitalize="sentences"
                    returnKeyType="search"
                  />
                  {modalBuscando && (
                    <ActivityIndicator size="small" color={Colors.Primary} style={{ marginRight: 8 }} />
                  )}
                </View>
                <Text style={styles.enderecoHintSmall}>
                  Inclua o número da rua para aparecer como ponto de embarque na rota do motorista.
                </Text>
                {modalSugestoes.length > 0 && (
                  <View style={styles.modalSugestoesBox}>
                    {modalSugestoes.map((s, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.modalSugestaoItem, i < modalSugestoes.length - 1 && styles.modalSugestaoItemBorder]}
                        onPress={() => selecionarSugestaoModal(s)}
                      >
                        <Ionicons name="location-outline" size={14} color={Colors.Primary} style={{ marginTop: 1, flexShrink: 0 }} />
                        <Text style={styles.modalSugestaoText} numberOfLines={2}>{formatarSugestao(s)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Mensagem */}
            <Text style={[styles.labelOpcional, { marginTop: 12 }]}>Mensagem (opcional)</Text>
            <TextInput
              style={[styles.inputEndereco, styles.inputMensagem]}
              placeholder="Ex: Serei pontual, pode me aguardar na entrada..."
              placeholderTextColor="#999"
              value={mensagemSolicitacao}
              onChangeText={setMensagemSolicitacao}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalRodape}>
              <TouchableOpacity onPress={() => setModalSolicitar(false)} style={styles.limparBtn}>
                <Text style={styles.limparBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <Button title="Confirmar" onPress={confirmarSolicitacao} variant="primary" style={styles.aplicarBtn} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
      {alertModal}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.SurfaceLight },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 28 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.Primary },
  subtitle: { fontSize: 13, color: Colors.TextMuted, marginBottom: 14 },

  // Busca dois campos
  buscaWrapper: {
    zIndex: 10,
  },
  buscaCard: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1.5, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  buscaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buscaCampos: { flex: 1, gap: 0 },
  buscaSeparador: { height: 1, backgroundColor: '#EBEBEB', marginVertical: 4 },
  buscaCampoFixo: {
    backgroundColor: Colors.SurfaceLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  buscaCampoFixoTexto: { fontSize: 14, color: Colors.Text, fontWeight: '500' },
  buscaSwapBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.Primary + '15',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  buscaInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.SurfaceLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 2,
  },
  buscaInput: { flex: 1, fontSize: 14, color: Colors.Text, paddingVertical: 8 },
  buscaCampoSelecionado: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.Primary + '12', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  buscaCampoSelecionadoTexto: { flex: 1, fontSize: 13, color: Colors.Primary, fontWeight: '600' },

  sugestoesCard: {
    backgroundColor: Colors.Surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  sugestaoDestinoItem: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'flex-start',
  },
  sugestaoDestinoText: { flex: 1, fontSize: 13, color: Colors.Text, lineHeight: 18 },
  sugestaoSalvoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.SurfaceLight,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  sugestaoSalvoHeaderTexto: { fontSize: 11, fontWeight: '700', color: Colors.TextMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Contador e filtros
  resultadosLabel: { fontSize: 13, color: Colors.TextMuted, fontWeight: '500', marginBottom: 10 },
  filtroBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.TextMuted,
  },
  filtroBtnAtivo:     { backgroundColor: Colors.Primary, borderColor: Colors.Primary },
  filtroBtnText:      { fontSize: 13, fontWeight: '600', color: Colors.TextMuted },
  filtroBtnTextAtivo: { color: '#fff' },

  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { color: Colors.TextMuted, marginTop: 12, fontSize: 14 },
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: Colors.Primary, marginBottom: 8, textAlign: 'center' },
  emptySubtitle:{ fontSize: 14, color: Colors.TextMuted, textAlign: 'center', paddingHorizontal: 28, marginBottom: 20 },
  clearBtn: {
    backgroundColor: Colors.Primary, borderRadius: 25, paddingHorizontal: 24, paddingVertical: 12,
  },
  clearBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  list: { gap: 14, paddingBottom: 20 },

  // Cards
  card: {
    backgroundColor: Colors.Surface, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dataBadge:   { backgroundColor: Colors.Primary + '18', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  dataText:    { color: Colors.Primary, fontSize: 12, fontWeight: '700' },
  motoristaNome:{ color: Colors.Primary, fontSize: 13, fontWeight: '600' },
  caronaNome:  { fontSize: 14, fontWeight: '700', color: Colors.Primary, marginBottom: 2 },
  rota:        { fontSize: 16, fontWeight: '700', color: Colors.Text, marginBottom: 8 },
  detalhesRow: { flexDirection: 'row', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
  detalhePair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detalhe:     { fontSize: 13, color: Colors.TextMuted, fontWeight: '500' },

  valorChip:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 12, backgroundColor: Colors.Primary + '12', borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 6 },
  valorChipText:  { fontSize: 14, fontWeight: '700', color: Colors.Primary },
  valorChipLabel: { fontSize: 12, fontWeight: '500', color: Colors.Primary },
  valorChipEst:   { fontSize: 11, color: Colors.TextMuted },

  modalCustoCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                     backgroundColor: Colors.Primary + '10', borderRadius: 10,
                     padding: 12, marginBottom: 16 },
  modalCustoValor: { fontSize: 15, fontWeight: '700', color: Colors.Primary },
  modalCustoLabel: { fontSize: 12, fontWeight: '500', color: Colors.Primary },
  modalCustoNota:  { fontSize: 11, color: Colors.TextMuted, marginTop: 2 },
  cardObs:     { fontSize: 13, fontStyle: 'italic', color: Colors.TextMuted, marginTop: 4, marginBottom: 12 },
  solicitarBtn:{ minHeight: 44, paddingVertical: 10 },

  // Modais
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  modalTitulo:    { fontSize: 18, fontWeight: '800', color: Colors.Primary, marginBottom: 6 },
  modalSubtitulo: { fontSize: 13, color: Colors.TextMuted, marginBottom: 16, lineHeight: 19 },

  // Filtros
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.Text, marginBottom: 6 },
  filterInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 16, backgroundColor: Colors.SurfaceLight,
  },
  filterInputText:        { fontSize: 15, color: Colors.Text, flex: 1 },
  filterInputPlaceholder: { fontSize: 15, color: '#999', flex: 1 },
  calendarWrap: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: '#ddd' },
  modalRodape: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  limparBtn:   { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD' },
  limparBtnText:{ fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
  aplicarBtn:  { flex: 1, minHeight: 46 },


  // Modal solicitação / geocoding
  labelObrigatorio: { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 8 },
  labelOpcional:    { fontSize: 13, fontWeight: '600', color: Colors.TextMuted, marginTop: 10, marginBottom: 6 },
  inputEndereco: {
    backgroundColor: Colors.SurfaceLight, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.Text, marginBottom: 8,
  },
  inputMensagem:{ minHeight: 72, textAlignVertical: 'top' },

  enderecoHint: { fontSize: 13, color: Colors.TextMuted, fontStyle: 'italic', marginBottom: 8 },
  enderecoHintSmall: { fontSize: 12, color: Colors.TextMuted, marginTop: 4, marginBottom: 6, lineHeight: 16 },

  // Chip de endereço pré-preenchido
  enderecoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.Primary + '12', borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.Primary + '40',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  enderecoChipTexto: { fontSize: 13, color: Colors.Text, lineHeight: 18 },
  enderecoChipClear: { padding: 2 },

  // Autocomplete do modal
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.SurfaceLight, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 2,
    marginBottom: 0,
  },
  modalEnderecoInput: { flex: 1, fontSize: 14, color: Colors.Text, paddingVertical: 10 },
  modalSugestoesBox: {
    borderWidth: 1, borderColor: '#EEE', borderRadius: 12,
    overflow: 'hidden', marginTop: 6, backgroundColor: Colors.Surface,
  },
  modalSugestaoItem: {
    flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start',
  },
  modalSugestaoItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalSugestaoText: { flex: 1, fontSize: 13, color: Colors.Text, lineHeight: 18 },

});
