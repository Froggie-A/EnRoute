import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Line, Path, Rect,G } from "react-native-svg";

type Mode = "pin" | "navigate" | null;

type Props = {
  mode: Mode;
  onSelect: (mode: Mode) => void;
};

export default function PlacePinControls({ mode, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Svg width={64} height={120} viewBox="0 0 64 120">
        <Rect
          x="7"
          y="8"
          width="50"
          height="100"
          rx="25"
          fill="rgba(120,120,120,0.55)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.5}
        />

        {mode === "pin" && (
          <Rect
            x="11"
            y="10"
            width="42"
            height="47"
            rx="20"
            fill="rgba(255,255,255,0.2)"
          />
        )}

        {mode === "navigate" && (
          <Rect
            x="11"
            y="60"
            width="42"
            height="47"
            rx="20"
            fill="rgba(255,255,255,0.2)"
          />
        )}

        <Circle cx="32" cy="25" r={9} fill="#C94343" />
        <Line
          x1="32"
          y1="34"
          x2="32"
          y2="50"
          stroke="#C94343"
          strokeWidth={4}
          strokeLinecap="round"
        />

        <G transform="rotate(-12 28 78)">
            <Path
                d="M14 92 
                L39 68 
                L34 100 
                L27 88 Z"
                fill="#B9E6FF"
            />
            </G>
      </Svg>

     
      <Pressable
        style={[styles.hitbox, { top: 8, height: 52 }]}
        onPress={() => onSelect(mode === "pin" ? null : "pin")}
      />

    
      <Pressable
        style={[styles.hitbox, { bottom: 8, height: 52 }]}
        onPress={() => onSelect(mode === "navigate" ? null : "navigate")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 125,
    right: 14,
    zIndex: 20,
  },
  hitbox: {
    position: "absolute",
    left: 7,
    right: 7,
  },
});