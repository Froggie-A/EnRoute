import React from "react";
import { Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "@/styles/homeScreenStyles";

type Props = {
  visible: boolean;
  translateY: Animated.Value;
};

export default function PinSavedToast({ visible, translateY }: Props) {
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.pinSavedToast,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={22} color="#111" />

      <Text style={styles.pinSavedToastText}>Pin Saved Under Profile</Text>
    </Animated.View>
  );
}