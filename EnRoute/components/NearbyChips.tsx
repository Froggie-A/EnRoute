import { StyleSheet, Text, View } from "react-native";

const nearbyItems = ["Restrooms", "Study Rooms", "Vending Machines"];

export default function NearbyChips() {
  return (
    <View style={styles.chipRow}>
      {nearbyItems.map((item) => (
        <View key={item} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: "#D6D4C0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
  },
});