import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SearchBarRowProps = {
  search: string;
  setSearch: (value: string) => void;
};

export default function SearchBarRow({
  search,
  setSearch,
}: SearchBarRowProps) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchInputContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#ffffff"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchBar}
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#f2f2f2"
        />
      </View>

      <View style={styles.profileButton}>
        <Ionicons name="person" size={20} color="#1A365D" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(120, 116, 116, 1)",
    borderRadius: 100,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d7d3b8",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});