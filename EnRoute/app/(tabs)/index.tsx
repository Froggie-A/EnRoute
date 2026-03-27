import "../../global.css";
import React, { Suspense, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  PanResponder,
  Animated,
} from "react-native";
import { Canvas } from "@react-three/fiber/native";
import { OrbitControls, useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import * as Location from "expo-location";

import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";

function Model() {
  const asset = Asset.fromModule(require("../../assets/models/1stFloorModel.glb"));
  const { scene } = useGLTF(asset.uri);
  return <primitive object={scene} scale={0.1} />;
}

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1, height: 1 });
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

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

  const normalizeLocation = (lat: number, lon: number) => {
    const x = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
    const y = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
    return { x, y };
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => pinMode,
    onPanResponderGrant: (evt) => {
      if (!pinMode) return;

      const { locationX, locationY } = evt.nativeEvent;
      const normalizedX = locationX / mapSize.width;
      const normalizedY = locationY / mapSize.height;

      setDraggingPin({ x: normalizedX, y: normalizedY });
    },
    onPanResponderMove: (evt) => {
      if (!pinMode) return;

      const { locationX, locationY } = evt.nativeEvent;
      const normalizedX = locationX / mapSize.width;
      const normalizedY = locationY / mapSize.height;

      setDraggingPin({ x: normalizedX, y: normalizedY });
    },
    onPanResponderRelease: () => {
      if (draggingPin) {
        setPins((prev) => [...prev, draggingPin]);
        setDraggingPin(null);
        setPinMode(false);
      }
    },
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

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
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setMapSize({ width, height });
      }}
    >
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

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.8}
        />
      </Canvas>

      {/* PAN OVERLAY */}
      <View style={styles.panOverlay} {...panResponder.panHandlers} />

      {/* PIN MODE BUTTON */}
      <Pressable
        onPress={() => setPinMode(!pinMode)}
        style={[
          styles.pinButton,
          { backgroundColor: pinMode ? "red" : "blue" },
        ]}
      >
        <Text style={styles.pinButtonText}>
          {pinMode ? "Place Pin" : "Add Pin"}
        </Text>
      </Pressable>

      {/* DEBUG GPS */}
      {location && (
        <Text style={styles.gpsText}>
          {location.coords.latitude.toFixed(6)},{" "}
          {location.coords.longitude.toFixed(6)}
        </Text>
      )}

      {/* DRAGGING PIN */}
      {draggingPin && (
        <View
          style={[
            styles.draggingPin,
            {
              left: draggingPin.x * mapSize.width - 10,
              top: draggingPin.y * mapSize.height - 10,
            },
          ]}
        />
      )}

      {/* PLACED PINS */}
      {pins.map((pin, index) => (
        <View
          key={index}
          style={[
            styles.placedPin,
            {
              left: pin.x * mapSize.width - 6,
              top: pin.y * mapSize.height - 6,
            },
          ]}
        />
      ))}

      {/* USER LOCATION */}
      {location &&
        (() => {
          const pos = normalizeLocation(
            location.coords.latitude,
            location.coords.longitude
          );

          return (
            <View
              style={[
                styles.userDot,
                {
                  left: pos.x * mapSize.width - 6,
                  top: pos.y * mapSize.height - 6,
                },
              ]}
            />
          );
        })()}

      {/* BOTTOM SHEET */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: isExpanded ? mapSize.height * 0.62 : 90,
            borderRadius: isExpanded ? 26 : 32,
          },
        ]}
      >
        <Pressable
          style={styles.handleWrap}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.handle} />
        </Pressable>

        <Pressable onPress={() => setIsExpanded(true)}>
          <SearchBarRow search={search} setSearch={setSearch} />
        </Pressable>

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
      </Animated.View>
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
  panOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
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
    zIndex: 30,
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
  pinButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    padding: 12,
    borderRadius: 24,
    zIndex: 20,
  },
  pinButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  gpsText: {
    position: "absolute",
    top: 50,
    left: 20,
    color: "white",
    fontSize: 14,
    zIndex: 20,
  },
  draggingPin: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "red",
    borderRadius: 10,
    zIndex: 20,
  },
  placedPin: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "red",
    borderRadius: 6,
    zIndex: 20,
  },
  userDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    zIndex: 20,
  },
});