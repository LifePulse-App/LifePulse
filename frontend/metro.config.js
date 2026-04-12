const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    ...defaultConfig.resolver,
    extraNodeModules: {
      ...(defaultConfig.resolver?.extraNodeModules || {}),
      crypto: require.resolve('react-native-quick-crypto'),
    },
    // Add Viro React asset extensions
    assetExts: [
      ...defaultConfig.resolver.assetExts,
      'obj', 'mtl', 'jpg', 'png', 'ttf', 'otf', 'glb', 'gltf', 'fbx', 'bin'
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);