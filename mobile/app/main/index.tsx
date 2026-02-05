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
  const showSearch = true;
  const [savedProfile, setSavedProfile] = useState<NannyProfile | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

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

      setSavedProfile(data);
      setProfileSuccess(true);
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
      setContactSuccess(true);
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
        {user ? (
          <View style={styles.topBar}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => setSelectedProfile(savedProfile)}
                disabled={!savedProfile}
              >
                <Text style={styles.topBarButtonText}>Check profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.topBarButton} onPress={logout}>
                <Text style={styles.topBarButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.title}>Find My Nanny</Text>
          <Text style={styles.subtitle}>
            A trusted marketplace for families and nannies to connect.
          </Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Simple • Private • Local</Text>
          </View>
        </View>

        {!user ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auth</Text>

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

            <TouchableOpacity
              style={styles.inlineLink}
              onPress={() =>
                setAuthMode(authMode === "register" ? "login" : "register")
              }
            >
              <Text style={styles.inlineLinkText}>
                {authMode === "register"
                  ? "Have an account? Login here."
                  : "New here? Create an account."}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {user && user.role === "nanny" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nanny Profile</Text>
            <Text style={styles.sectionHint}>
              Add the basics so families can find you later.
            </Text>
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

        {profileSuccess && savedProfile ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Profile live</Text>
            <Text style={styles.successSubtitle}>
              Families can now find you by city or zip.
            </Text>
            <View style={styles.successSummary}>
              <Text style={styles.successSummaryText}>
                {savedProfile.full_name}
              </Text>
              <Text style={styles.successSummaryMeta}>
                {savedProfile.city} • {savedProfile.availability} • ${savedProfile.preferred_rate}/hr
              </Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setSelectedProfile(savedProfile);
                setProfileSuccess(false);
              }}
            >
              <Text style={styles.buttonText}>Preview profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setProfileSuccess(false)}
            >
              <Text style={styles.secondaryButtonText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showSearch ? (
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
              <Text style={styles.buttonText}>
                {loading ? "Working..." : "Search"}
              </Text>
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
        ) : null}

        {showSearch && selectedProfile ? (
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
            <Text style={styles.detailText}>
              Rate: {selectedProfile.preferred_rate}
            </Text>
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

        {contactSuccess && selectedProfile ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Request sent</Text>
            <Text style={styles.successSubtitle}>
              You’ll be notified when the nanny responds.
            </Text>
            <View style={styles.successSummary}>
              <Text style={styles.successSummaryText}>
                {selectedProfile.full_name}
              </Text>
              <Text style={styles.successSummaryMeta}>
                {selectedProfile.city}
              </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={() => setContactSuccess(false)}>
              <Text style={styles.buttonText}>View request status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setContactSuccess(false)}
            >
              <Text style={styles.secondaryButtonText}>Send another request</Text>
            </TouchableOpacity>
            <Text style={styles.successFootnote}>
              Status tracking is coming soon.
            </Text>
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
    justifyContent: "center",
    backgroundColor: "#F7F3EE",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
  },
  hero: {
    paddingVertical: 18,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1F1A17",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#5F5852",
    marginBottom: 12,
  },
  heroPill: {
    alignSelf: "flex-start",
    backgroundColor: "#D8ECEB",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  heroPillText: {
    color: "#1F5A59",
    fontWeight: "600",
    fontSize: 12,
  },
  roleRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7DFD6",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  roleActive: {
    backgroundColor: "#D8ECEB",
    borderColor: "#2F7D7B",
  },
  roleText: {
    fontSize: 16,
    color: "#1F1A17",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7DFD6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2F7D7B",
    paddingVertical: 14,
    borderRadius: 14,
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
  inlineLink: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  inlineLinkText: {
    color: "#1F5A59",
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DFD6",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1F1A17",
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: "#5F5852",
    marginBottom: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D8ECEB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2F7D7B",
  },
  avatarText: {
    color: "#1F5A59",
    fontWeight: "700",
    fontSize: 16,
  },
  topBarActions: {
    flexDirection: "row",
    gap: 8,
  },
  topBarButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DFD6",
  },
  topBarButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F5A59",
  },
  resultCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DFD6",
  },
  resultName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1A17",
  },
  resultMeta: {
    color: "#5F5852",
    marginTop: 4,
  },
  detailText: {
    color: "#1F1A17",
    marginTop: 6,
  },
  status: {
    marginTop: 16,
    color: "#1F1A17",
  },
  successCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8ECEB",
    shadowColor: "#1F5A59",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1A17",
  },
  successSubtitle: {
    marginTop: 6,
    color: "#5F5852",
    fontSize: 14,
  },
  successSummary: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#D8ECEB",
  },
  successSummaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1A17",
  },
  successSummaryMeta: {
    marginTop: 4,
    color: "#1F5A59",
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7DFD6",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#1F5A59",
    fontSize: 15,
    fontWeight: "600",
  },
  successFootnote: {
    marginTop: 10,
    fontSize: 12,
    color: "#5F5852",
  },
});
