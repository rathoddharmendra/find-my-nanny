import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { API_BASE_URL } from "../../config";

type User = {
  id: number;
  email: string;
  role: "nanny" | "family";
};

type NannyProfile = {
  id: number;
  user_id: number;
  full_name: string;
  city: string;
  zip: string;
  years_experience: number;
  availability: string;
  bio: string;
  services_offered: string;
  preferred_rate: number;
  contact_info: string;
};

export default function HomeScreen() {
  const [role, setRole] = useState<User["role"]>("nanny");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    city: "",
    zip: "",
    years_experience: "",
    availability: "",
    bio: "",
    services_offered: "",
    preferred_rate: "",
    contact_info: "",
  });

  const [searchFilters, setSearchFilters] = useState({
    city: "",
    zip: "",
    min_experience: "",
    max_rate: "",
  });
  const [results, setResults] = useState<NannyProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<NannyProfile | null>(null);
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    fetch(`${API_BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, [token]);

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

  const login = async () => {
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Login failed");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setUser(data.user);
      setStatus(`Logged in as ${data.user.email}`);
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

  const logout = async () => {
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      if (err instanceof Error) {
        setStatus(`Network error: ${err.message}`);
      } else {
        setStatus("Network error. Check API_BASE_URL.");
      }
    } finally {
      setToken("");
      setUser(null);
      setLoading(false);
    }
  };

  const upsertProfile = async () => {
    if (!token) {
      setStatus("Login required");
      return;
    }
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/nanny_profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...profileForm,
          years_experience: Number(profileForm.years_experience || 0),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Profile save failed");
        setLoading(false);
        return;
      }

      setStatus("Profile saved");
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

  const searchProfiles = async () => {
    setLoading(true);
    setStatus("");
    setSelectedProfile(null);

    const params = new URLSearchParams();
    if (searchFilters.city) params.append("city", searchFilters.city);
    if (searchFilters.zip) params.append("zip", searchFilters.zip);
    if (searchFilters.min_experience)
      params.append("min_experience", searchFilters.min_experience);
    if (searchFilters.max_rate) params.append("max_rate", searchFilters.max_rate);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/nanny_profiles?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Search failed");
        setLoading(false);
        return;
      }
      setResults(data.results || []);
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

  const loadProfile = async (id: number) => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/nanny_profiles/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Profile load failed");
        setLoading(false);
        return;
      }
      setSelectedProfile(data);
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

  const sendContactRequest = async () => {
    if (!token || !user || user.role !== "family") {
      setStatus("Family login required to contact");
      return;
    }
    if (!selectedProfile) {
      setStatus("Select a nanny profile first");
      return;
    }
    if (!contactMessage.trim()) {
      setStatus("Message is required");
      return;
    }

    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/contact_requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nanny_id: selectedProfile.user_id,
          message: contactMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Contact failed");
        setLoading(false);
        return;
      }
      setStatus("Contact request sent");
      setContactMessage("");
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Find My Nanny</Text>
        <Text style={styles.subtitle}>MVP Flow</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                authMode === "register" && styles.roleActive,
              ]}
              onPress={() => setAuthMode("register")}
            >
              <Text style={styles.roleText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, authMode === "login" && styles.roleActive]}
              onPress={() => setAuthMode("login")}
            >
              <Text style={styles.roleText}>Login</Text>
            </TouchableOpacity>
          </View>

          {authMode === "register" ? (
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
          ) : null}

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
            onPress={authMode === "register" ? register : login}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? "Working..."
                : authMode === "register"
                ? "Register"
                : "Login"}
            </Text>
          </TouchableOpacity>

          {user ? (
            <View style={styles.inlineRow}>
              <Text style={styles.helperText}>
                Logged in: {user.email} ({user.role})
              </Text>
              <TouchableOpacity style={styles.linkButton} onPress={logout}>
                <Text style={styles.linkText}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {user && user.role === "nanny" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nanny Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={profileForm.full_name}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, full_name: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              value={profileForm.city}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, city: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Zip"
              keyboardType="numeric"
              value={profileForm.zip}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, zip: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Years of experience"
              keyboardType="numeric"
              value={profileForm.years_experience}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, years_experience: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Availability"
              value={profileForm.availability}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, availability: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Bio"
              value={profileForm.bio}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, bio: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Services offered"
              value={profileForm.services_offered}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, services_offered: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Preferred rate (e.g. 25)"
              keyboardType="numeric"
              value={profileForm.preferred_rate}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, preferred_rate: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Contact info"
              value={profileForm.contact_info}
              onChangeText={(value) =>
                setProfileForm({ ...profileForm, contact_info: value })
              }
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={upsertProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Working..." : "Save Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Nannies</Text>
          <TextInput
            style={styles.input}
            placeholder="City"
            value={searchFilters.city}
            onChangeText={(value) =>
              setSearchFilters({ ...searchFilters, city: value })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Zip"
            keyboardType="numeric"
            value={searchFilters.zip}
            onChangeText={(value) =>
              setSearchFilters({ ...searchFilters, zip: value })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Min experience"
            keyboardType="numeric"
            value={searchFilters.min_experience}
            onChangeText={(value) =>
              setSearchFilters({ ...searchFilters, min_experience: value })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Max rate"
            keyboardType="numeric"
            value={searchFilters.max_rate}
            onChangeText={(value) =>
              setSearchFilters({ ...searchFilters, max_rate: value })
            }
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={searchProfiles}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Working..." : "Search"}</Text>
          </TouchableOpacity>

          {results.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={styles.resultCard}
              onPress={() => loadProfile(profile.id)}
            >
              <Text style={styles.resultName}>{profile.full_name}</Text>
              <Text style={styles.resultMeta}>
                {profile.city}, {profile.zip} • {profile.years_experience} yrs
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedProfile ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.resultName}>{selectedProfile.full_name}</Text>
            <Text style={styles.resultMeta}>
              {selectedProfile.city}, {selectedProfile.zip}
            </Text>
            <Text style={styles.detailText}>{selectedProfile.bio}</Text>
            <Text style={styles.detailText}>
              Services: {selectedProfile.services_offered}
            </Text>
            <Text style={styles.detailText}>
              Availability: {selectedProfile.availability}
            </Text>
            <Text style={styles.detailText}>Rate: {selectedProfile.preferred_rate}</Text>
            <Text style={styles.detailText}>
              Contact: {selectedProfile.contact_info}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Message to nanny"
              value={contactMessage}
              onChangeText={setContactMessage}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={sendContactRequest}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Working..." : "Send Request"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>
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
  scroll: {
    paddingBottom: 40,
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
  section: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFF9F2",
    borderWidth: 1,
    borderColor: "#E3D5C6",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D1A16",
    marginBottom: 12,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  helperText: {
    color: "#6B6257",
    fontSize: 14,
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  linkText: {
    color: "#1D1A16",
    fontWeight: "600",
  },
  resultCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3D5C6",
  },
  resultName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D1A16",
  },
  resultMeta: {
    color: "#6B6257",
    marginTop: 4,
  },
  detailText: {
    color: "#1D1A16",
    marginTop: 6,
  },
  status: {
    marginTop: 16,
    color: "#1D1A16",
  },
});
