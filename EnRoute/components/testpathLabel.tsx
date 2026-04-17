// components/TestPathLabel.tsx
// Checkpoint 2 — Apple Maps-style destination label pill.
// A 2D React Native <View> that tracks the 3D endpoint world position.
//
// Place this OUTSIDE the <Canvas>, right after </Canvas> in index.tsx:
//   import TestPathLabel from "@/components/TestPathLabel";
//   ...
//   </Canvas>
//   <TestPathLabel />
//
// It reads endLabelPosRef from TestPath.tsx (updated every frame by useFrame)
// and repositions itself using a fast Animated value — no re-renders on every frame.

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import { endLabelPosRef } from "./testpath";

// Label dimensions — used to center the pill over the anchor point
const PILL_W  = 140;
const PILL_H  = 36;
// How far above the floor dot the pill floats (in screen pixels)
const LIFT_PX = 60;

type LabelProps = {
    label?: string;
    isNavigating?: boolean;
};

export default function TestPathLabel({ label, isNavigating = false }: LabelProps) {
    const animX = useRef(new Animated.Value(-999)).current;
    const animY = useRef(new Animated.Value(-999)).current;
    const visible = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let rafId: number;

        function tick() {
            const pos = endLabelPosRef.current;
            if (pos && !isNavigating) {
                // Center pill horizontally over the dot, lift it upward
                animX.setValue(pos.x - PILL_W / 2);
                animY.setValue(pos.y - PILL_H - LIFT_PX);
                visible.setValue(1);
            } else {
                visible.setValue(0);
            }
            // requestAnimationFrame keeps this in sync with the render loop
            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.pill,
                {
                    opacity: visible,
                    transform: [
                        { translateX: animX },
                        { translateY: animY },
                    ],
                },
            ]}
        >
            {/* Pill label */}
            <Text style={styles.label} numberOfLines={1}>{label ?? "Endpoint"}</Text>

            {/* Downward notch / triangle pointing to the floor dot */}
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
        // Drop shadow so it reads clearly against the 3D model
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 6,
        zIndex: 5,
    },
    label: {
        color: "white",
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    // Small triangle notch below the pill, pointing down toward the floor dot
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