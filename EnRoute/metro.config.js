const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('glb')

module.exports = config

const { withNativeWind } = require('nativewind/metro');
 
const config2 = getDefaultConfig(__dirname)
 
module.exports = withNativeWind(config2, { input: './global.css' })