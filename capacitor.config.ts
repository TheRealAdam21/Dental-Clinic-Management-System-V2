import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dentalclinic.app',
  appName: 'dental-clinic',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#2563eb',
    },
  },
};

export default config;
