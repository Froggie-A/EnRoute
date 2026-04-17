// components/NavOverlay.tsx
//
// Apple Maps style navigation overlay.
// Bottom pill height is computed from the actual step count so it always
// fits all steps. A hard cap of 80% screen height prevents it from
// covering the top instruction card. If steps overflow, the list scrolls.

import React, { useRef, useMemo } from "react";
import {
    View, Text, StyleSheet, Pressable,
    Animated, PanResponder, Dimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RouteResult, RouteStep } from "@/navigation/pathfinding";

const SCREEN_H    = Dimensions.get("window").height;
const PILL_INSET  = 16;
const COLLAPSED_H = 90;   // just the stats row
// Max height: 80% of screen, leaving room for the top card + safe area
const MAX_EXPANDED_H = SCREEN_H * 0.78;

// Per-item heights (approximate)
const ROW_STATS    = 68;
const ROW_HANDLE   = 20;
const ROW_DEST     = 52;
const ROW_STEP     = 40;
const ROW_END_BTN  = 64;
const ROW_PADDING  = 32;  // top + bottom padding

function computeExpandedHeight(stepCount: number): number {
    const natural =
        ROW_HANDLE + ROW_STATS + ROW_DEST +
        stepCount * ROW_STEP +
        ROW_END_BTN + ROW_PADDING;
    return Math.min(natural, MAX_EXPANDED_H);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatETA(s: number): string {
    const d = new Date();
    d.setSeconds(d.getSeconds() + s);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function iconFor(i: string): React.ComponentProps<typeof Ionicons>["name"] {
    const l = i.toLowerCase();
    if (l.includes("left"))                              return "arrow-back";
    if (l.includes("right"))                             return "arrow-forward";
    if (l.includes("arrived") || l.includes("you have")) return "location";
    if (l.includes("elevator") || l.includes("stairs")) return "swap-vertical";
    return "arrow-up";
}

function firstStep(r: RouteResult): RouteStep | null {
    return r.steps.find(s => !s.instruction.startsWith("Start at")) ?? r.steps[0] ?? null;
}
function nextStep(r: RouteResult): RouteStep | null {
    const s = r.steps.filter(s => !s.instruction.startsWith("Start at"));
    return s[1] ?? null;
}
function meaningfulSteps(r: RouteResult): RouteStep[] {
    return r.steps.filter(s => !s.instruction.startsWith("Start at"));
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
    route: RouteResult;
    destinationLabel?: string;
    onEndRoute: () => void;
};

export default function NavOverlay({ route, destinationLabel, onEndRoute }: Props) {
    const step    = firstStep(route);
    const after   = nextStep(route);
    const steps   = meaningfulSteps(route);
    const roomNum = destinationLabel?.match(/\d{4}/)?.[0] ?? destinationLabel ?? "";

    // Compute expanded height based on real step count
    const EXPANDED_H = useMemo(
        () => computeExpandedHeight(steps.length),
        [steps.length]
    );

    const pillHeight   = useRef(new Animated.Value(COLLAPSED_H)).current;
    const isExpanded   = useRef(false);
    const heightAtDrag = useRef(COLLAPSED_H);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
            onPanResponderGrant: () => {
                heightAtDrag.current = isExpanded.current ? EXPANDED_H : COLLAPSED_H;
            },
            onPanResponderMove: (_, g) => {
                const newH = Math.max(
                    COLLAPSED_H,
                    Math.min(EXPANDED_H, heightAtDrag.current - g.dy)
                );
                pillHeight.setValue(newH);
            },
            onPanResponderRelease: (_, g) => {
                // Snap up if dragged > 40pt upward, or if already expanded and barely moved
                const expand = g.dy < -40 || (isExpanded.current && g.dy > -40 && g.dy < 40);
                isExpanded.current = expand;
                Animated.spring(pillHeight, {
                    toValue: expand ? EXPANDED_H : COLLAPSED_H,
                    useNativeDriver: false,
                    tension: 60,
                    friction: 10,
                }).start();
            },
        })
    ).current;

    // Fade expanded content in as pill grows past collapsed
    const expandedOpacity = pillHeight.interpolate({
        inputRange: [COLLAPSED_H, COLLAPSED_H + 50],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    // Step list height = pill height minus fixed chrome
    const stepListHeight = pillHeight.interpolate({
        inputRange: [COLLAPSED_H, EXPANDED_H],
        outputRange: [0, Math.max(0, EXPANDED_H - ROW_HANDLE - ROW_STATS - ROW_DEST - ROW_END_BTN - ROW_PADDING)],
        extrapolate: "clamp",
    });

    return (
        <>
            {/* ── Top card ───────────────────────────────────────────────── */}
            <View style={styles.topCard} pointerEvents="none">
                <View style={styles.primaryRow}>
                    <View style={styles.instructionBlock}>
                        <Text style={styles.primaryText} numberOfLines={2}>
                            {step?.instruction ?? "Follow the path"}
                        </Text>
                        {step?.distanceFt ? (
                            <Text style={styles.primaryDist}>{Math.round(step.distanceFt)} ft</Text>
                        ) : null}
                    </View>
                    <View style={styles.arrowCircle}>
                        <Ionicons name={step ? iconFor(step.instruction) : "arrow-up"} size={32} color="white" />
                    </View>
                </View>
                <View style={styles.cardDivider} />
                {after && (
                    <View style={styles.nextRow}>
                        <Ionicons name={iconFor(after.instruction)} size={18} color="rgba(255,255,255,0.55)" />
                        <Text style={styles.nextText} numberOfLines={1}>{after.instruction}</Text>
                    </View>
                )}
            </View>

            {/* ── Bottom pill ────────────────────────────────────────────── */}
            <Animated.View
                style={[styles.pill, { height: pillHeight }]}
                {...panResponder.panHandlers}
            >
                {/* Drag handle */}
                <View style={styles.pillHandle} />

                {/* Stats — always visible */}
                <View style={styles.statsRow}>
                    <View style={styles.statBlock}>
                        <Text style={styles.statVal}>{formatETA(route.totalWalkSeconds)}</Text>
                        <Text style={styles.statLbl}>arrival</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statBlock}>
                        <Text style={styles.statVal}>{Math.ceil(route.totalWalkSeconds / 60)}</Text>
                        <Text style={styles.statLbl}>min</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statBlock}>
                        <Text style={styles.statVal}>{Math.round(route.totalDistanceFt)}</Text>
                        <Text style={styles.statLbl}>feet</Text>
                    </View>
                </View>

                {/* Expanded content — fades in when pill opens */}
                <Animated.View style={[styles.expandedWrap, { opacity: expandedOpacity }]}>
                    {/* Destination */}
                    {roomNum ? (
                        <View style={styles.destRow}>
                            <Ionicons name="location" size={17} color="rgba(255,255,255,0.75)" />
                            <Text style={styles.destText} numberOfLines={1}>{roomNum} PFT Hall</Text>
                        </View>
                    ) : null}

                    {/* Step list — scrollable so it works for long routes */}
                    <Animated.View style={{ maxHeight: stepListHeight, overflow: "hidden" }}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            scrollEnabled={isExpanded.current}
                        >
                            {steps.map((s, i) => (
                                <View key={i} style={[styles.stepRow, i > 0 && styles.stepBorder]}>
                                    <Ionicons name={iconFor(s.instruction)} size={15} color="rgba(255,255,255,0.65)" />
                                    <Text style={styles.stepTxt} numberOfLines={2}>{s.instruction}</Text>
                                    {s.distanceFt > 0 && (
                                        <Text style={styles.stepDist}>{Math.round(s.distanceFt)} ft</Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>

                    {/* End route */}
                    <Pressable style={styles.endBtn} onPress={onEndRoute}>
                        <Text style={styles.endBtnTxt}>End Route</Text>
                    </Pressable>
                </Animated.View>
            </Animated.View>
        </>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const DARK  = "rgba(20, 30, 50, 0.94)";
const DARK2 = "rgba(30, 42, 64, 0.88)";

const styles = StyleSheet.create({
    // Top card
    topCard: {
        position: "absolute", top: 52, left: 12, right: 12, zIndex: 50,
        backgroundColor: DARK, borderRadius: 22, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 14,
    },
    primaryRow: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 18, paddingLeft: 20, paddingRight: 16, gap: 12,
    },
    instructionBlock: { flex: 1, gap: 2 },
    primaryText: { fontSize: 22, fontWeight: "800", color: "white", lineHeight: 28 },
    primaryDist: { fontSize: 15, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
    arrowCircle: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center", justifyContent: "center",
    },
    cardDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 16 },
    nextRow: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 13, paddingHorizontal: 20,
        backgroundColor: DARK2, gap: 12,
    },
    nextText: { fontSize: 15, color: "rgba(255,255,255,0.6)", fontWeight: "600", flex: 1 },

    // Pill
    pill: {
        position: "absolute", bottom: 28,
        left: PILL_INSET, right: PILL_INSET,
        backgroundColor: DARK, borderRadius: 26,
        zIndex: 50, paddingHorizontal: 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 14,
    },
    pillHandle: {
        alignSelf: "center", width: 36, height: 4,
        borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)",
        marginTop: 10, marginBottom: 2,
    },

    // Stats
    statsRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-around", paddingVertical: 8,
    },
    statBlock: { alignItems: "center", gap: 2 },
    statVal: { fontSize: 28, fontWeight: "800", color: "white" },
    statLbl: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "500" },
    statDiv: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.12)" },

    // Expanded
    expandedWrap: { gap: 8, paddingBottom: 8 },
    destRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 10, paddingHorizontal: 14,
        backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14,
    },
    destText: { fontSize: 16, fontWeight: "700", color: "white", flex: 1 },

    stepRow: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 9, gap: 10,
    },
    stepBorder: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
    stepTxt: { flex: 1, fontSize: 14, color: "rgba(255,255,255,0.72)", fontWeight: "500" },
    stepDist: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "500" },

    endBtn: {
        backgroundColor: "#E74C3C", borderRadius: 16,
        paddingVertical: 16, alignItems: "center", marginTop: 6,
    },
    endBtnTxt: { color: "white", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
});