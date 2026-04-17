// components/roomDetail.tsx
// Room detail bottom sheet — matches the Figma design:
//   - Large room number + building name
//   - Walk icon button with estimated time (tapping starts navigation)
//   - Ratings row + Availability row
//   - Room photo placeholder

import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NavNode } from "@/navigation/db";

type Props = {
    node: NavNode;
    estimatedMinutes?: number;   // connect to real route time later
    onNavigate: () => void;
    onDismiss: () => void;
};

function roomNumber(label: string): string {
    const match = label.match(/\d{4}/);
    return match ? match[0] : label;
}

export default function RoomDetailSheet({ node, estimatedMinutes = 3, onNavigate, onDismiss }: Props) {
    return (
        <View style={styles.container}>
            {/* Room number + building */}
            <Text style={styles.roomNumber}>{roomNumber(node.label)}</Text>
            <Text style={styles.buildingName}>PFT Hall</Text>

            {/* Walk / Navigate button */}
            <Pressable style={styles.navigateBtn} onPress={onNavigate}>
                <Ionicons name="walk" size={28} color="#1A365D" />
                <Text style={styles.navigateTime}>{estimatedMinutes} min</Text>
            </Pressable>

            {/* Ratings + Availability row */}
            <View style={styles.metaRow}>
                <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>RATINGS</Text>
                    <View style={styles.metaValue}>
                        <Ionicons name="star" size={18} color="#F5A623" />
                        <Text style={styles.metaText}>4.0</Text>
                    </View>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>AVAILABILITY</Text>
                    <View style={styles.metaValue}>
                        <Ionicons name="people" size={22} color="#1A365D" />
                    </View>
                </View>
            </View>

            {/* Room photo */}
            <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={36} color="#bbb" />
                <Text style={styles.photoPlaceholderText}>No photo available</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 28,
        alignItems: "center",
        gap: 14,
    },
    roomNumber: {
        fontSize: 42,
        fontWeight: "800",
        color: "#111",
        letterSpacing: -1,
        marginTop: 4,
    },
    buildingName: {
        fontSize: 14,
        color: "#888",
        marginTop: -10,
    },
    navigateBtn: {
        width: "90%",
        backgroundColor: "#d6eaf8",
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
    },
    navigateTime: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1A365D",
        marginTop: 2,
    },
    metaRow: {
        width: "90%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingVertical: 4,
    },
    metaBlock: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    metaDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#aaa",
        letterSpacing: 0.8,
    },
    metaValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    photoPlaceholder: {
        width: "90%",
        height: 150,
        borderRadius: 16,
        backgroundColor: "#e8e8d8",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    photoPlaceholderText: {
        fontSize: 13,
        color: "#bbb",
    },
});