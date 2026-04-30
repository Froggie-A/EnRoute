// components/testpathLabel.tsx
// Apple Maps-style destination label pill.
// Tracks the 3D endpoint world position via endLabelPosRef.
// Hidden during navigation and when no path is active.

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import { endLabelPosRef } from "./testpath";

const PILL_W  = 140;
const PILL_H  = 36;
const LIFT_PX = 60;

type LabelProps = {
    label?: string;
    isNavigating?: boolean;
    sheetIndex?: number;
};

export default function TestPathLabel({
                                          label,
                                          isNavigating = false,
                                          sheetIndex = 1,
                                      }: LabelProps) {
    const animX   = useRef(new Animated.Value(-999)).current;
    const animY   = useRef(new Animated.Value(-999)).current;
    const visible = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let rafId: number;

        function tick() {
            const pos = endLabelPosRef.current;
            if (pos && !isNavigating && sheetIndex < 1) {
                animX.setValue(pos.x - PILL_W / 2);
                animY.setValue(pos.y - PILL_H - LIFT_PX);
                visible.setValue(1);
            } else {
                visible.setValue(0);
            }
            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isNavigating]);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.pill,
                {
                    opacity: visible,
                    transform: [{ translateX: animX }, { translateY: animY }],
                },
            ]}
        >
            <Text style={styles.label} numberOfLines={1}>{label ?? "Destination"}</Text>
            <View style={styles.notch} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    pill: {
        position: "absolute",
        top: 0,
        left: 0,
        width: PILL_W,
        height: PILL_H,
        backgroundColor: "#1A365D",
        borderRadius: PILL_H / 2,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 6,
        // Low zIndex so BottomSheet and NavOverlay always render on top
        zIndex: 5,
    },
    label: {
        color: "white",
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    notch: {
        position: "absolute",
        bottom: -7,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#1A365D",
    },
});