import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import axios from 'axios';

interface Task {
  _id: string;
  title: string;
  description: string;
  bounty?: number; // Depending on backend it could be bounty or price
  price?: number;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('https://campus-errands.onrender.com/api/tasks');
      setTasks(response.data);
    } catch (err) {
      setError('Failed to fetch tasks.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks only when logged in
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
        <Text style={styles.taskBounty}>Bounty: ₹{bountyPrice !== undefined ? bountyPrice : 'N/A'}</Text>
      </View>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Campus Errands</Text>
        <Text style={styles.loginSubtitle}>Sign in to view tasks</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          placeholderTextColor="#888888" 
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#888888" 
          secureTextEntry
        />
        
        <TouchableOpacity style={styles.loginButton} onPress={() => setIsLoggedIn(true)}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Errands</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={fetchTasks} disabled={loading}>
          <Text style={styles.reloadButtonText}>{loading ? 'Loading...' : 'Reload'}</Text>
        </TouchableOpacity>
      </View>

      {loading && tasks.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tasks available right now.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    padding: 30,
  },
  loginTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 5,
    textAlign: 'center',
  },
  loginSubtitle: {
    color: '#cccccc',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1c1c1c',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  loginButton: {
    backgroundColor: '#00e676',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00e676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Task List Styles
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  reloadButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
  },
  listContent: {
    padding: 20,
    paddingBottom: 50,
  },
  taskContainer: {
    backgroundColor: '#1c1c1c',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  taskTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  taskDescription: {
    color: '#cccccc',
    fontSize: 15,
    marginBottom: 15,
    lineHeight: 22,
  },
  taskBounty: {
    color: '#00e676', // Bright green for bounty
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888888',
    textAlign: 'center',
    marginTop: 20,
  },
});