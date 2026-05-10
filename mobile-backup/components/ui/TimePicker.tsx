import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Colors } from '@/constants/colors';

const ITEM_H      = 54;
const VISIBLE     = 5;
const STEP_MIN    = 5;
const HOURS       = Array.from({ length: 24 }, (_, i) => i);
const MINUTES     = Array.from({ length: 60 / STEP_MIN }, (_, i) => i * STEP_MIN);
const PICKER_H    = ITEM_H * VISIBLE;
const PAD         = ITEM_H * 2;

interface Props {
  visible:   boolean;
  value:     Date;
  onConfirm: (date: Date) => void;
  onClose:   () => void;
  title?:    string;
}

export function TimePicker({ visible, value, onConfirm, onClose, title = 'Horário de saída' }: Props) {
  const hourRef   = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  const snapMinute = (m: number) => Math.round(m / STEP_MIN) * STEP_MIN % 60;

  const [selHour, setSelHour]     = useState(value.getHours());
  const [selMinute, setSelMinute] = useState(snapMinute(value.getMinutes()));

  useEffect(() => {
    if (!visible) return;
    const h = value.getHours();
    const m = snapMinute(value.getMinutes());
    setSelHour(h);
    setSelMinute(m);
    setTimeout(() => {
      hourRef.current?.scrollTo({ y: h * ITEM_H, animated: false });
      minuteRef.current?.scrollTo({ y: (MINUTES.indexOf(m) * ITEM_H), animated: false });
    }, 80);
  }, [visible]);

  const resolveHour = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    setSelHour(HOURS[Math.max(0, Math.min(idx, HOURS.length - 1))]);
  }, []);

  const resolveMinute = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    setSelMinute(MINUTES[Math.max(0, Math.min(idx, MINUTES.length - 1))]);
  }, []);

  const handleConfirm = () => {
    const d = new Date(value);
    d.setHours(selHour, selMinute, 0, 0);
    onConfirm(d);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Handle */}
      <View style={styles.handle} />

      <Text style={styles.title}>{title}</Text>

      {/* Wheels */}
      <View style={styles.wheelRow}>
        {/* Faixa de destaque (atrás das rodas) */}
        <View style={styles.highlight} pointerEvents="none" />

        {/* Horas */}
        <ScrollView
          ref={hourRef}
          style={styles.column}
          contentContainerStyle={{ paddingVertical: PAD }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          onMomentumScrollEnd={resolveHour}
          onScrollEndDrag={resolveHour}
        >
          {HOURS.map((h) => {
            const active = h === selHour;
            return (
              <View key={h} style={styles.item}>
                <Text style={[styles.itemText, active && styles.itemTextActive]}>
                  {String(h).padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <Text style={styles.separator}>:</Text>

        {/* Minutos */}
        <ScrollView
          ref={minuteRef}
          style={styles.column}
          contentContainerStyle={{ paddingVertical: PAD }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          onMomentumScrollEnd={resolveMinute}
          onScrollEndDrag={resolveMinute}
        >
          {MINUTES.map((m) => {
            const active = m === selMinute;
            return (
              <View key={m} style={styles.item}>
                <Text style={[styles.itemText, active && styles.itemTextActive]}>
                  {String(m).padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
        <Text style={styles.confirmText}>Confirmar</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 16, fontWeight: '800', color: Colors.Primary,
    textAlign: 'center', marginBottom: 20,
  },

  // Rodas
  wheelRow: {
    height: PICKER_H,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  column: {
    flex: 1,
    height: PICKER_H,
  },
  item: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 22,
    fontWeight: '500',
    color: Colors.TextMuted,
    letterSpacing: 1,
  },
  itemTextActive: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.Primary,
  },
  separator: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.Primary,
    marginHorizontal: 4,
    marginBottom: 4,
  },

  // Faixa central
  highlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: ITEM_H * 2,
    height: ITEM_H,
    backgroundColor: Colors.Primary + '12',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.Primary + '50',
  },

  // Botão
  confirmBtn: {
    backgroundColor: Colors.Primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
