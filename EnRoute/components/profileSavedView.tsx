import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "@/styles/homeScreenStyles";
import type { Pin } from "@/components/PinLayer";
import { SwipeDeletePinRow } from "@/components/swipeDeletePin";

type Props = {
  savedEvents: any[];
  pins: Pin[];
  getPinHex: (color?: Pin["color"]) => string;

  onCloseProfile: () => void;
  onSavedEventPress: (event: any) => void;
  onSavedPinPress: (pin: Pin) => void;
  onDeletePin: (index: number) => void;
};

export default function ProfileSavedView({
  savedEvents,
  pins,
  getPinHex,
  onCloseProfile,
  onSavedEventPress,
  onSavedPinPress,
  onDeletePin,
}: Props) {
  return (
    <View style={styles.profileSavedView}>
      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={24} color="#1A365D" />
          </View>

          <View>
            <Text style={styles.profileName}>User</Text>
            <Text style={styles.profileEmail}>mikeTheTiger@lsu.edu</Text>
          </View>
        </View>

        <Pressable onPress={onCloseProfile}>
          <Ionicons name="close" size={34} color="#111" />
        </Pressable>
      </View>

      <Text style={styles.profileTitle}>Saved Events</Text>

      <View style={styles.savedCard}>
        {savedEvents.length === 0 ? (
          <Text style={styles.savedItem}>No saved events yet</Text>
        ) : (
          savedEvents.map((event) => (
            <Pressable
              key={event.title}
              onPress={() => onSavedEventPress(event)}
            >
              <Text style={styles.savedItem}>{event.title}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Text style={styles.profileTitle}>Saved Rooms</Text>

      <View style={styles.savedCard}>
        <Text style={styles.savedItem}>PFT 1263</Text>
        <Text style={styles.savedItem}>PFT 1200</Text>
        <Text style={styles.savedItem}>PFT 1225</Text>
      </View>

      <Text style={styles.profileTitle}>Saved Pins</Text>

      <View style={styles.savedCard}>
        {pins.length === 0 ? (
          <Text style={styles.savedItem}>No Saved Pins</Text>
        ) : (
          pins.map((pin, index) => (
            <SwipeDeletePinRow
              key={`saved-pin-${index}`}
              pin={pin}
              index={index}
              getPinHex={getPinHex}
              onPress={() => onSavedPinPress(pin)}
              onDelete={() => onDeletePin(index)}
            />
          ))
        )}
      </View>
    </View>
  );
}