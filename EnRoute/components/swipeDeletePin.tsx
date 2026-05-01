import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Pin } from "@/components/PinLayer";
import { styles } from "@/styles/homeScreenStyles";

// Swipe function to delete the exising pins under the profile page
export function SwipeDeletePinRow({
                             pin,
                             index,
                             onPress,
                             onDelete,
                             getPinHex,
                           }: {
  pin: Pin;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  getPinHex: (color?: Pin["color"]) => string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const startXRef = useRef(0);
  const isOpenRef = useRef(false);
  const isSwipingRef = useRef(false);

  const DELETE_WIDTH = 110;

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const deleteScale = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [1, 0.7],
    extrapolate: "clamp",
  });

  const animateTo = (value: number) => {
    translateX.stopAnimation();

    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      damping: 22,
      stiffness: 240,
      mass: 0.8,
    }).start(() => {
      startXRef.current = value;
      isOpenRef.current = value === -DELETE_WIDTH;
    });
  };

  const closeRow = () => animateTo(0);
  const openRow = () => animateTo(-DELETE_WIDTH);

  const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,

        onMoveShouldSetPanResponder: (_, gesture) =>
            Math.abs(gesture.dx) > 6 &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          isSwipingRef.current = true;

          translateX.stopAnimation((value) => {
            startXRef.current = value;
          });
        },

        onPanResponderMove: (_, gesture) => {
          let nextX = startXRef.current + gesture.dx;

          if (nextX > 0) nextX = 0;
          if (nextX < -DELETE_WIDTH) nextX = -DELETE_WIDTH;

          translateX.setValue(nextX);
        },

        onPanResponderRelease: (_, gesture) => {
          const finalX = startXRef.current + gesture.dx;
          const shouldOpen = finalX <= -25 || gesture.vx < -0.25;

          if (shouldOpen) openRow();
          else closeRow();

          setTimeout(() => {
            isSwipingRef.current = false;
          }, 180);
        },

        onPanResponderTerminate: () => {
          isOpenRef.current ? openRow() : closeRow();

          setTimeout(() => {
            isSwipingRef.current = false;
          }, 180);
        },
      })
  ).current;

  return (
      <View style={styles.swipeDeleteWrap}>
        <Animated.View
            style={[
              styles.deleteButton,
              {
                opacity: deleteOpacity,
              },
            ]}
        >
          <Pressable
              onPress={() => {
                closeRow();
                onDelete();
              }}
          >
            <Animated.View
                style={{
                  transform: [{ scale: deleteScale }],
                }}
            >
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </Animated.View>
          </Pressable>
        </Animated.View>

        <Animated.View
            style={[
              styles.savedPinRow,
              {
                transform: [{ translateX }],
              },
            ]}
            {...panResponder.panHandlers}
        >
          <Pressable
              onPress={() => {
                if (!isSwipingRef.current) onPress();
              }}
              style={styles.savedPinPressable}
          >
            <View style={styles.savedPinLeft}>
              <Ionicons name="pin" size={20} color={getPinHex(pin.color)} />

              <Text style={styles.savedItemNoBorder}>
                {pin.title || "Untitled Pin"}
              </Text>
            </View>

            <View style={styles.swipeIndicator}>
              <View style={styles.swipeLine} />
              <View style={styles.swipeLine} />
              <View style={styles.swipeLine} />
            </View>
          </Pressable>
        </Animated.View>
      </View>
  );
}
