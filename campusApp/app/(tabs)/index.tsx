import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Task {
  _id: string;
  title: string;
  description: string;
  bounty?: number;
  price?: number;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("https://campus-errands.onrender.com/api/tasks");

      if (!res.ok) {
        throw new Error("Network response not ok");
      }

      const data = await res.json();
      console.log("DATA:", data);

      setTasks(data);
    } catch (error) {
      console.log("FETCH ERROR:", error);
      setError("Failed to fetch tasks");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchTasks();
    }
  }, [isLoggedIn]);

  const renderItem = ({ item }: { item: Task }) => {
    const bountyPrice = item.bounty !== undefined ? item.bounty : item.price;

    return (
      <View style={styles.taskContainer}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.taskDescription}>{item.description}</Text>
        <Text style={styles.taskBounty}>₹{bountyPrice ?? 'N/A'}</Text>
      </View>
    );
  };

  // 🔐 FAKE LOGIN (FOR DEMO)
  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Campus Errands</Text>
        <Text style={styles.loginSubtitle}>Demo Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => setIsLoggedIn(true)}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Errands</Text>

        <TouchableOpacity onPress={fetchTasks}>
          <Text style={{ color: "white" }}>Reload</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 30,
  },
  loginTitle: {
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
  },
  loginSubtitle: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#1c1c1c',
    color: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#00e676',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  taskContainer: {
    backgroundColor: '#1c1c1c',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskDescription: {
    color: '#aaa',
    marginTop: 5,
  },
  taskBounty: {
    color: '#00e676',
    marginTop: 10,
    fontWeight: 'bold',
  },
});