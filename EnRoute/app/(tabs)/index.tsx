import "../../global.css";
import React, { Suspense, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Dimensions, Pressable } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import { Suspense } from "react";
import { View } from "react-native";



import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { Pressable, PanResponder } from 'react-native';
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
const [location, setLocation] = useState<Location.LocationObject | null>(null);
const [mapSize, setMapSize] = useState({ width: 1, height: 1 });

const bounds = {
  minLat: 30.123,
  maxLat: 30.124,
  minLon: -91.123,
  maxLon: -91.122,
};

type Pin = { x: number; y: number };

const [pins, setPins] = useState<Pin[]>([]);
const [pinMode, setPinMode] = useState(false);
const [draggingPin, setDraggingPin] = useState<Pin | null>(null);

const panResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => pinMode,
  onPanResponderGrant: (evt, gestureState) => {
    if (!pinMode) return;
    const { locationX, locationY } = evt.nativeEvent;
    const normalizedX = locationX / mapSize.width;
    const normalizedY = locationY / mapSize.height;
    setDraggingPin({ x: normalizedX, y: normalizedY });
  },
  onPanResponderMove: (evt, gestureState) => {
    if (!draggingPin) return;
    const { locationX, locationY } = evt.nativeEvent;
    const normalizedX = locationX / mapSize.width;
    const normalizedY = locationY / mapSize.height;
    setDraggingPin({ x: normalizedX, y: normalizedY });
  },
  onPanResponderRelease: () => {
    if (draggingPin) {
      setPins((prev) => [...prev, draggingPin]);
      setDraggingPin(null);
      setPinMode(false); // exit pin mode automatically
    }
  },
});

const normalizeLocation = (lat: number, lon: number) => {
  const x = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
  const y = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  return { x, y };
};

useEffect(() => {
  let subscription: Location.LocationSubscription;

  (async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        setLocation(loc);
      }
    );
  })();

  return () => {
    subscription?.remove();
  };
}, []);


return (
  <View
    style={{ flex: 1 }}
    onLayout={(e) => {
      const { width, height } = e.nativeEvent.layout;
      setMapSize({ width, height });
    }}
  >
    {/* 3D MAP */}
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

    <View
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  }}
  {...panResponder.panHandlers}
/>
    
<Pressable
  onPress={() => setPinMode(!pinMode)}
  style={{
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: pinMode ? 'red' : 'blue',
    padding: 12,
    borderRadius: 24,
    zIndex: 20,
  }}
>
  <Text style={{ color: 'white', fontWeight: 'bold' }}>
    {pinMode ? 'Place Pin' : 'Add Pin'}
  </Text>
</Pressable>

   {/* DEBUG: show GPS coordinates */}
{location && (
  <Text
    style={{
      position: 'absolute',
      top: 50,
      left: 20,
      color: 'white',
      fontSize: 14,
      zIndex: 20,
    }}
  >
    {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
  </Text>
)}

{/* DRAGGING PIN */}
{draggingPin && (
  <View
    style={{
      position: 'absolute',
      left: draggingPin.x * mapSize.width - 10,
      top: draggingPin.y * mapSize.height - 10,
      width: 20,
      height: 20,
      backgroundColor: 'red',
      borderRadius: 10,
    }}
  />
)}

{/* PLACED PINS */}
{pins.map((pin, index) => (
  <View
    key={index}
    style={{
      position: 'absolute',
      left: pin.x * mapSize.width - 6,
      top: pin.y * mapSize.height - 6,
      width: 12,
      height: 12,
      backgroundColor: 'red',
      borderRadius: 6,
    }}
  />
))}

    {/* USER LOCATION OVERLAY */}
    {location && (() => {
      const pos = normalizeLocation(
        location.coords.latitude,
        location.coords.longitude
      );

      return (
        <View
          style={{
            position: 'absolute',
            left: pos.x * mapSize.width - 6,
            top: pos.y * mapSize.height - 6,
          }}
          className="w-3 h-3 bg-blue-500 rounded-full"
        />
      );
    })()}

  </View>
);
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