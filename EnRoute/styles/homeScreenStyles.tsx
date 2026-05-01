import { StyleSheet } from "react-native"; 


export const styles = StyleSheet.create({
container: {
    flex: 1
  },
  emptytext: {
    paddingHorizontal: 20,
    color: "#666",
    marginTop: 8,
    fontSize: 15
  },
  canvasAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  pinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3
  },
  stretchPanelWrap: {
    position: "absolute",
    zIndex: 50,
    elevation: 50,
  },


  stretchPanel: {
    flex: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },

  dragHeader: {
    paddingTop: 6,
    paddingBottom: 4,
  },

  stretchHandleArea: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 6,
  },


  stretchHandle: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(120, 120, 120, 0.35)",
  },
  stretchSearchShell: {
    marginHorizontal: 0,
    marginBottom: 4,
    borderRadius: 30,
    backgroundColor: "transparent",
    paddingVertical: 0,
  },

  stretchContentWrap: {
    flex: 1,
    paddingBottom: 18,
  },

  bottomSheetBackground: {
    backgroundColor: "rgba(235, 235, 218, 1) ",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  handleIndicator: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  sheetContentContainer: {
    paddingBottom: 20,
  },

  radiusText: {
    marginTop: 16,
    marginBottom: 30,
    color: "#333",
    fontWeight: "600",
    paddingHorizontal: 20,
  },

  mapGestureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 42,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  eventTitle: {
    fontSize: 28,
    fontWeight: "500",
    color: "#222",
    flexShrink: 1,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#222",
    marginTop: 6,
    paddingHorizontal: 12,
  },

  aboutCard: {
    backgroundColor: "rgba(253, 254, 238, 1)",
    boxShadow: '0px 4px 4px 2px rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  aboutRowLast: {
    flexDirection: "row",
    alignItems: "center",
  },

  aboutText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },

  eventDetailText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  eventActionRow: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 40,
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  eventActionButton: {
    backgroundColor: "#BFDDF3",
    borderRadius: 14,
    width: 112,
    height: 72,
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
  },

  eventActionText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  pinButton: {
    position: "absolute",
    bottom: 140,
    right: 20,
    width: 54,
    height: 110,
    borderRadius: 27,
    backgroundColor: "rgba(120, 116, 116, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 14,
    zIndex: 20,
    elevation: 10,
  },

  pinContainer: {
    alignItems: "center",
  },

  pinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D94040",
    zIndex: 2,
  },

  pinBase: {
    width: 4,
    height: 16,
    backgroundColor: "#D94040",
    borderRadius: 2,
    marginTop: -4,
  },

  arrow: {
  },
  profileSavedView: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },

  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  profileTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },

  savedCard: {
    backgroundColor: "#FFFDF0",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  savedItem: {
    fontSize: 16,
    color: "#111",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },
  profileCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e7e6d8",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
  },

  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d3d4bc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  profileEmail: {
    fontSize: 15,
    color: "#111",
  },

  pinCustomizeCard: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [
      { translateX: -145 },
      { translateY: -160 },
    ],
    width: 320,


    backgroundColor: "rgba(235, 235, 218, 1)",
    borderRadius: 22,
    padding: 18,
    zIndex: 100,
    elevation: 20,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },


  pinCustomizeTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },

  pinInput: {
    backgroundColor: "#FFFDF0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
  },

  colorRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },

  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
  },

  selectedColorDot: {
    borderWidth: 3,
    borderColor: "#111",
  },

  pinActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  cancelPinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#DDD",
    alignItems: "center",
  },

  savePinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#BFDDF3",
    alignItems: "center",
  },

  cancelPinText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  savePinText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  pinPressable: {
    alignItems: "center",
    justifyContent: "center",
  },

  arrowPressable: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  pinSavedToast: {
    position: "absolute",
    bottom: 120,
    height: 46,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(235, 235, 218, 1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 200,
    elevation: 30,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  pinSavedToastText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  swipeDeleteWrap: {
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },

  deleteButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 110,
    backgroundColor: "#D94040",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },

  savedPinRow: {
    backgroundColor: "#FFFDF0",
  },

  savedPinPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingRight: 28,
  },

  savedPinLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  savedItemNoBorder: {
    fontSize: 16,
    color: "#111",
  },

  swipeIndicator: {
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 3,
  },

  swipeLine: {
    width: 14,
    height: 2,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 2,
  },
  pinCustomizeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    zIndex: 200,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 40,
  },



  filterResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(253, 254, 238, 1)",
    borderRadius: 18,
    padding: 22,
    marginBottom: 12,
    marginLeft: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  filterResultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  filterResultSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  filterIconCircle: {
    width: 44,
    height: 44,
    marginRight: 8,
    marginLeft: -4,
    borderRadius: 22,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },

  filterIconImage: {
    width: 46,
    height: 46,
  },
// ── Unified pill styles — used by room, event, search, and floating pills ──
  collapsedPill: {
    height: 54,
    marginHorizontal: 14,
    marginBottom: 2,
    borderRadius: 999,
    backgroundColor: "rgba(253, 254, 238, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  collapsedPillTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  collapsedPillTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  collapsedPillSub: {
    fontSize: 11,
    color: "#777",
    marginTop: 1,
  },
  collapsedPillClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  // Floating pill (for gorhom BottomSheet collapse — room/directions)
  floatingPill: {
    position: "absolute",
    bottom: 36,
    left: 20,
    right: 20,
    height: 54,
    backgroundColor: "rgba(253, 254, 238, 0.97)",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 10,
    zIndex: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },


 
});