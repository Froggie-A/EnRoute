import {FlatList, StyleSheet, Text, View} from "react-native";
import {useLocalSearchParams} from "expo-router";

type EventItem = {
    id: string
    title: string;
    date: string;
    time: string;
    type: string;
    location: string;
};

const mockEvents: EventItem[] = [
    {
        id: "1",
        title: "Resume Help",
        date: "Feb 28 • ",
        time: " 11 AM - 7 PM • ",
        type: "Student Government",
        location: "PFT 3147"
    },

];

export default function EventsScreen() {
    const {query} = useLocalSearchParams();
    const searchText = 
        typeof query === "string" ? query.toLowerCase() : "";

    const filteredEvents = mockEvents.filter(event =>
        event.title.toLowerCase().includes(searchText)
    );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Results for: {typeof query === "string" ? query : "All Events"}
      </Text>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text>{item.time}</Text>
            <Text>{item.location}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No matching events found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f3ea",
    padding: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fffdf7",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
  },
});
