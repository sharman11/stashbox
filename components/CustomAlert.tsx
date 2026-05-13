import * as Haptics from 'expo-haptics';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/lib/stores/theme';

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
  const C = useAppTheme();
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
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.overlay }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: C.surface,
            borderRadius: 20,
            paddingTop: 28,
            paddingBottom: 20,
            paddingHorizontal: 24,
            width: '85%',
            maxWidth: 360,
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
                backgroundColor: hasDestructive ? C.errorBg : C.accentLight,
              }}
            >
              <Text style={{ fontSize: 24 }}>{config.icon}</Text>
            </View>
          )}

          <Text
            numberOfLines={3}
            ellipsizeMode="tail"
            style={{
              alignSelf: 'stretch',
              fontFamily: 'DMSans_700Bold',
              fontSize: 18,
              lineHeight: 24,
              color: C.textPrimary,
              textAlign: 'center',
            }}
          >
            {config.title}
          </Text>

          {config.message && (
            <ScrollView
              style={{ alignSelf: 'stretch', maxHeight: 220, marginTop: 8 }}
              contentContainerStyle={{ paddingVertical: 2 }}
              showsVerticalScrollIndicator
            >
              <Text
                selectable
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: C.textSecondary,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {config.message}
              </Text>
            </ScrollView>
          )}

          <View style={{ width: '100%', marginTop: 22, gap: 8 }}>
            {buttons.filter((b) => b.style !== 'cancel').map((button, i) => {
              const isDestructive = button.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  onPress={() => handlePress(button)}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: isDestructive ? '#EF4444' : C.buttonPrimaryBg,
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 16,
                      color: isDestructive ? '#FFFFFF' : C.buttonPrimaryText,
                    }}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}

            {buttons.filter((b) => b.style === 'cancel').map((button, i) => (
              <Pressable
                key={`cancel-${i}`}
                onPress={() => handlePress(button)}
                style={{ paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', backgroundColor: C.borderLight }}
              >
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: C.textSecondary }}
                >
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
