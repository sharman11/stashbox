import * as Haptics from 'expo-haptics';
import { Modal, Pressable, Text, View } from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertConfig {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: string;
}

interface CustomAlertProps {
  config: AlertConfig;
  onDismiss: () => void;
}

export function CustomAlert({ config, onDismiss }: CustomAlertProps) {
  if (!config.visible) return null;

  const buttons = config.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' as const }];

  const handlePress = (button: AlertButton) => {
    if (button.style === 'destructive') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onDismiss();
    button.onPress?.();
  };

  const hasDestructive = buttons.some((b) => b.style === 'destructive');

  return (
    <Modal transparent animationType="fade" visible={config.visible}>
      <Pressable
        onPress={() => {
          const cancelBtn = buttons.find((b) => b.style === 'cancel');
          if (cancelBtn) {
            onDismiss();
            cancelBtn.onPress?.();
          } else {
            onDismiss();
          }
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            paddingTop: 28,
            paddingBottom: 20,
            paddingHorizontal: 24,
            width: 300,
            alignItems: 'center',
            shadowColor: 'rgba(0,0,0,0.12)',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 1,
            shadowRadius: 32,
            elevation: 8,
          }}
        >
          {config.icon && (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                backgroundColor: hasDestructive ? '#FEF2F2' : '#E6F4EA',
              }}
            >
              <Text style={{ fontSize: 24 }}>{config.icon}</Text>
            </View>
          )}

          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: '#0F1419', textAlign: 'center' }}>
            {config.title}
          </Text>

          {config.message && (
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: '#6B7280',
                textAlign: 'center',
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              {config.message}
            </Text>
          )}

          <View style={{ width: '100%', marginTop: 22, gap: 8 }}>
            {buttons.filter((b) => b.style !== 'cancel').map((button, i) => (
              <Pressable
                key={i}
                onPress={() => handlePress(button)}
                style={{
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  backgroundColor: button.style === 'destructive' ? '#EF4444' : '#1DB954',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
                  {button.text}
                </Text>
              </Pressable>
            ))}

            {buttons.filter((b) => b.style === 'cancel').map((button, i) => (
              <Pressable
                key={`cancel-${i}`}
                onPress={() => handlePress(button)}
                style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#F3F4F6' }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#6B7280' }}>
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
