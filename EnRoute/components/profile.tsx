import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onPress: () => void;
};

export default function ProfileButton({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.button}>
        <Ionicons name="person" size={20} color="#1A365D" />
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  container: {
    marginLeft: 10,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d3d4bc",
    justifyContent: "center",
    alignItems: "center",
  },
});