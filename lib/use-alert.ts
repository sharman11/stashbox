import { useCallback, useState } from 'react';

import type { AlertButton, AlertConfig } from '@/components/CustomAlert';

const EMPTY: AlertConfig = { visible: false, title: '' };

export function useAlert() {
  const [config, setConfig] = useState<AlertConfig>(EMPTY);

  const show = useCallback(
    (title: string, message?: string, buttons?: AlertButton[], icon?: string) => {
      setConfig({ visible: true, title, message, buttons, icon });
    },
    []
  );

  const dismiss = useCallback(() => {
    setConfig(EMPTY);
  }, []);

  return { alertConfig: config, showAlert: show, dismissAlert: dismiss };
}
