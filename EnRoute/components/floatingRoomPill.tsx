import React from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "@/styles/homeScreenStyles";
import type { NavNode } from "@/navigation/db";

type Props = {
  visible: boolean;
  selectedNode: NavNode | null;

  onOpen: () => void;
  onClose: () => void;
};

export default function FloatingRoomPill({
  visible,
  selectedNode,
  onOpen,
  onClose,
}: Props) {
  if (!visible || !selectedNode) return null;

  return (
    <Pressable style={styles.floatingPill} onPress={onOpen}>
      <Text style={styles.collapsedPillTitle} numberOfLines={1}>
        {selectedNode.label.replace(/ - [AB]$/, "")}
      </Text>

      <Pressable
        hitSlop={10}
        style={styles.collapsedPillClose}
        onPress={(e) => {
          e.stopPropagation(); // IMPORTANT so it doesn't trigger onOpen
          onClose();
        }}
      >
        <Ionicons name="close" size={16} color="#555" />
      </Pressable>
    </Pressable>
  );
}