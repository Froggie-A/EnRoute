import "../../global.css";
import React, { Suspense, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Dimensions, Pressable } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import { OrbitControls, useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";

import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function Model() {
  const asset = Asset.fromModule(require("../../assets/models/1stFloorModel.glb"));
  const { scene } = useGLTF(asset.uri);
  return <primitive object={scene} scale={0.1} />;
}

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {/* 3D MAP */}
      <Canvas style={styles.canvas} camera={{ position: [0, 1.5, 4], fov: 50 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 2]} intensity={1} />
        <directionalLight position={[-3, 5, -2]} intensity={1} />
        <directionalLight position={[-5, 7, 0]} intensity={0.8} />
        <directionalLight position={[5, 3, 0]} intensity={0.8} />
        <directionalLight position={[0, -5, 2]} intensity={0.8} />

        <Suspense fallback={null}>
          <Model />
        </Suspense>

        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>

      {/* BOTTOM SHEET */}
      <View
        style={[
          styles.bottomSheet,
          {
            height: isExpanded ? SCREEN_HEIGHT * 0.62 : 90,
            borderRadius: isExpanded ? 26 : 32,
          },
        ]}
      >
        {/* HANDLE */}
        <Pressable
          style={styles.handleWrap}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.handle} />
        </Pressable>

        {/* SEARCH BAR */}
        <Pressable onPress={() => setIsExpanded(true)}>
          <SearchBarRow search={search} setSearch={setSearch} />
        </Pressable>

        {/* EXPANDED CONTENT */}
        {isExpanded && (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Nearby</Text>
            <NearbyChips />

            <Text style={styles.sectionTitle}>Events</Text>

            <EventCard
              title="Resume Help"
              date="Feb 28 • 11 AM - 7 PM"
              location="PFT 3147"
              type="book-outline"
            />

            <EventCard
              title="Flutter Workshop"
              date="Mar 1 • 6 AM - 1 PM"
              location="PFT 2246"
              type="laptop-outline"
            />

            <EventCard
              title="Relaxation Social"
              date="Mar 2 • 1 PM - 10 PM"
              location="PFT 1255"
              type="chatbubble-outline"
              color="#E67E22"
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "rgba(189, 189, 189, 0.75)",
    borderWidth: 1,
    borderColor: "rgb(255, 255, 255)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
});