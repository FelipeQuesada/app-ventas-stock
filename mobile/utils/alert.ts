import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS === 'web') {
    const fullMessage = message ? `${title}\n\n${message}` : title;

    // window.alert no tiene botones: no auto-ejecutar acciones (ej. "Ver stock").
    if (!buttons || buttons.length === 0) {
      window.alert(fullMessage);
      return;
    }

    if (buttons.length === 1) {
      window.alert(fullMessage);
      buttons[0]?.onPress?.();
      return;
    }

    const confirmBtn =
      buttons.find((b) => b.style === 'destructive' || b.style === 'default') ??
      buttons.find((b) => b.style !== 'cancel');
    const cancelBtn = buttons.find((b) => b.style === 'cancel');

    // Dos opciones → confirm nativo
    if (confirmBtn && cancelBtn) {
      const ok = window.confirm(
        `${fullMessage}\n\nAceptar: ${confirmBtn.text ?? 'OK'}\nCancelar: ${cancelBtn.text ?? 'Cancelar'}`
      );
      if (ok) confirmBtn.onPress?.();
      else cancelBtn.onPress?.();
      return;
    }

    window.alert(fullMessage);
    return;
  }

  Alert.alert(title, message, buttons);
}

export function showConfirm(
  title: string,
  message: string,
  confirmText = 'Confirmar'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
