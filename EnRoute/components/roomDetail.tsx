// components/roomDetail.tsx
// Room detail bottom sheet — matches the Figma design:
//   - Large room number + building name
//   - Walk icon button with estimated time (tapping starts navigation)
//   - Ratings row + Availability row
//   - Room photo placeholder

import React from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native";
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

const ROOM_IMAGES: Record<string, any[]> = {
    "1253": [
        require("../assets/images/1253_1.jpg"), require("../assets/images/1253_1.jpg"),
    ],
    "1202": [
        require("../assets/images/1200_1202.jpg"),
    ],
    "1200": [
        require("../assets/images/1200_1202.jpg"),
    ],
    "1263": [
        require("../assets/images/1263_1.jpg"), require("../assets/images/1263_2.jpg"),
    ],
    "Bathroom": [
        require("../assets/images/bath0.jpg"), require("../assets/images/bath5.jpg")
    ],

};

export default function RoomDetailSheet({ node, estimatedMinutes = 3, onNavigate, onDismiss }: Props) {
    const roomImages = ROOM_IMAGES[roomNumber(node.label)] || [];

    return (
        <View style={styles.container}>
            {/* Room number + building */}
            <View style={styles.roomHeaderRow}>
                <View>
                    <Text style={styles.roomNumber}>{roomNumber(node.label)}</Text>
                    <Text style={styles.buildingName}> PFT Hall</Text>
                </View>

                <Pressable onPress={onDismiss} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#111" />
                </Pressable>
            </View>

            {/* Walk / Navigate button */}
            <Pressable style={styles.navigateBtn} onPress={onNavigate}>
                <Ionicons name="walk" size={28} color="#d6eaf8" />
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
            {roomImages.length > 0 ? (
                <View style={styles.photoGalleryWrap}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        contentContainerStyle={styles.photoScrollContent}
                    >
                        {roomImages.map((img, index) => (
                            <Image
                                key={index}
                                source={img}
                                style={styles.roomPhoto}
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>
                </View>
            ) : (
                <View style={styles.photoPlaceholder}>
                    <Ionicons name="image-outline" size={36} color="#bbb" />
                    <Text style={styles.photoPlaceholderText}>No photo available</Text>
                </View>
            )}

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
        marginTop: -3,
    },
    navigateBtn: {
        width: "90%",
        backgroundColor: "#1A365D",
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
    },
    navigateTime: {
        fontSize: 15,
        fontWeight: "700",
        color: "#d6eaf8",
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
    photoGalleryWrap: {
        width: "100%",
        alignSelf: "center",
    },
    photoScrollContent: {
        paddingLeft: 0,
        paddingRight: 12,
    },
    roomPhoto: {
        width: 345,
        height: 300,
        borderRadius: 16,
        marginRight: 12,
    },
    roomHeaderRow: {
        width: "90%",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-start", // no spacing needed anymore
    },

    closeButton: {
        position: "absolute",
        top: -4.5,       // move UP
        right: -15,     // move RIGHT
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(0,0,0,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
});