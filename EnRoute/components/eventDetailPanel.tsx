import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "@/styles/homeScreenStyles";

type EventType = {
  title: string;
  date: string;
  location: string;
  description: string;
};

type Props = {
  selectedEvent: EventType | null;
  isSaved: (title: string) => boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onNavigate: () => void;
};

export default function EventDetailPanel({
  selectedEvent,
  isSaved,
  onBack,
  onToggleSave,
  onNavigate,
}: Props) {
  if (!selectedEvent) return null;

  return (
    <View>

      <View style={styles.detailHeaderRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>

        <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
      </View>

      <View style={styles.eventActionRow}>
        <Pressable style={styles.eventActionButton} onPress={onToggleSave}>
          <Ionicons
            name={isSaved(selectedEvent.title) ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#111"
          />
          <Text style={styles.eventActionText}>
            {isSaved(selectedEvent.title) ? "Saved" : "Save"}
          </Text>
        </Pressable>

        <Pressable style={styles.eventActionButton} onPress={onNavigate}>
          <Ionicons name="navigate-outline" size={22} color="#111" />
          <Text style={styles.eventActionText}>Navigate</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>About</Text>

      <View style={styles.aboutCard}>
        <View style={styles.aboutRow}>
          <Ionicons name="calendar-outline" size={16} color="#222" />
          <Text style={styles.aboutText}>{selectedEvent.date}</Text>
        </View>

        <View style={styles.aboutRowLast}>
          <Ionicons name="location-outline" size={16} color="#222" />
          <Text style={styles.aboutText}>{selectedEvent.location}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Event Details</Text>

      <View style={styles.aboutCard}>
        <Text style={styles.eventDetailText}>
          {selectedEvent.description}
        </Text>
      </View>
    </View>
  );
}