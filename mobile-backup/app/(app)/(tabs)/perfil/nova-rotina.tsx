import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { TimePicker } from '@/components/ui/TimePicker';
import { useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { rotinaService } from '@/services/rotina.service';
import { participanteService } from '@/services/participante.service';
import { useAuthStore } from '@/stores/auth.store';
import { DiaSemana, EnderecoResponse, VeiculoResponse } from '@/types/api.types';
import { BottomSheet } from '@/components/ui/BottomSheet';

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'SEG', label: 'Seg' },
  { key: 'TER', label: 'Ter' },
  { key: 'QUA', label: 'Qua' },
  { key: 'QUI', label: 'Qui' },
  { key: 'SEX', label: 'Sex' },
  { key: 'SAB', label: 'Sáb' },
  { key: 'DOM', label: 'Dom' },
];

const formatarData = (iso: string) => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

function dataHojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nome:        z.string().min(2, 'Dê um nome para identificar a rotina').max(60),
  horarioSaida:z.string().min(5, 'Selecione o horário de saída'),
  dataInicio:  z.string().min(10, 'Selecione a data de início'),
  observacoes: z.string().max(300).optional(),
  pixKey:      z.string().max(150).optional(),
});

type FormData = z.infer<typeof schema>;
type Direcao  = 'IDA' | 'VOLTA';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
    town?: string;
    municipality?: string;
  };
};

type EnderecoSelecionado = {
  label: string; bairro: string; lat: number | null; lng: number | null;
  cep?: string; cidade?: string; estado?: string;
};

// ── Geocodificação ────────────────────────────────────────────────────────────
// Estratégia primária: geocodificação nativa do dispositivo (Google Maps no Android,
// Apple Maps no iOS). Não depende de rate-limits externos.
async function geocodificarNativo(texto: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const results = await Location.geocodeAsync(texto);
    if (results.length > 0) return { lat: results[0].latitude, lng: results[0].longitude };
  } catch {}
  return null;
}

// Estratégia de fallback: Nominatim (OSM). Usada quando geocodificação nativa falha.
async function geocodificarNominatim(
  rua: string, numero: string, bairro: string, cidade: string, estado: string, cep?: string,
): Promise<{ lat: number; lng: number } | null> {
  const street = [rua, numero].filter(Boolean).join(' ');

  // 1ª: estruturada
  try {
    const p = new URLSearchParams({ format: 'json', street, city: cidade, state: estado, country: 'Brazil', countrycodes: 'br', limit: '1' });
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, { headers: { 'Accept-Language': 'pt-BR' } });
    const j = r.ok ? await r.json() : [];
    if (j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch {}

  // 2ª: CEP
  if (cep) {
    try {
      const p = new URLSearchParams({ format: 'json', postalcode: cep.replace(/\D/g, ''), country: 'Brazil', countrycodes: 'br', limit: '1' });
      const r = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, { headers: { 'Accept-Language': 'pt-BR' } });
      const j = r.ok ? await r.json() : [];
      if (j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
    } catch {}
  }

  // 3ª: free-form
  try {
    const q = [street, bairro, cidade, estado, 'Brasil'].filter(Boolean).join(', ');
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR' } },
    );
    const j = r.ok ? await r.json() : [];
    if (j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch {}

  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const json = await res.json();
    const a = json.address ?? {};
    const rua    = a.road ?? '';
    const numero = a.house_number ?? '';
    return [rua, numero].filter(Boolean).join(', ') || json.display_name || null;
  } catch {
    return null;
  }
}

// Geocodifica um endereço salvo: nativo primeiro, Nominatim como fallback.
async function geocodificarEnderecoSalvo(end: EnderecoResponse): Promise<{ lat: number; lng: number } | null> {
  const texto = [end.rua, end.numero, end.cidade, end.estado, 'Brasil'].filter(Boolean).join(', ');
  const nativo = await geocodificarNativo(texto);
  if (nativo) return nativo;
  return geocodificarNominatim(end.rua, end.numero ?? '', end.bairro, end.cidade, end.estado, end.cep);
}

function formatarSugestaoRotina(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name;
  const rua = a.road ? (a.house_number ? `${a.road}, ${a.house_number}` : a.road) : null;
  const bairro = a.suburb || a.neighbourhood || a.quarter || null;
  const cidade = a.city || a.town || a.municipality || null;
  return [rua, bairro, cidade].filter(Boolean).join(' — ') || r.display_name;
}

function extrairBairro(r: NominatimResult): string {
  const a = r.address;
  return a?.suburb || a?.neighbourhood || a?.quarter || a?.city || a?.town || '';
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function NovaRotinaScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();

  const veiculos: VeiculoResponse[] = user?.veiculos?.length
    ? user.veiculos
    : user?.veiculo
      ? [user.veiculo]
      : [];

  const instituicao = user?.instituicao;

  const [veiculoSelecionado, setVeiculoSelecionado] = useState<VeiculoResponse | null>(null);
  const [veiculoSheetVisible, setVeiculoSheetVisible] = useState(false);

  const capacidade = veiculoSelecionado?.capacidade ?? 4;

  const [diasSelecionados, setDiasSelecionados] = useState<DiaSemana[]>([]);
  const [direcao, setDirecao]                   = useState<Direcao>('IDA');
  const [raio, setRaio]                         = useState(2.0);
  const [horarioPickerVisible, setHorarioPickerVisible] = useState(false);
  const [horarioDate, setHorarioDate] = useState(new Date(2000, 0, 1, 6, 0));
  const [loading, setLoading]                   = useState(false);
  const [enderecoPickerVisible, setEnderecoPickerVisible] = useState(false);
  const [enderecosDisponiveis, setEnderecosDisponiveis]   = useState<EnderecoResponse[]>([]);
  const [carregandoEnderecos, setCarregandoEnderecos]     = useState(false);

  // Endereço do usuário — selecionado via autocomplete, GPS ou endereço salvo
  const [enderecoUsuario, setEnderecoUsuario] = useState<EnderecoSelecionado | null>(null);
  const [inputEnderecoTexto, setInputEnderecoTexto]       = useState('');
  const [sugestoesEndereco, setSugestoesEndereco]         = useState<NominatimResult[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes]         = useState(false);
  const [semResultado, setSemResultado]                   = useState(false);
  const [buscandoGps, setBuscandoGps]                     = useState(false);
  const [erroEndereco, setErroEndereco]                   = useState(false);
  const [inputFocado, setInputFocado]                     = useState(false);
  const [markerCoord, setMarkerCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const { control, handleSubmit, reset, watch, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        nome: '', horarioSaida: '', dataInicio: dataHojeISO(), observacoes: '', pixKey: '',
      },
    });

  // Tela de bloqueio — CNH não aprovada (após todos os hooks)
  if (!user?.aprovadoAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20, paddingBottom: 0 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <View style={styles.bloqueioContainer}>
          <Ionicons name="time-outline" size={48} color={Colors.Primary} />
          <Text style={styles.bloqueioTitulo}>CNH em análise</Text>
          <Text style={styles.bloqueioTexto}>
            Sua CNH está sendo verificada pela equipe UniRide. Você poderá criar rotinas assim que a aprovação for concluída.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const horarioSaida = watch('horarioSaida');

  const handleProximo = async () => {
    if (step === 1) {
      if (!veiculoSelecionado) {
        showAlert('Veículo obrigatório', 'Selecione um veículo para continuar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!enderecoUsuario) {
        setErroEndereco(true);
        showAlert('Endereço obrigatório', 'Informe seu endereço para continuar.');
        return;
      }
      setStep(3);
    }
  };

  const abrirSeletorEndereco = async () => {
    setEnderecoPickerVisible(true);
    setCarregandoEnderecos(true);
    try {
      const lista = await participanteService.listarEnderecos();
      setEnderecosDisponiveis(lista);
    } catch {
      setEnderecoPickerVisible(false);
      showAlert('Erro', 'Não foi possível carregar os endereços salvos.');
    } finally {
      setCarregandoEnderecos(false);
    }
  };

  const buscarNominatim = async (q: string): Promise<NominatimResult[]> => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'UniRide/1.0' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  };

  const handleEnderecoChange = (texto: string) => {
    setInputEnderecoTexto(texto);
    setErroEndereco(false);
    setSemResultado(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (texto.trim().length === 0) { setSugestoesEndereco([]); return; }
    setEnderecoUsuario(null);
    if (texto.trim().length < 3) { setSugestoesEndereco([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscandoSugestoes(true);
      setSugestoesEndereco([]);
      setSemResultado(false);
      try {
        const contexto = instituicao ? `${instituicao.cidade}, ${instituicao.estado}` : undefined;
        const query    = contexto ? `${texto.trim()}, ${contexto}` : texto.trim();
        let resultados = await buscarNominatim(query);

        // Fallback: busca só o nome da rua (sem número) se a busca completa não achou nada
        if (resultados.length === 0) {
          const semNumero = texto.trim()
            .replace(/,\s*\d+.*$/, '')   // "Rua, 123 ..." → "Rua"
            .replace(/\s+\d+$/, '')      // "Rua 123"      → "Rua"
            .trim();
          if (semNumero !== texto.trim()) {
            const queryFallback = contexto ? `${semNumero}, ${contexto}` : semNumero;
            resultados = await buscarNominatim(queryFallback);
          }
        }

        setSugestoesEndereco(resultados);
        setSemResultado(resultados.length === 0);
      } catch {
        setSugestoesEndereco([]);
        setSemResultado(true);
      } finally {
        setBuscandoSugestoes(false);
      }
    }, 400);
  };

  const selecionarSugestao = (r: NominatimResult) => {
    const label = formatarSugestaoRotina(r);
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setEnderecoUsuario({ label, bairro: extrairBairro(r), lat, lng });
    setMarkerCoord({ latitude: lat, longitude: lng });
    setMapKey((k) => k + 1);
    setInputEnderecoTexto('');
    setSugestoesEndereco([]);
    setErroEndereco(false);
  };

  const usarGps = async () => {
    setBuscandoGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permissão negada', 'Permita o acesso à localização nas configurações do dispositivo.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      // Reverse geocoding via Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const json = await res.json();
      const a = json.address ?? {};
      const rua    = a.road ?? '';
      const numero = a.house_number ?? '';
      const bairro = a.suburb || a.neighbourhood || a.quarter || a.city || '';
      const label  = [rua, numero].filter(Boolean).join(', ') || json.display_name;
      setEnderecoUsuario({ label, bairro, lat: latitude, lng: longitude });
      setMarkerCoord({ latitude, longitude });
      setMapKey((k) => k + 1);
      setInputEnderecoTexto('');
      setSugestoesEndereco([]);
      setErroEndereco(false);
    } catch {
      showAlert('Erro', 'Não foi possível obter a localização. Tente novamente.');
    } finally {
      setBuscandoGps(false);
    }
  };

  const limparEndereco = () => {
    setEnderecoUsuario(null);
    setMarkerCoord(null);
    setInputEnderecoTexto('');
    setSugestoesEndereco([]);
  };

  const selecionarEndereco = async (end: EnderecoResponse) => {
    const label = [end.rua, end.numero].filter(Boolean).join(', ');
    // Fecha o modal imediatamente para boa UX
    setInputEnderecoTexto('');
    setSugestoesEndereco([]);
    setErroEndereco(false);
    setEnderecoPickerVisible(false);

    let lat = end.lat ?? null;
    let lng = end.lng ?? null;

    // Se o DB não tem coordenadas, resolve agora (nativo → Nominatim)
    if (lat == null || lng == null) {
      setBuscandoGps(true);
      const coords = await geocodificarEnderecoSalvo(end);
      setBuscandoGps(false);
      lat = coords?.lat ?? null;
      lng = coords?.lng ?? null;
    }

    setEnderecoUsuario({ label, bairro: end.bairro, lat, lng, cep: end.cep, cidade: end.cidade, estado: end.estado });
    if (lat != null && lng != null) {
      setMarkerCoord({ latitude: lat, longitude: lng });
      setMapKey((k) => k + 1);
    }
  };

  const toggleDia = (dia: DiaSemana) =>
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );

  const onMarkerDragEnd = async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });
    const novoLabel = await reverseGeocode(latitude, longitude);
    setEnderecoUsuario((prev) =>
      prev ? { ...prev, lat: latitude, lng: longitude, label: novoLabel ?? prev.label } : null
    );
  };

  const enderecoLabel = direcao === 'IDA' ? 'Seu endereço de saída' : 'Seu endereço de chegada';

  const nomeInstituicao = instituicao
    ? `${instituicao.nome} — ${instituicao.cidade}, ${instituicao.estado}`
    : 'Instituição não vinculada';

  const onSubmit = async (data: FormData) => {
    if (!veiculoSelecionado) {
      showAlert('Atenção', 'Selecione um veículo antes de criar a rotina.');
      return;
    }
    if (diasSelecionados.length === 0) {
      showAlert('Atenção', 'Selecione ao menos um dia da semana.');
      return;
    }

    if (!enderecoUsuario) {
      setErroEndereco(true);
      showAlert('Atenção', 'Selecione um endereço da lista de sugestões ou de seus endereços salvos.');
      return;
    }

    // Coordenadas do usuário — já resolvidas em selecionarSugestao / usarGps / selecionarEndereco
    let geoUser: { lat: number; lng: number } | null =
      (enderecoUsuario.lat != null && enderecoUsuario.lng != null)
        ? { lat: enderecoUsuario.lat, lng: enderecoUsuario.lng }
        : null;

    // Última tentativa se ainda null (pode acontecer se selecionarEndereco não conseguiu geocodificar)
    if (!geoUser) {
      setLoading(true);
      const cidade = enderecoUsuario.cidade ?? instituicao?.cidade ?? '';
      const estado = enderecoUsuario.estado ?? instituicao?.estado ?? '';
      const texto  = [enderecoUsuario.label, cidade, estado, 'Brasil'].filter(Boolean).join(', ');
      geoUser = await geocodificarNativo(texto);
      if (!geoUser) geoUser = await geocodificarNominatim(enderecoUsuario.label, '', enderecoUsuario.bairro, cidade, estado, enderecoUsuario.cep);
      setLoading(false);
    }

    if (!geoUser) {
      setErroEndereco(true);
      showAlert('Endereço não localizado',
        'Não foi possível obter as coordenadas do seu endereço. Tente buscar pelo autocomplete e selecionar uma sugestão da lista.');
      return;
    }

    // Coordenadas da instituição — DB ou geocodificação nativa/Nominatim
    let geoInst: { lat: number; lng: number } | null =
      (instituicao?.lat && instituicao?.lng)
        ? { lat: instituicao.lat, lng: instituicao.lng }
        : null;

    if (!geoInst && instituicao) {
      const textoInst = [instituicao.nome, instituicao.cidade, instituicao.estado, 'Brasil'].filter(Boolean).join(', ');
      geoInst = await geocodificarNativo(textoInst);
      if (!geoInst) geoInst = await geocodificarNominatim('', '', '', instituicao.cidade, instituicao.estado);
    }

    if (!geoInst) {
      showAlert('Instituição não localizada',
        'Não foi possível obter as coordenadas da sua instituição. Verifique sua conexão e tente novamente.');
      return;
    }

    const instEndereco  = instituicao ? instituicao.nome : 'Faculdade';
    const instBairro    = instituicao ? (instituicao.bairro ?? `${instituicao.cidade}, ${instituicao.estado}`) : 'Campus';

    const origem        = direcao === 'IDA' ? enderecoUsuario.label  : instEndereco;
    const bairroOrigem  = direcao === 'IDA' ? enderecoUsuario.bairro : instBairro;
    const destino       = direcao === 'IDA' ? instEndereco           : enderecoUsuario.label;
    const bairroDestino = direcao === 'IDA' ? instBairro             : enderecoUsuario.bairro;

    const latOrigem  = direcao === 'IDA' ? geoUser.lat  : geoInst.lat;
    const lngOrigem  = direcao === 'IDA' ? geoUser.lng  : geoInst.lng;
    const latDestino = direcao === 'IDA' ? geoInst.lat  : geoUser.lat;
    const lngDestino = direcao === 'IDA' ? geoInst.lng  : geoUser.lng;

    setLoading(true);
    try {
      await rotinaService.criar({
        nome: data.nome,
        origem,
        bairroOrigem,
        destino,
        bairroDestino,
        latOrigem,
        lngOrigem,
        latDestino,
        lngDestino,
        horarioSaida: data.horarioSaida,
        diasDaSemana: diasSelecionados,
        vagasTotal:   capacidade,
        dataInicio:   data.dataInicio,
        raioAceito:   raio,
        direcao,
        observacoes:  data.observacoes || undefined,
        pixKey:       data.pixKey || undefined,
      });
      showAlert(
        'Rotina criada!',
        'Sua rotina foi salva. Para gerar as caronas, acesse "Minhas rotinas", toque na rotina e selecione os dias no calendário.',
        [{ text: 'Ver minhas rotinas', onPress: () => router.dismissTo('/perfil/corridas') }],
      );
      reset();
      setStep(1);
      setDiasSelecionados([]);
      setVeiculoSelecionado(null);
      setEnderecoUsuario(null);
      setInputEnderecoTexto('');
    } catch (error: unknown) {
      showAlert('Erro', error instanceof Error ? error.message : 'Erro ao criar rotina');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header fixo acima do scroll */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step === 1 ? router.back() : setStep((s) => (s - 1) as 1 | 2 | 3)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Rotina</Text>
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotAtivo]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotAtivo]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotAtivo]} />
        </View>
        <Text style={styles.subtitle}>
          {step === 1 ? 'Passo 1 de 3 — Veículo' : step === 2 ? 'Passo 2 de 3 — Rota' : 'Passo 3 de 3 — Detalhes'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={step === 3 ? styles.scrollNormal : styles.scrollCentered}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ══ PASSO 1 — Veículo ════════════════════════════════════════════════ */}
        {step === 1 && <>

        {veiculos.length === 0 ? (
          <View style={styles.semVeiculoBox}>
            <Ionicons name="car-outline" size={22} color={Colors.Error} />
            <Text style={styles.semVeiculoText}>
              Nenhum veículo cadastrado. Acesse Perfil → Meu veículo para adicionar.
            </Text>
          </View>
        ) : !veiculoSelecionado ? (
          <TouchableOpacity
            style={styles.veiculoSelectorBtn}
            onPress={() => setVeiculoSheetVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.veiculoSelectorIconWrap}>
              <Ionicons name="car-sport-outline" size={40} color={Colors.Primary} />
            </View>
            <Text style={styles.veiculoSelectorTitle}>Selecionar veículo</Text>
            <Text style={styles.veiculoSelectorSub}>Toque para escolher</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.veiculoCard}
            onPress={() => setVeiculoSheetVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.veiculoCardHeader}>
              <View style={styles.veiculoIconWrap}>
                <Ionicons name="car-sport-outline" size={30} color={Colors.Primary} />
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.Primary} />
            </View>
            <Text style={styles.veiculoNome} numberOfLines={1}>
              {veiculoSelecionado.modelo} {veiculoSelecionado.marca}
            </Text>
            <Text style={styles.veiculoCor}>
              {veiculoSelecionado.cor} · {veiculoSelecionado.ano}
            </Text>
            <View style={styles.veiculoDivider} />
            <View style={styles.veiculoBadgesRow}>
              <View style={styles.veiculoBadge}>
                <Ionicons name="card-outline" size={14} color={Colors.Primary} />
                <Text style={styles.veiculoBadgeText}>{veiculoSelecionado.placa}</Text>
              </View>
              <View style={styles.veiculoBadge}>
                <Ionicons name="people-outline" size={14} color={Colors.Primary} />
                <Text style={styles.veiculoBadgeText}>{capacidade} vagas</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        </>}

        {/* ══ PASSO 2 — Rota ═══════════════════════════════════════════════════ */}
        {step === 2 && <>

        <View style={styles.rotaCard}>

          {/* Sentido */}
          <Text style={styles.rotaSecaoLabel}>Sentido da viagem</Text>
          <View style={styles.direcaoRow}>
            <TouchableOpacity
              style={[styles.direcaoBtn, direcao === 'IDA' && styles.direcaoBtnAtivo]}
              onPress={() => setDirecao('IDA')}
            >
              <Ionicons name="arrow-forward-circle-outline" size={20} color={direcao === 'IDA' ? '#fff' : Colors.Primary} />
              <Text style={[styles.direcaoBtnText, direcao === 'IDA' && styles.direcaoBtnTextAtivo]}>
                Ir para faculdade
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.direcaoBtn, direcao === 'VOLTA' && styles.direcaoBtnAtivo]}
              onPress={() => setDirecao('VOLTA')}
            >
              <Ionicons name="arrow-back-circle-outline" size={20} color={direcao === 'VOLTA' ? '#fff' : Colors.Primary} />
              <Text style={[styles.direcaoBtnText, direcao === 'VOLTA' && styles.direcaoBtnTextAtivo]}>
                Sair da faculdade
              </Text>
            </TouchableOpacity>
          </View>

          {/* Diagrama de rota */}
          <View style={styles.rotaDiagrama}>
            <View style={styles.rotaPontoRow}>
              <View style={styles.rotaPontoCirculo} />
              <View style={styles.rotaPontoInfo}>
                <Text style={styles.rotaPontoTipo}>
                  {direcao === 'IDA' ? 'Saída' : 'Destino (fixo)'}
                </Text>
                <Text style={styles.rotaPontoNome} numberOfLines={1}>
                  {direcao === 'IDA'
                    ? (enderecoUsuario?.label ?? 'Seu endereço')
                    : nomeInstituicao}
                </Text>
              </View>
            </View>
            <View style={styles.rotaLinhaVertical} />
            <View style={styles.rotaPontoRow}>
              <View style={styles.rotaPontoQuadrado} />
              <View style={styles.rotaPontoInfo}>
                <Text style={styles.rotaPontoTipo}>
                  {direcao === 'IDA' ? 'Destino (fixo)' : 'Saída'}
                </Text>
                <Text style={styles.rotaPontoNome} numberOfLines={1}>
                  {direcao === 'IDA'
                    ? nomeInstituicao
                    : (enderecoUsuario?.label ?? 'Seu endereço')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rotaDivider} />

          {/* Endereço pessoal */}
          <View style={styles.enderecoHeaderRow}>
            <Text style={styles.rotaSecaoLabel}>{enderecoLabel}</Text>
            <TouchableOpacity onPress={abrirSeletorEndereco} style={styles.usarSalvoBtn}>
              <Text style={styles.usarSalvoText}>Usar salvo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.enderecoInputRow}>
            <View style={styles.enderecoInputWrap}>
              <TextInput
                style={[styles.enderecoInput, erroEndereco && styles.enderecoInputError]}
                value={inputEnderecoTexto}
                onChangeText={handleEnderecoChange}
                placeholder="Digite rua e número..."
                placeholderTextColor={Colors.TextMuted}
                autoCapitalize="words"
                onFocus={() => setInputFocado(true)}
                onBlur={() => setTimeout(() => setInputFocado(false), 150)}
              />
              {(inputEnderecoTexto.length > 0 || enderecoUsuario !== null) && (
                <TouchableOpacity onPress={limparEndereco} style={styles.enderecoInputClear}>
                  <Ionicons name="close-circle" size={18} color={Colors.TextMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.gpsBtn} onPress={usarGps} disabled={buscandoGps}>
              {buscandoGps
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="locate" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>

          {enderecoUsuario && (
            <View style={styles.enderecoConfirmado}>
              <Ionicons name="checkmark-circle" size={15} color={Colors.Success} />
              <Text style={styles.enderecoConfirmadoText} numberOfLines={1}>
                {enderecoUsuario.label}
              </Text>
            </View>
          )}

          {markerCoord && (
            <View style={styles.mapaContainer}>
              <WebView
                key={mapKey}
                style={styles.mapa}
                scrollEnabled={false}
                source={{ html: `<!DOCTYPE html><html><head>
                  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
                  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
                  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                  <style>*{margin:0;padding:0;box-sizing:border-box}#map{height:100vh;width:100vw}</style>
                  </head><body><div id="map"></div><script>
                  var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,touchZoom:false,scrollWheelZoom:false,doubleClickZoom:false,keyboard:false})
                  .setView([${markerCoord.latitude},${markerCoord.longitude}],16);
                  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
                  L.marker([${markerCoord.latitude},${markerCoord.longitude}]).addTo(map);
                  </script></body></html>` }}
              />
              <Text style={styles.mapaDica}>
                <Ionicons name="information-circle-outline" size={12} color={Colors.TextMuted} />
                {' '}Prévia do ponto selecionado
              </Text>
            </View>
          )}

          {erroEndereco && (
            <Text style={styles.fieldError}>Selecione um endereço válido</Text>
          )}

          {inputFocado && !enderecoUsuario && (buscandoSugestoes || sugestoesEndereco.length > 0 || semResultado) && (
            <View style={[styles.sugestoesContainer, { zIndex: 20, elevation: 20 }]}>
              {buscandoSugestoes ? (
                <ActivityIndicator color={Colors.Primary} size="small" style={{ padding: 12 }} />
              ) : semResultado ? (
                <View style={styles.sugestaoVazio}>
                  <Ionicons name="search-outline" size={16} color={Colors.TextMuted} />
                  <Text style={styles.sugestaoVazioText}>Nenhum endereço encontrado</Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 220 }}
                >
                  {sugestoesEndereco.map((s, i) => (
                    <TouchableOpacity key={i} style={styles.sugestaoItem} onPress={() => selecionarSugestao(s)}>
                      <Ionicons name="location-outline" size={15} color={Colors.Primary} style={{ marginRight: 8, flexShrink: 0 }} />
                      <Text style={styles.sugestaoText} numberOfLines={2}>{formatarSugestaoRotina(s)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.rotaDivider} />

          {/* Raio */}
          <Text style={styles.rotaSecaoLabel}>Raio de alcance</Text>
          <View style={styles.raioRow}>
            <TouchableOpacity
              style={[styles.raioBtn, raio <= 0.5 && styles.raioBtnDis]}
              onPress={() => setRaio((r) => Math.max(0.5, parseFloat((r - 0.5).toFixed(1))))}
              disabled={raio <= 0.5}
            >
              <Text style={styles.raioBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.raioValorWrap}>
              <Text style={styles.raioValor}>{raio.toFixed(1)}</Text>
              <Text style={styles.raioKm}>km</Text>
            </View>
            <TouchableOpacity
              style={[styles.raioBtn, raio >= 10 && styles.raioBtnDis]}
              onPress={() => setRaio((r) => Math.min(10, parseFloat((r + 0.5).toFixed(1))))}
              disabled={raio >= 10}
            >
              <Text style={styles.raioBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.raioHint}>
            Máximo que você aceita se desviar do trajeto para buscar passageiros.
          </Text>

        </View>

        </>}

        {/* ══ PASSO 3 — Detalhes ═══════════════════════════════════════════════ */}
        {step === 3 && <>

        <View style={styles.rotaCard}>

          {/* ── Nome ─────────────────────────────────────────────────────────── */}
          <Text style={styles.rotaSecaoLabel}>Nome da rotina</Text>
          <Controller control={control} name="nome" render={({ field: { value, onChange } }) => (
            <Input
              value={value} onChangeText={onChange}
              placeholder='Ex: "Manhã — Faculdade"'
              autoCapitalize="words"
              error={errors.nome?.message}
            />
          )} />

          <View style={styles.rotaDivider} />

          {/* ── Agenda ───────────────────────────────────────────────────────── */}
          <Text style={styles.rotaSecaoLabel}>Dias da semana</Text>
          <View style={styles.diasRow}>
            {DIAS.map((dia) => {
              const sel = diasSelecionados.includes(dia.key);
              return (
                <TouchableOpacity
                  key={dia.key}
                  onPress={() => toggleDia(dia.key)}
                  style={[styles.diaChip, sel && styles.diaChipSel]}
                >
                  <Text style={[styles.diaText, sel && styles.diaTextSel]}>{dia.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.rotaSecaoLabel, { marginTop: 4 }]}>Horário de saída</Text>
          <Controller control={control} name="horarioSaida" render={({ field: { onChange } }) => (
            <>
              <TouchableOpacity
                style={[styles.pickerBtn, !!errors.horarioSaida && styles.pickerBtnError]}
                onPress={() => setHorarioPickerVisible(true)}
              >
                <View style={styles.pickerBtnContent}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={horarioSaida ? Colors.Text : Colors.TextMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.pickerBtnText, !horarioSaida && styles.pickerBtnPlaceholder]}>
                    {horarioSaida || 'Selecionar horário'}
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.horarioSaida && (
                <Text style={styles.fieldError}>{errors.horarioSaida.message}</Text>
              )}
              <TimePicker
                visible={horarioPickerVisible}
                value={horarioDate}
                onConfirm={(date) => {
                  const h = String(date.getHours()).padStart(2, '0');
                  const m = String(date.getMinutes()).padStart(2, '0');
                  setHorarioDate(date);
                  onChange(`${h}:${m}`);
                }}
                onClose={() => setHorarioPickerVisible(false)}
              />
            </>
          )} />

          <View style={styles.rotaDivider} />

          {/* ── Observações ──────────────────────────────────────────────────── */}
          <Text style={styles.rotaSecaoLabel}>Observações</Text>
          <Controller control={control} name="observacoes" render={({ field: { value, onChange } }) => (
            <Input
              value={value ?? ''}
              onChangeText={onChange}
              placeholder='Ex: "Pego no portão principal"'
              autoCapitalize="sentences"
              error={errors.observacoes?.message}
            />
          )} />

          <View style={styles.rotaDivider} />

          {/* ── Pagamento ────────────────────────────────────────────────────── */}
          <Text style={styles.rotaSecaoLabel}>Chave PIX</Text>
          <Text style={styles.rotaSecaoSub}>
            Informe sua chave para facilitar o recebimento dos passageiros.
          </Text>
          <Controller control={control} name="pixKey" render={({ field: { value, onChange } }) => (
            <Input
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="CPF, e-mail ou chave aleatória"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.pixKey?.message}
            />
          )} />

        </View>

        </>}
      </ScrollView>

      {/* Botão fixo na base */}
      <View style={styles.floatBar}>
        {step < 3 ? (
          <Button title="Próximo" onPress={handleProximo} variant="primary" style={styles.floatBtn} />
        ) : (
          <Button title="Criar rotina" onPress={handleSubmit(onSubmit)} variant="primary" loading={loading} style={styles.floatBtn} />
        )}
      </View>

      {/* Modal: endereços salvos */}
      <Modal visible={enderecoPickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEnderecoPickerVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Endereços salvos</Text>
            {carregandoEnderecos ? (
              <ActivityIndicator color={Colors.Primary} style={{ marginVertical: 24 }} />
            ) : enderecosDisponiveis.length === 0 ? (
              <Text style={styles.enderecoVazioText}>
                Nenhum endereço cadastrado.{'\n'}Acesse Perfil → Endereços para adicionar.
              </Text>
            ) : (
              <FlatList
                data={enderecosDisponiveis}
                keyExtractor={(e) => e.id.toString()}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.enderecoItem}
                    onPress={() => selecionarEndereco(item)}
                  >
                    <Text style={styles.enderecoItemRua}>
                      {item.rua}, {item.numero}
                    </Text>
                    <Text style={styles.enderecoItemDetalhe}>
                      {item.bairro} · {item.cidade}/{item.estado}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom sheet: seleção de veículo */}
      <BottomSheet
        visible={veiculoSheetVisible}
        onClose={() => setVeiculoSheetVisible(false)}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitulo}>Qual veículo usar?</Text>
        {veiculos.map((v) => {
          const ativo = veiculoSelecionado?.id === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.sheetVeiculoItem, ativo && styles.sheetVeiculoItemAtivo]}
              onPress={() => {
                setVeiculoSelecionado(v);
                setVeiculoSheetVisible(false);
              }}
            >
              <View style={styles.sheetVeiculoInfo}>
                <Text style={styles.sheetVeiculoNome}>{v.modelo} {v.marca}</Text>
                <Text style={styles.sheetVeiculoDetalhe}>
                  {v.cor} · {v.placa} · {v.capacidade} vagas
                </Text>
              </View>
              {ativo && <Ionicons name="checkmark-circle" size={22} color={Colors.Primary} />}
            </TouchableOpacity>
          );
        })}
      </BottomSheet>

      {alertModal}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },

  scrollCentered: { flexGrow: 1, padding: 20, paddingBottom: 8, justifyContent: 'center' },
  scrollNormal:   { padding: 20, paddingBottom: 8 },

  floatBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    backgroundColor: 'rgba(245,245,250,0.95)',
    borderTopWidth: 1, borderTopColor: '#EBEBEB',
  },
  floatBtn: { minHeight: 50 },

  header:  { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { padding: 4, marginBottom: 6 },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 8 },
  stepDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.Primary + '40' },
  stepDotAtivo: { backgroundColor: Colors.Primary },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.Primary + '30', maxWidth: 40 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.TextMuted },

  // Seções
  secaoCard: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  secaoHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  secaoTitulo: { fontSize: 15, fontWeight: '800', color: Colors.Primary },
  secaoSubtitulo: { fontSize: 13, color: Colors.TextMuted, marginTop: 4, marginBottom: 12 },
  trocarBtn:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.Primary + '15' },
  trocarBtnText: { fontSize: 12, fontWeight: '700', color: Colors.Primary },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.Text,
    marginBottom: 10, marginTop: 4,
  },

  // Veículo vazio
  semVeiculoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.Error + '10', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: Colors.Error + '30',
  },
  semVeiculoText: { flex: 1, fontSize: 13, color: Colors.Error, lineHeight: 18 },

  // Botão selector (nenhum selecionado)
  veiculoSelectorBtn: {
    borderWidth: 1.5, borderColor: Colors.Primary, borderRadius: 20,
    borderStyle: 'dashed', padding: 40,
    alignItems: 'center', gap: 14,
    backgroundColor: Colors.Primary + '05',
  },
  veiculoSelectorIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.Primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  veiculoSelectorTitle: { fontSize: 17, fontWeight: '700', color: Colors.Primary },
  veiculoSelectorSub:   { fontSize: 13, color: Colors.TextMuted },

  // Card de veículo selecionado
  veiculoCard: {
    borderWidth: 1.5, borderColor: Colors.Primary, borderRadius: 20,
    padding: 24, backgroundColor: Colors.Primary + '08', gap: 6,
  },
  veiculoCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  veiculoIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  veiculoNome:      { fontSize: 22, fontWeight: '800', color: Colors.Primary },
  veiculoCor:       { fontSize: 14, color: Colors.TextMuted },
  veiculoDivider:   { height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 14 },
  veiculoBadgesRow: { flexDirection: 'row', gap: 10 },
  veiculoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.Primary + '12', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  veiculoBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.Primary },

  // Raio stepper (full-width)
  raioRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.SurfaceLight, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  raioBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
  },
  raioBtnDis:  { backgroundColor: '#ccc' },
  raioBtnText: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  raioValorWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'center', gap: 4,
  },
  raioValor: { fontSize: 32, fontWeight: '800', color: Colors.Primary },
  raioKm:    { fontSize: 16, fontWeight: '600', color: Colors.TextMuted },
  raioHint:  { fontSize: 12, color: Colors.TextMuted, marginBottom: 4, marginTop: -4 },

  // Direção
  direcaoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  direcaoBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.Primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  direcaoBtnAtivo:     { backgroundColor: Colors.Primary },
  direcaoBtnText:      { fontSize: 13, fontWeight: '600', color: Colors.Primary, textAlign: 'center' },
  direcaoBtnTextAtivo: { color: '#fff' },

  // Card de rota (step 2)
  rotaCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  rotaSecaoLabel: { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 10 },
  rotaSecaoSub:   { fontSize: 12, color: Colors.TextMuted, marginTop: -6, marginBottom: 10 },
  rotaDivider:    { height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 16 },

  // Diagrama origem → destino
  rotaDiagrama:      { marginVertical: 8 },
  rotaPontoRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rotaPontoCirculo:  { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.Primary },
  rotaLinhaVertical: { width: 2, height: 28, backgroundColor: Colors.Primary + '35', marginLeft: 5, marginVertical: 2 },
  rotaPontoQuadrado: { width: 12, height: 12, borderRadius: 3, backgroundColor: Colors.Primary },
  rotaPontoInfo:     { flex: 1 },
  rotaPontoTipo: { fontSize: 11, fontWeight: '700', color: Colors.TextMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  rotaPontoNome: { fontSize: 14, fontWeight: '600', color: Colors.Text, marginTop: 1 },

  // Dias
  diasRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  diaChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.Primary },
  diaChipSel: { backgroundColor: Colors.Primary },
  diaText:    { color: Colors.Primary, fontWeight: '600', fontSize: 13 },
  diaTextSel: { color: '#fff' },

  // Picker genérico
  pickerBtn: {
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: Colors.Surface,
    marginBottom: 4,
  },
  pickerBtnContent:     { flexDirection: 'row', alignItems: 'center' },
  pickerBtnError:       { borderColor: Colors.Error ?? '#e53935' },
  pickerBtnText:        { fontSize: 15, color: Colors.Text, flex: 1 },
  pickerBtnPlaceholder: { color: Colors.TextMuted },
  fieldError:           { fontSize: 12, color: Colors.Error ?? '#e53935', marginTop: 2, marginBottom: 8 },

  // Modal overlay (centro)
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 20,
    width: '100%', maxHeight: '70%',
  },
  modalTitulo:             { fontSize: 16, fontWeight: '700', color: Colors.Text, marginBottom: 16, textAlign: 'center' },
  // Calendar
  calendarContainer: {
    backgroundColor: Colors.Surface, borderRadius: 16, overflow: 'hidden',
    width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },

  // Bottom sheet (veículo)
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitulo: { fontSize: 17, fontWeight: '800', color: Colors.Text, marginBottom: 16 },
  sheetVeiculoItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E0E0E0', marginBottom: 10,
  },
  sheetVeiculoItemAtivo: { borderColor: Colors.Primary, backgroundColor: Colors.Primary + '08' },
  sheetVeiculoInfo:      { flex: 1 },
  sheetVeiculoNome:      { fontSize: 15, fontWeight: '700', color: Colors.Text, marginBottom: 2 },
  sheetVeiculoDetalhe:   { fontSize: 13, color: Colors.TextMuted },

  // Submit

  // Bloqueio
  bloqueioContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  bloqueioIcon:      { fontSize: 56, marginBottom: 16 },
  bloqueioTitulo:    { fontSize: 20, fontWeight: '800', color: Colors.Primary, marginBottom: 12, textAlign: 'center' },
  bloqueioTexto:     { fontSize: 15, color: Colors.TextMuted, textAlign: 'center', lineHeight: 22 },

  // Endereço salvo
  enderecoHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginTop: 4 },
  usarSalvoBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.Primary + '15' },
  usarSalvoText:     { fontSize: 12, fontWeight: '700', color: Colors.Primary },
  enderecoItem: {
    backgroundColor: Colors.SurfaceLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(123,47,190,0.15)',
  },
  enderecoItemRua:    { fontSize: 14, fontWeight: '700', color: Colors.Text, marginBottom: 2 },
  enderecoItemDetalhe:{ fontSize: 12, color: Colors.TextMuted },
  enderecoVazioText:  { fontSize: 14, color: Colors.TextMuted, textAlign: 'center', lineHeight: 22, paddingVertical: 16 },

  // Autocomplete + GPS
  enderecoInputRow:   { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  enderecoInputWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D9C9F0', borderRadius: 12, backgroundColor: Colors.Surface, paddingHorizontal: 12 },
  enderecoInput:      { flex: 1, fontSize: 14, color: Colors.Text, paddingVertical: 12 },
  enderecoInputError: { borderColor: Colors.Error },
  enderecoInputClear: { padding: 4 },
  gpsBtn:             { width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center' },
  enderecoConfirmado: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.Success + '15', borderRadius: 8, padding: 8, marginBottom: 4 },
  enderecoConfirmadoText: { flex: 1, fontSize: 12, color: Colors.Success, fontWeight: '600' },
  sugestoesContainer: { borderWidth: 1, borderColor: '#D9C9F0', borderRadius: 12, backgroundColor: Colors.Surface, marginBottom: 8, overflow: 'hidden' },
  sugestaoItem:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#D9C9F0' + '60' },
  sugestaoText:       { flex: 1, fontSize: 13, color: Colors.Text, lineHeight: 18 },
  sugestaoVazio:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  sugestaoVazioText:  { fontSize: 13, color: Colors.TextMuted, fontStyle: 'italic' },

  // Mapa interativo
  mapaContainer: { marginTop: 8, marginBottom: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#D9C9F0' },
  mapa:          { height: 200, width: '100%' },
  mapaDica:      { fontSize: 11, color: Colors.TextMuted, textAlign: 'center', paddingVertical: 6, backgroundColor: Colors.Surface },
});
