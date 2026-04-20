import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>😵</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: '#0F1419', textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </Text>
            <Pressable
              onPress={this.handleReset}
              style={{
                backgroundColor: '#1DB954', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                Try again
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
