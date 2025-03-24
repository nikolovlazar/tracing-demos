import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import 'react-native-reanimated';

import * as Sentry from '@sentry/react-native';

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay:
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient, // Only in native builds, not in Expo Go.
});

Sentry.init({
  dsn: 'https://595373d4bb6318992f25a7b2303dc80b@o4506044970565632.ingest.us.sentry.io/4509033750331392',

  integrations: [navigationIntegration, Sentry.reactNativeTracingIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost'],
  enableNativeFramesTracking:
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient, // Only in native builds, not in Expo Go.
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  const ref = useNavigationContainerRef();
  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack></Stack>
      <StatusBar style='auto' />
    </ThemeProvider>
  );
});
