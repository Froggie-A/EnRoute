
import { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import type { ViewStyle } from "react-native";
import { MapPin, X } from "lucide-react-native";

type Props = {
  placing: boolean;
  onToggle: () => void;
};

export function PinSwitcher({ placing, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 16,
        bottom: 120, // slightly above floor switcher
        zIndex: 2,
        elevation: 2,
        alignItems: "center",
      }}
    >
      {expanded ? (
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => setExpanded(false)}
            style={btnStyle}
          >
            <X size={24} color="#111" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggle}
            style={[
              btnStyle,
              {
                marginTop: 8,
                backgroundColor: placing ? "#ff4d4d" : "white",
              },
            ]}
          >
            <MapPin size={22} color={placing ? "#fff" : "#111"} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          style={btnStyle}
        >
          <MapPin size={24} color="#111" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const btnStyle: ViewStyle = {
  width: 58,
  height: 58,
  borderRadius: 29,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.82)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.35)",
  elevation: 10,
};