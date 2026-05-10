import React, { useState, useCallback } from 'react';
import { AppModal, AppModalButton } from '@/components/ui/AppModal';

interface AlertConfig {
  title: string;
  message?: string;
  buttons: AppModalButton[];
}

/**
 * Hook que fornece uma API imperativa similar a Alert.alert(),
 * mas renderiza o componente AppModal estilizado do app.
 *
 * Uso:
 *   const { showAlert, alertModal } = useAppAlert();
 *   showAlert('Erro', 'Algo deu errado.');
 *   showAlert('Confirmar', 'Deseja continuar?', [
 *     { text: 'Cancelar', style: 'cancel', onPress: () => {} },
 *     { text: 'Confirmar', style: 'destructive', onPress: handleDelete },
 *   ]);
 *
 *   return <View>...{alertModal}</View>;
 */
export function useAppAlert() {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const dismiss = useCallback(() => setConfig(null), []);

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AppModalButton[]) => {
      const defaultButtons: AppModalButton[] = [
        { text: 'OK', style: 'default', onPress: dismiss },
      ];
      setConfig({
        title,
        message,
        buttons: (buttons ?? defaultButtons).map((b) => ({
          ...b,
          onPress: () => {
            dismiss();
            b.onPress?.();
          },
        })),
      });
    },
    [dismiss],
  );

  const alertModal = config ? (
    <AppModal
      visible
      title={config.title}
      message={config.message}
      buttons={config.buttons}
      onRequestClose={dismiss}
    />
  ) : null;

  return { showAlert, alertModal };
}
