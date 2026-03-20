import { Image } from 'expo-image';
import { Platform, StyleSheet,Text } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import "../../global.css"


import { OrbitControls } from "@react-three/drei/native";
import { Canvas } from "@react-three/fiber/native";
import { Suspense } from "react";
import { View } from "react-native";

import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";

function Model() {
  const asset = Asset.fromModule(require("../../assets/models/1stFloorModel.glb"));
  const { scene } = useGLTF(asset.uri);
  return <primitive object={scene} scale={0.1} />;
}

export default function HomeScreen() {
  return (
   <View style={{ flex: 1 }}>
      <Canvas
        style={{ flex: 1 }}
        camera={{ position: [0, 1.5, 4], fov: 50 }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 2]} intensity={1} />
        <directionalLight position={[-3, 5, -2]} intensity={1} />
        <directionalLight position={[-5, 7, 0]} intensity={0.8} />
        <directionalLight position={[5, 3, 0]} intensity={0.8} />
        <directionalLight position={[0, -5, 2]} intensity={0.8} />

        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.8}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
