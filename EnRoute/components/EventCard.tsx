import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EventCardProps = {
  title: string;
  date: string;
  location: string;
  type: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
};

export default function EventCard({
  title,
  date,
  location,
  type,
  color = "#3498DB",
}: EventCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={type} size={18} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      <Text style={styles.cardSubtitle}>
        {date} • {location}
      </Text>

      <Pressable>
        <Text style={styles.addText}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  addText: {
    color: "#3498DB",
    fontWeight: "700",
    alignSelf: "flex-end",
  },
});