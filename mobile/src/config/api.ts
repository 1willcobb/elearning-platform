import Constants from 'expo-constants';

const ENV = {
  local: {
    apiUrl: 'http://localhost:3000',
  },
  preprod: {
    apiUrl: 'https://preprod-api.yourdomain.com',
  },
  production: {
    apiUrl: 'https://api.yourdomain.com',
  },
};

const getEnvVars = () => {
  const env = Constants.expoConfig?.extra?.environment || 'local';
  return ENV[env as keyof typeof ENV] || ENV.local;
};

export default getEnvVars();