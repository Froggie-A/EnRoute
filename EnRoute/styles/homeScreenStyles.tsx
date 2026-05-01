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
  // Full-screen canvas / 3d scene layer
  canvasAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  // Map loading overlay
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  // Overlay layer for interactive map pins
  pinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3
  },
  //Stretch panel / Bottom Sheet
  stretchPanelWrap: {
    position: "absolute",
    zIndex: 50,
    elevation: 50,
  },

  // Main expandable panel styles
  stretchPanel: {
    flex: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },

  // Drag handle header area
  dragHeader: {
    paddingTop: 6,
    paddingBottom: 4,
  },

  // Small visual handle for dragging the panel
  stretchHandleArea: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 6,
  },

  //Actual handle element
  stretchHandle: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(120, 120, 120, 0.35)",
  },

  //transparent search bar shell in the stretch panel
  stretchSearchShell: {
    marginHorizontal: 0,
    marginBottom: 4,
    borderRadius: 30,
    backgroundColor: "transparent",
    paddingVertical: 0,
  },

  // Scrollable content area inside the stretch panel
  stretchContentWrap: {
    flex: 1,
    paddingBottom: 18,
  },

  //Expaned bottom sheet styles
  bottomSheetBackground: {
    backgroundColor: "rgba(235, 235, 218, 1) ",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  // Handle for dragging the bottom sheet
  handleIndicator: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  // ScrollView content container styles for bottom sheet
  sheetContentContainer: {
    paddingBottom: 20,
  },

  // -- Radius / Filter Labels

  // Text label showing current radius filter (e.g. "500m radius")
  radiusText: {
    marginTop: 16,
    marginBottom: 30,
    color: "#333",
    fontWeight: "600",
    paddingHorizontal: 20,
  },

  // Overlay layer for map gestures (to prevent conflicts with panel dragging)
  mapGestureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  // -- Event Detail View

  // Header row in the event detail view, containing back button and title
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 42,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
  },

 // Back button in the event detail header
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  // Title text in the event detail header
  eventTitle: {
    fontSize: 28,
    fontWeight: "500",
    color: "#222",
    flexShrink: 1,
  },

  // Section title text used in the event detail view (e.g. "About this event", "Directions")
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#222",
    marginTop: 6,
    paddingHorizontal: 12,
  },

  // Card style used for the "About this event" section in the event detail view
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

  // Row style used for individual pieces of information in the "About this event" section (e.g. date/time, location)
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  // Last row in the "About this event" section, which may contain additional details without a bottom margin
  aboutRowLast: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Body Text inside an About card row
  aboutText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },

  // Small secondary detail text
  eventDetailText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Horizontal row containing action buttons in the event detail view (e.g. "Get Directions", "Save Event")
  eventActionRow: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 40,
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  // Individual action button 
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

  // Label rendered inside an action button
  eventActionText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },

  // -- Map Pin Customization Modal Styles

  // Floating button that lets the user drop / mamage a custom pin on the map
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

  // Wrapper that centres the pin head and stem vertically
  pinContainer: {
    alignItems: "center",
  },

  // The circular "head" of the custom map pin
  pinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D94040",
    zIndex: 2,
  },

  // The rectangular "stem" of the custom map pin
  pinBase: {
    width: 4,
    height: 16,
    backgroundColor: "#D94040",
    borderRadius: 2,
    marginTop: -4,
  },

  arrow: {
  },

  // -- User Profile / Saved Items Style
  // Main container for the profile and saved items view
  profileSavedView: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },

  // Top row of the profile screen - title on left, action(s) on right
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  // Title text in the profile screen header
  profileTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },

  // Card style used for each section in the profile/saved items view (e.g. "Saved Events", "Saved Pins")
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

  // Individual item style for saved events/pins in the profile view
  savedItem: {
    fontSize: 16,
    color: "#111",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },

  // Last item in a saved events/pins list, which doesn't have a bottom border
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

  // Row containing the user's avatar and name/email information in the profile screen
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Circular avatar placeholder in the profile screen (could be replaced with an actual image)
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d3d4bc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  // User's name text in the profile screen
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  // User's email text in the profile screen, shown below the name
  profileEmail: {
    fontSize: 15,
    color: "#111",
  },

  // Card style for the pin customization modal, which appears when the user taps the floating pin button
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

  // Title text at the top of the pin customization modal
  pinCustomizeTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },

  // Text input style for entering a name or label for the custom map pin
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

  // Row containing color options for the custom map pin
  colorRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  
// Individual color option for the custom map pin, shown as a circular dot
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
  },

  // Style applied to the selected color option in the pin customization modal, adding a thicker border for emphasis
  selectedColorDot: {
    borderWidth: 3,
    borderColor: "#111",
  },

  // Row containing the "Cancel" and "Save" buttons in the pin customization modal
  pinActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  
  // "Cancel" button style in the pin customization modal
  cancelPinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#DDD",
    alignItems: "center",
  },

  // "Save" button style in the pin customization modal
  savePinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#BFDDF3",
    alignItems: "center",
  },

  // Text style for the "Cancel" button in the pin customization modal
  cancelPinText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  // Text style for the "Save" button in the pin customization modal
  savePinText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  // Wrapper for the floating pin button, centering the pin head and stem within the button
  pinPressable: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Wrapper for the back arrow button in the event detail view, centering the arrow icon within the button
  arrowPressable: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  // Toast notification that appears when a user saves a custom pin, confirming that the pin has been saved successfully
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

  // Text style for the message displayed in the toast notification when a custom pin is saved
  pinSavedToastText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  // Wrapper for each saved pin item in the profile/saved items view, allowing for swipe-to-delete functionality
  swipeDeleteWrap: {
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },

  // Style for the "Delete" button for pins
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

  // Background of a saved pin row
  savedPinRow: {
    backgroundColor: "#FFFDF0",
  },

  // Touchable content inside a saved-pin row
  savedPinPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingRight: 28,
  },

  // Left cluster inside a saved-pin row
  savedPinLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  // Pin label text
  savedItemNoBorder: {
    fontSize: 16,
    color: "#111",
  },

  // Container for the small visual indicator that appears when a user swipes a saved pin row, showing a line and "Delete" label
  swipeIndicator: {
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 3,
  },

  // Text label that appears when a user swipes a saved pin row
  swipeLine: {
    width: 14,
    height: 2,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 2,
  },

  // -- Pin Customization Modal Overlay

  // Semi-transparent overlay that appears behind the pin customization modal
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

  // Card shown for each filter result in the search results list, containing an icon, title, and subtitle
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

  // Title text for each filter result in the search results list
  filterResultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  // Subtitle text for each filter result in the search results list
  filterResultSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  // Circular wrapper for the filter icon in the search results list
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

  // Style for the filter icon image itself
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

  // Wrapper for the text content inside a collapsed pill
  collapsedPillTextWrap: {
    flex: 1,
    justifyContent: "center",
  },

  // Title text inside a collapsed pill (e.g. event name, room name)
  collapsedPillTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  // Subtitle text inside a collapsed pill (e.g. event time, number of people in room)
  collapsedPillSub: {
    fontSize: 11,
    color: "#777",
    marginTop: 1,
  },

  // Circular close button that appears on the right side of a collapsed pill, allowing the user to dismiss the pill and return to the map view
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