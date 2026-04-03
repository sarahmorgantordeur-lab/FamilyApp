const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const expoConfig = getDefaultConfig(__dirname);

module.exports = withNativeWind(mergeConfig(expoConfig, {}), {
  input: './global.css',
});
