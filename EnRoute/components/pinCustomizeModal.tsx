
import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";

import { styles } from "@/styles/homeScreenStyles";
import type { Pin } from "@/components/PinLayer";

type Props = {
  pendingPin: Pin | null;
  pinTitle: string;
  setPinTitle: (v: string) => void;
  pinColor: "red" | "blue" | "green" | "yellow";
  setPinColor: (c: "red" | "blue" | "green" | "yellow") => void;

  onCancel: () => void;
  onSave: () => void;
};

export default function PinCustomizeModal({
  pendingPin,
  pinTitle,
  setPinTitle,
  pinColor,
  setPinColor,
  onCancel,
  onSave,
}: Props) {
  if (!pendingPin) return null;

  return (
    <View style={styles.pinCustomizeOverlay} pointerEvents="auto">
      <View style={styles.pinCustomizeCard}>
        <Text style={styles.pinCustomizeTitle}>Customize Pin</Text>

        <TextInput
          value={pinTitle}
          onChangeText={setPinTitle}
          placeholder="Pin Name"
          placeholderTextColor="#888"
          style={styles.pinInput}
        />

        <View style={styles.colorRow}>
          {[
            { label: "red" as const, hex: "#D94040" },
            { label: "blue" as const, hex: "#2F80ED" },
            { label: "green" as const, hex: "#27AE60" },
            { label: "yellow" as const, hex: "#F2C94C" },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => setPinColor(item.label)}
              style={[
                styles.colorDot,
                { backgroundColor: item.hex },
                pinColor === item.label && styles.selectedColorDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.pinActionRow}>
          <Pressable style={styles.cancelPinButton} onPress={onCancel}>
            <Text style={styles.cancelPinText}>Cancel</Text>
          </Pressable>

          <Pressable style={styles.savePinButton} onPress={onSave}>
            <Text style={styles.savePinText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}