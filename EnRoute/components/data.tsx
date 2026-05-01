import type { Pin } from "@/components/PinLayer";
  
  
  // Events for the Search Bar
  export const events = [
    {
      id: "1",
      title: "Resume Help",
      date: "Feb 28 • 11 AM - 7 PM",
      club: "Student Government",
      location: "PFT 1200",
      type: "book-outline" as const,
      description: "Resume review event details here.",
    },
    {
      id: "2",
      title: "Flutter Workshop",
      date: "April 29 • 6 PM - 7 PM",
      club: "Women in Cybersecurity",
      location: "PFT 1100",
      type: "laptop-outline" as const,
      description: "Flutter workshop details here.",
    },
    {
      id: "3",
      title: "Relaxation Social",
      date: "Mar 2 • 1 PM - 10 PM",
      club: "Robotics",
      location: "PFT 1255",
      type: "chatbubble-outline" as const,
      description: "Relaxation social details here.",
    },
    {
      id: "4",
      title: "Physics Tutoring",
      date: "Mar 4 • 4 PM - 8 PM",
      club: "Society of Physics Students",
      location: "PFT 2612",
      type: "book-outline" as const,
      description: "Physics tutoring details here.",
    },
    {
      id: "5",
      title: "Free Lunch Event",
      date: "Mar 6 • 11 AM - 2 PM",
      club: "Google Developer Student Club",
      location: "PFT 1145",
      type: "chatbubble-outline" as const,
      description: "Free lunch event details here.",
    },
  ];

  
    // Icons for filter search results
    export const FILTER_ICONS: Record<string, any> = {
      "Restrooms": require("@/assets/images/restroom-icon.png"),
      "Study Rooms": require("@/assets/images/study-room-icon.png"),
      "Vending Machines": require("@/assets/images/vending-mach-icon.png"),
      "Water Fountains": require("@/assets/images/water-fount-icon.png"),
      "Elevators": require("@/assets/images/elevator-icon.png"),
      "Emergency Exits": require("@/assets/images/emer-exit-icon.png"),
      "Fire Extinguishers": require("@/assets/images/fire-exting-icon.png"),
      "Defibrillators": require("@/assets/images/first-aid-icon.png"),
    };


    // Maps the 3D Pin model color to a hex color for the saved pins icon under the profile.
      export const getPinHex = (color?: Pin["color"]) => {
        switch (color) {
          case "blue":
            return "#2F80ED";
          case "green":
            return "#27AE60";
          case "yellow":
            return "#F2C94C";
          case "red":
          default:
            return "#D94040";
        }
      };