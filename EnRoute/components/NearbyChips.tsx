import { StyleSheet, Text, Pressable, ScrollView, View } from "react-native";

const nearbyItems = [
  "Restrooms",
  "Study Rooms",
  "Vending Machines",
  "Water Fountains",
  "Elevators",
  "Emergency Exits",
  "Fire Extinguishers",
  "Defibrillators",
];

export default function NearbyChips({
  selected,
  setSelected,
}: {
  selected: string[];
  setSelected: (items: string[]) => void;
}) {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  return (
    <View onStartShouldSetResponder={() => true}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {nearbyItems.map((item) => {
          const active = selected.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => toggle(item)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#D3D4BC",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  chipActive: {
    backgroundColor: "#1B4466",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
  chipTextActive: {
    color: "#f2f2f2",
  },
});