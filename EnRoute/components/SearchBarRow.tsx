import { StyleSheet, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileButton from "./profile";

type SearchBarRowProps = {
  search: string;
  setSearch: (value: string) => void;
  onPressExpand: () => void;
  onPressProfile: () => void;
};

export default function SearchBarRow({
  search,
  setSearch,
  onPressExpand,
  onPressProfile,
}: SearchBarRowProps) {
  return (

<View style={styles.searchRow}>
  
  <Pressable
    style={styles.searchInputContainer}
    onPress={onPressExpand}
  >
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
      onFocus={onPressExpand}
      numberOfLines={1}
    />
  </Pressable>

  <View style={{ marginLeft: 0}}>
    <ProfileButton onPress={onPressProfile} />
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
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(120, 116, 116, 0.75)",
    borderRadius: 999,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    minHeight: 20,
    paddingVertical: 10,
    color: "white",
    fontSize: 16,
    minWidth: 0,
  },
});