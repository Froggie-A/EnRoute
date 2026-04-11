import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NavNode } from "@/navigation/db";

type Props = {
    node: NavNode;
    onNavigate: () => void;
    onDismiss: () => void;
};

const TYPE_LABELS: Record<string, string> = {
    classroom: "Classroom",
    lab: "Lab",
    bathroom: "Restroom",
    vending: "Vending",
    study_spot: "Study Spot",
    water_fountain: "Water Fountain",
    aed: "AED",
    fire_exit: "Fire Exit",
    fire_extinguisher: "Fire Extinguisher",
    entrance: "Entrance",
    exit: "Exit",
    elevator: "Elevator",
    stairs: "Stairs",
    hallway: "Hallway",
};

function roomNumber(label: string): string {
    const match = label.match(/\d{4}/);
    return match ? match[0] : label;
}

export default function RoomDetailSheet({ node, onNavigate, onDismiss }: Props) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Pressable onPress={onDismiss} style={styles.iconBtn}>
                    <Ionicons name="bookmark-outline" size={20} color="#555" />
                </Pressable>

                <View style={styles.titleBlock}>
                    <Text style={styles.roomNumber}>{roomNumber(node.label)}</Text>
                    <Text style={styles.buildingName}>PFT Hall</Text>
                </View>

                <View style={{ width: 38 }} />
            </View>

            {/* Navigate button */}
            <Pressable style={styles.navigateBtn} onPress={onNavigate}>
                <Ionicons name="walk" size={26} color="#1A365D" />
                <Text style={styles.navigateBtnText}>Navigate</Text>
            </Pressable>

            {/* Meta row */}
            <View style={styles.metaRow}>
                <View style={styles.metaBlock}>
                    <Text style={styles.metaHeader}>TYPE</Text>
                    <Text style={styles.metaValue}>
                        {TYPE_LABELS[node.type] ?? node.type}
                    </Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaBlock}>
                    <Text style={styles.metaHeader}>FLOOR</Text>
                    <Text style={styles.metaValue}>{node.floor}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaBlock}>
                    <Text style={styles.metaHeader}>ACCESSIBLE</Text>
                    <Text style={styles.metaValue}>{node.accessible ? "Yes" : "No"}</Text>
                </View>
            </View>

            {/* Photo placeholder */}
            <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={36} color="#bbb" />
                <Text style={styles.photoPlaceholderText}>No photo available</Text>
            </View>

            {/* Debug id */}
            <Text style={styles.debugId}>{node.id}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "#f0f0e8",
        alignItems: "center",
        justifyContent: "center",
    },
    titleBlock: {
        alignItems: "center",
    },
    roomNumber: {
        fontSize: 28,
        fontWeight: "800",
        color: "#111",
        letterSpacing: -0.5,
    },
    buildingName: {
        fontSize: 13,
        color: "#888",
        marginTop: 2,
    },
    navigateBtn: {
        backgroundColor: "#d6eaf8",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        marginBottom: 20,
    },
    navigateBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1A365D",
    },
    metaRow: {
        flexDirection: "row",
        backgroundColor: "#f0f0e8",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginBottom: 16,
        alignItems: "center",
    },
    metaBlock: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    metaDivider: {
        width: 1,
        height: 32,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    metaHeader: {
        fontSize: 10,
        fontWeight: "700",
        color: "#aaa",
        letterSpacing: 0.8,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
        textTransform: "capitalize",
        textAlign: "center",
    },
    photoPlaceholder: {
        height: 140,
        borderRadius: 14,
        backgroundColor: "#f0f0e8",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 12,
    },
    photoPlaceholderText: {
        fontSize: 13,
        color: "#bbb",
    },
    debugId: {
        fontSize: 10,
        color: "#ccc",
        textAlign: "center",
        fontFamily: "monospace",
    },
});