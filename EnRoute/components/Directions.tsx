import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NavNode } from "@/navigation/db";
import type { RouteResult, RouteStep } from "@/navigation/pathfinding";

// Hardcoded start node
export const START_NODE_ID = "entrance_0";

type Props = {
    destination: NavNode;
    route: RouteResult | null;
    onAvoidStairsChange: (val: boolean) => void;
    onConfirm: () => void;
    onBack: () => void;
};

type MergedStep = {
    instruction: string;
    distanceFt: number;
    walkSeconds: number;
    isFloorTransition: boolean;
    isLast: boolean;
};

function formatMinutes(seconds: number): string {
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
}

function formatETA(seconds: number): string {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatFeet(ft: number): string {
    if (ft >= 5280) return `${(ft / 5280).toFixed(1)} mi`;
    return `${ft} ft`;
}

// Merge consecutive steps that have the same instruction into one,
// summing their distance and time.
function mergeSteps(steps: RouteStep[]): MergedStep[] {
    if (steps.length === 0) return [];

    const merged: MergedStep[] = [];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const last = merged[merged.length - 1];

        // Two steps can merge if they have the same instruction text,
        // are not floor transitions, and are not the final arrival step.
        const canMerge =
            last &&
            last.instruction === step.instruction &&
            !last.isFloorTransition &&
            !step.isFloorTransition &&
            !last.isLast;

        if (canMerge) {
            last.distanceFt += step.distanceFt;
            last.walkSeconds += step.walkSeconds;
            // If this is the last step we're merging into, mark it
            last.isLast = i === steps.length - 1;
        } else {
            merged.push({
                instruction: step.instruction,
                distanceFt: step.distanceFt,
                walkSeconds: step.walkSeconds,
                isFloorTransition: step.isFloorTransition,
                isLast: i === steps.length - 1,
            });
        }
    }

    return merged;
}

function stepIcon(step: MergedStep): React.ComponentProps<typeof Ionicons>["name"] {
    if (step.isLast) return "location";
    if (step.isFloorTransition) return "swap-vertical";
    const lower = step.instruction.toLowerCase();
    if (lower.includes("left")) return "arrow-back";
    if (lower.includes("right")) return "arrow-forward";
    if (lower.includes("straight") || lower.includes("continue")) return "arrow-up";
    if (lower.includes("arrived")) return "location";
    return "arrow-forward";
}

export default function DirectionsSheet({
                                            destination,
                                            route,
                                            onAvoidStairsChange,
                                            onConfirm,
                                            onBack,
                                        }: Props) {
    const [avoidStairs, setAvoidStairs] = useState(false);

    const hasStairs = (route?.floorTransitions ?? 0) > 0;

    const mergedSteps = useMemo(
        () => (route ? mergeSteps(route.steps) : []),
        [route]
    );

    return (
        <View style={styles.container}>
            {/* Title row */}
            <View style={styles.titleRow}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#555" />
                </Pressable>
                <Text style={styles.title}>Directions</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Origin → destination card */}
            <View style={styles.routeCard}>
                <View style={styles.routeRow}>
                    <View style={styles.originDot}>
                        <Ionicons name="navigate" size={14} color="#e74c3c" />
                    </View>
                    <Text style={styles.routeLabel}>My location</Text>
                    <Ionicons name="reorder-three" size={18} color="#aaa" />
                </View>

                <View style={styles.routeConnector}>
                    <View style={styles.routeLine} />
                </View>

                <View style={styles.routeRow}>
                    <View style={styles.destDot} />
                    <Text style={styles.routeLabel} numberOfLines={1}>
                        {destination.label}
                    </Text>
                    <Ionicons name="reorder-three" size={18} color="#aaa" />
                </View>
            </View>

            {/* Avoid stairs toggle */}
            <View style={styles.toggleCard}>
                <Text style={styles.toggleLabel}>AVOID STAIRS</Text>
                <Switch
                    value={avoidStairs}
                    onValueChange={(val) => {
                        setAvoidStairs(val);
                        onAvoidStairsChange(val);
                    }}
                    trackColor={{ false: "rgba(255,255,255,0.2)", true: "#60a5fa" }}
                    thumbColor="#fff"
                    ios_backgroundColor="rgba(255,255,255,0.2)"
                />
            </View>

            {/* Route summary */}
            {route ? (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.summaryTime}>
                            {formatMinutes(route.totalWalkSeconds)}
                        </Text>
                        <Text style={styles.summaryMeta}>
                            {formatETA(route.totalWalkSeconds)} ETA · {formatFeet(route.totalDistanceFt)}
                        </Text>
                        <Text style={styles.summaryMeta}>
                            {hasStairs
                                ? `${route.floorTransitions} floor change${route.floorTransitions > 1 ? "s" : ""}`
                                : "No stairs"}
                        </Text>
                    </View>

                    <Pressable style={styles.goBtn} onPress={onConfirm}>
                        <Ionicons name="arrow-forward" size={22} color="#fff" />
                    </Pressable>
                </View>
            ) : (
                <View style={styles.noRouteCard}>
                    <Ionicons name="alert-circle-outline" size={20} color="#e74c3c" />
                    <Text style={styles.noRouteText}>No route found</Text>
                </View>
            )}

            {/* Merged step list */}
            {mergedSteps.length > 1 && (
                <View style={styles.stepsContainer}>
                    <Text style={styles.stepsHeader}>STEP BY STEP</Text>
                    {mergedSteps.map((step, i) => (
                        <View key={i} style={styles.stepRow}>
                            <View style={styles.stepIconWrap}>
                                <Ionicons
                                    name={stepIcon(step)}
                                    size={14}
                                    color="#1A365D"
                                />
                            </View>
                            <View style={styles.stepText}>
                                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                                {step.distanceFt > 0 && (
                                    <Text style={styles.stepDistance}>
                                        {formatFeet(step.distanceFt)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 32,
        gap: 12,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#f0f0e8",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#111",
    },
    routeCard: {
        backgroundColor: "#d6eaf8",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    routeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    originDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    destDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#1A365D",
    },
    routeLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        color: "#1A365D",
    },
    routeConnector: {
        paddingLeft: 11,
        paddingVertical: 4,
    },
    routeLine: {
        width: 2,
        height: 14,
        backgroundColor: "rgba(26,54,93,0.25)",
        borderRadius: 1,
    },
    toggleCard: {
        backgroundColor: "#1A365D",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    toggleLabel: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.8,
    },
    summaryCard: {
        backgroundColor: "#d6eaf8",
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summaryLeft: {
        gap: 3,
    },
    summaryTime: {
        fontSize: 32,
        fontWeight: "800",
        color: "#1A365D",
        lineHeight: 36,
    },
    summaryMeta: {
        fontSize: 13,
        color: "#555",
    },
    goBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#27ae60",
        alignItems: "center",
        justifyContent: "center",
    },
    noRouteCard: {
        backgroundColor: "#fdecea",
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    noRouteText: {
        fontSize: 15,
        color: "#e74c3c",
        fontWeight: "600",
    },
    stepsContainer: {
        backgroundColor: "#f0f0e8",
        borderRadius: 14,
        padding: 14,
        gap: 10,
    },
    stepsHeader: {
        fontSize: 10,
        fontWeight: "700",
        color: "#aaa",
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    stepIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#d6eaf8",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
    },
    stepText: {
        flex: 1,
        gap: 2,
    },
    stepInstruction: {
        fontSize: 13,
        fontWeight: "500",
        color: "#222",
        lineHeight: 18,
    },
    stepDistance: {
        fontSize: 11,
        color: "#888",
    },
});