import axios from "axios";
import { useState } from "react";
import { Button, FlatList, Text, TextInput, View } from "react-native";

const BASE_URL = "https://campus-errands.onrender.com"; // 🔥 PUT YOUR BACKEND URL

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [tasks, setTasks] = useState([]);

  const login = async () => {
    try {
      await axios.post(`${BASE_URL}/api/login`, {
        email,
        password,
      });
      setLoggedIn(true);
      loadTasks();
    } catch (err) {
      alert("Login failed");
    }
  };

  const signup = async () => {
    try {
      await axios.post(`${BASE_URL}/users/signup`, {
        email,
        password,
      });
      alert("Signup successful");
    } catch (err) {
      alert("Signup failed");
    }
  };

  const loadTasks = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/tasks`);
      setTasks(res.data);
    } catch (err) {
      alert("Error loading tasks");
    }
  };

  // UI
  if (!loggedIn) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "black" }}>
        <Text style={{ color: "white", fontSize: 22 }}>Login</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="gray"
          style={{ color: "white", borderBottomWidth: 1, marginBottom: 10 }}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="gray"
          secureTextEntry
          style={{ color: "white", borderBottomWidth: 1, marginBottom: 20 }}
          onChangeText={setPassword}
        />

        <Button title="Login" onPress={login} />
        <View style={{ height: 10 }} />
        <Button title="Signup" onPress={signup} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "black" }}>
      <Text style={{ color: "white", fontSize: 22 }}>Tasks</Text>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, marginVertical: 10, padding: 10 }}>
            <Text style={{ color: "white" }}>{item.title}</Text>
            <Text style={{ color: "green" }}>₹{item.price}</Text>
          </View>
        )}
      />
    </View>
  );
}