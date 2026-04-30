// components/NavOverlay.tsx

import React, { useRef, useMemo, useEffect, useState } from "react";
import {
    View, Text, StyleSheet, Pressable,
    Animated, PanResponder, Dimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RouteResult, RouteStep } from "@/navigation/pathfinding";

const SCREEN_H      = Dimensions.get("window").height;
const PILL_INSET    = 16;
const COLLAPSED_H   = 90;
const MAX_EXPANDED_H = SCREEN_H * 0.78;

const ROW_HANDLE  = 20;
const ROW_STATS   = 68;
const ROW_DEST    = 52;
const ROW_STEP    = 40;
const ROW_END_BTN = 64;
const ROW_PADDING = 32;

function computeExpandedHeight(stepCount: number): number {
    const natural = ROW_HANDLE + ROW_STATS + ROW_DEST + stepCount * ROW_STEP + ROW_END_BTN + ROW_PADDING;
    return Math.min(natural, MAX_EXPANDED_H);
}

// ── Merged step type ──────────────────────────────────────────────────────────
type MergedStep = {
    instruction: string;
    displayFt: number;        // summed distance for display
    walkSeconds: number;
    isFloorTransition: boolean;
    isLast: boolean;
};

// Collapse consecutive identical instructions into one step with summed distance.
// "Continue straight 3ft" + "Continue straight 7ft" → "Continue straight 10ft"
function mergeSteps(steps: RouteStep[]): MergedStep[] {
    if (!steps.length) return [];
    const out: MergedStep[] = [];
    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const prev = out[out.length - 1];
        const canMerge =
            prev &&
            prev.instruction === s.instruction &&
            !prev.isFloorTransition &&
            !s.isFloorTransition &&
            !prev.isLast;
        if (canMerge) {
            prev.displayFt   += s.distanceFt;
            prev.walkSeconds += s.walkSeconds;
            prev.isLast       = i === steps.length - 1;
        } else {
            out.push({
                instruction:      s.instruction,
                displayFt:        s.distanceFt,
                walkSeconds:      s.walkSeconds,
                isFloorTransition: s.isFloorTransition,
                isLast:           i === steps.length - 1,
            });
        }
    }
    return out;
}

function meaningfulRaw(r: RouteResult): RouteStep[] {
    return r.steps.filter(s => !s.instruction.startsWith("Start at"));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatETA(secs: number): string {
    const d = new Date();
    d.setSeconds(d.getSeconds() + Math.max(0, secs));
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function iconFor(instruction: string): React.ComponentProps<typeof Ionicons>["name"] {
    const l = instruction.toLowerCase();
    if (l.includes("left"))                               return "arrow-back";
    if (l.includes("right"))                              return "arrow-forward";
    if (l.includes("arrived") || l.includes("you have")) return "location";
    if (l.includes("elevator") || l.includes("stairs"))  return "swap-vertical";
    return "arrow-up";
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
    route: RouteResult;
    destinationLabel?: string;
    onEndRoute: () => void;
};

export default function NavOverlay({ route, destinationLabel, onEndRoute }: Props) {

    // Merge steps once per route update
    const merged = useMemo(() => mergeSteps(meaningfulRaw(route)), [route]);
    const step   = merged[0] ?? null;
    const after  = merged[1] ?? null;
    const roomNum = destinationLabel?.match(/\d{4}/)?.[0] ?? destinationLabel ?? "";

    // ── Live elapsed time ─────────────────────────────────────────────────────
    // Starts counting when this component mounts (navigation begins).
    // Resets whenever the route's total distance changes (reroute event).
    const startRef  = useRef(Date.now());
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        // New route (reroute or nav start) — reset the clock
        startRef.current = Date.now();
        setElapsed(0);
    }, [route.totalDistanceFt]);

    useEffect(() => {
        const id = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 5000); // update every 5 s — no need for per-second flicker
        return () => clearInterval(id);
    }, []);

    // Remaining = originally estimated walk time + however many seconds have passed
    // This ensures the ETA and minute count only go UP as the user takes longer.
    const remainingSecs = route.totalWalkSeconds + elapsed;

    // ── Pill drag animation ───────────────────────────────────────────────────
    const EXPANDED_H   = useMemo(() => computeExpandedHeight(merged.length), [merged.length]);
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
                pillHeight.setValue(
                    Math.max(COLLAPSED_H, Math.min(EXPANDED_H, heightAtDrag.current - g.dy))
                );
            },
            onPanResponderRelease: (_, g) => {
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

    const expandedOpacity = pillHeight.interpolate({
        inputRange: [COLLAPSED_H, COLLAPSED_H + 50],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });
    const stepListHeight = pillHeight.interpolate({
        inputRange:  [COLLAPSED_H, EXPANDED_H],
        outputRange: [0, Math.max(0, EXPANDED_H - ROW_HANDLE - ROW_STATS - ROW_DEST - ROW_END_BTN - ROW_PADDING)],
        extrapolate: "clamp",
    });

    return (
        <>
            {/* ── Top instruction card ───────────────────────────────────── */}
            <View style={styles.topCard} pointerEvents="none">
                <View style={styles.primaryRow}>
                    <View style={styles.instructionBlock}>
                        <Text style={styles.primaryText} numberOfLines={2}>
                            {step?.instruction ?? "Follow the path"}
                        </Text>
                        {step && step.displayFt > 0 && (
                            <Text style={styles.primaryDist}>{Math.round(step.displayFt)} ft</Text>
                        )}
                    </View>
                    <View style={styles.arrowCircle}>
                        <Ionicons
                            name={step ? iconFor(step.instruction) : "arrow-up"}
                            size={32}
                            color="white"
                        />
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
                <View style={styles.pillHandle} />

                {/* Stats — strict equal thirds via flex:1 on each block */}
                <View style={styles.statsRow}>
                    <View style={styles.statBlock}>
                        <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>
                            {formatETA(remainingSecs)}
                        </Text>
                        <Text style={styles.statLbl}>arrival</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statBlock}>
                        <Text style={styles.statVal}>
                            {Math.ceil(remainingSecs / 60)}
                        </Text>
                        <Text style={styles.statLbl}>min</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statBlock}>
                        <Text style={styles.statVal}>
                            {Math.round(route.totalDistanceFt)}
                        </Text>
                        <Text style={styles.statLbl}>feet</Text>
                    </View>
                </View>

                {/* Expanded section fades in as pill opens */}
                <Animated.View style={[styles.expandedWrap, { opacity: expandedOpacity }]}>
                    {roomNum ? (
                        <View style={styles.destRow}>
                            <Ionicons name="location" size={17} color="rgba(255,255,255,0.75)" />
                            <Text style={styles.destText} numberOfLines={1}>{roomNum} PFT Hall</Text>
                        </View>
                    ) : null}

                    <Animated.View style={{ maxHeight: stepListHeight, overflow: "hidden" }}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            scrollEnabled={isExpanded.current}
                        >
                            {merged.map((s, i) => (
                                <View key={i} style={[styles.stepRow, i > 0 && styles.stepBorder]}>
                                    <Ionicons
                                        name={iconFor(s.instruction)}
                                        size={15}
                                        color="rgba(255,255,255,0.65)"
                                    />
                                    <Text style={styles.stepTxt} numberOfLines={2}>
                                        {s.instruction}
                                    </Text>
                                    {s.displayFt > 0 && (
                                        <Text style={styles.stepDist}>
                                            {Math.round(s.displayFt)} ft
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>

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
    primaryText:  { fontSize: 22, fontWeight: "800", color: "white", lineHeight: 28 },
    primaryDist:  { fontSize: 15, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
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

    // Equal thirds: flex:1 on each block, no justifyContent:'space-around'
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    statBlock: {
        flex: 1,
        alignItems: "center",
        gap: 2,
    },
    // Font size 22 so the ETA time string (e.g. "12:45 PM") never overflows
    statVal: {
        fontSize: 22,
        fontWeight: "800",
        color: "white",
    },
    statLbl: {
        fontSize: 11,
        color: "rgba(255,255,255,0.45)",
        fontWeight: "500",
    },
    statDiv: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.12)" },

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
    stepTxt:  { flex: 1, fontSize: 14, color: "rgba(255,255,255,0.72)", fontWeight: "500" },
    stepDist: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
    endBtn: {
        backgroundColor: "#E74C3C", borderRadius: 16,
        paddingVertical: 16, alignItems: "center", marginTop: 6,
    },
    endBtnTxt: { color: "white", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
});