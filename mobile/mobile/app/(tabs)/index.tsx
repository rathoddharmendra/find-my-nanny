import { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { API_BASE_URL } from "../../config";

export default function HomeScreen() {
  const [role, setRole] = useState<"nanny" | "family">("nanny");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setStatus(`Registered ${data.email} as ${data.role}`);
      setEmail("");
      setPassword("");
    } catch (err) {
      if (err instanceof Error) {
        setStatus(`Network error: ${err.message}`);
      } else {
        setStatus("Network error. Check API_BASE_URL.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Find My Nanny</Text>
      <Text style={styles.subtitle}>Register (MVP)</Text>
      <Text style={styles.debug}>API: {API_BASE_URL}</Text>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleButton, role === "nanny" && styles.roleActive]}
          onPress={() => setRole("nanny")}
        >
          <Text style={styles.roleText}>Nanny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === "family" && styles.roleActive]}
          onPress={() => setRole("family")}
        >
          <Text style={styles.roleText}>Family</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={register}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Working..." : "Register"}</Text>
      </TouchableOpacity>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#F5F1EB",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1D1A16",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B6257",
    marginBottom: 24,
  },
  roleRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B9AFA2",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
  },
  roleActive: {
    backgroundColor: "#E3D5C6",
    borderColor: "#9B8570",
  },
  roleText: {
    fontSize: 16,
    color: "#1D1A16",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#C9BFB3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1D1A16",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    marginTop: 16,
    color: "#1D1A16",
  },
});
