import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

type Floor = {
  label: string;
  value: number;
};

const FLOORS: Floor[] = [
  { label: "L3", value: 3 },
  { label: "L2", value: 2 },
  { label: "L1", value: 1 },
];

type FloorSwitcherProps = {
  activeFloor: number;
  onFloorChange: (floor: number) => void;
};

export function FloorSwitcher({
  activeFloor,
  onFloorChange,
}: FloorSwitcherProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 16,
        bottom: 120,
        zIndex: 9999,
        elevation: 9999,
        alignItems: "center",
      }}
    >
      {expanded ? (
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => setExpanded(false)}
            activeOpacity={0.85}
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.82)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
              zIndex: 2,
              elevation: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.16,
              shadowRadius: 8,
            }}
          >
            <ChevronDown size={24} color="#111" strokeWidth={2.5} />
          </TouchableOpacity>

          <View
            style={{
              marginTop: -8,
              width: 58,
              paddingTop: 14,
              paddingBottom: 8,
              borderRadius: 29,
              alignItems: "center",
              overflow: "hidden",
              backgroundColor: "rgba(160,160,160,0.28)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            {FLOORS.map((floor) => {
              const isActive = floor.value === activeFloor;

              return (
                <TouchableOpacity
                  key={floor.value}
                  onPress={() => {
                    onFloorChange(floor.value);
                    setExpanded(false);
                  }}
                  activeOpacity={0.8}
                  style={{
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: isActive ? "700" : "500",
                      color: "#fff",
                      opacity: isActive ? 1 : 0.9,
                    }}
                  >
                    {floor.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          activeOpacity={0.85}
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.82)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.35)",
            zIndex: 2,
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.16,
            shadowRadius: 8,
          }}
        >
          <ChevronUp size={24} color="#111" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}