import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/lib/stores/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const C = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>😵</Text>
        <Text
          numberOfLines={2}
          style={{ alignSelf: 'stretch', fontFamily: 'DMSans_700Bold', fontSize: 20, lineHeight: 26, color: C.textPrimary, textAlign: 'center' }}
        >
          Something went wrong
        </Text>
        <Text
          numberOfLines={6}
          ellipsizeMode="tail"
          selectable
          style={{ alignSelf: 'stretch', fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}
        >
          {error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Pressable
          onPress={onReset}
          style={{
            backgroundColor: C.buttonPrimaryBg, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24,
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: C.buttonPrimaryText }}
          >
            Try again
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
