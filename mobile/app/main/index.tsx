import { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../config";
const WS_BASE_URL = (() => {
  try {
    const url = new URL(API_BASE_URL);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${url.hostname}:5050`;
  } catch (err) {
    return "ws://localhost:5050";
  }
})();

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

type ContactRequest = {
  id: number;
  family_id: number;
  nanny_id: number;
  status: string;
  created_at: string;
  nanny_name?: string;
  family_email?: string;
};

type Message = {
  id: number;
  contact_request_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  sender_email?: string;
};

type FamilyProfile = {
  id: number;
  user_id: number;
  full_name: string;
  city: string;
  zip: string;
  needs: string;
  schedule: string;
  budget: string;
  bio: string;
  contact_info: string;
};

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
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
  const [familyForm, setFamilyForm] = useState({
    full_name: "",
    city: "",
    zip: "",
    needs: "",
    schedule: "",
    budget: "",
    bio: "",
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
  const [savedFamilyProfile, setSavedFamilyProfile] = useState<FamilyProfile | null>(
    null
  );
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [latestMessage, setLatestMessage] = useState<{
    body: string;
    created_at: string;
    sender_email: string;
  } | null>(null);
  const [threads, setThreads] = useState<ContactRequest[]>([]);
  const [activeThread, setActiveThread] = useState<ContactRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("auth_token");
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (err) {
        // ignore restore errors
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLatestMessage(null);
      setThreads([]);
      setActiveThread(null);
      setMessages([]);
      setSavedProfile(null);
      setSavedFamilyProfile(null);
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

    fetch(`${API_BASE_URL}/api/messages/last`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.message) {
          setLatestMessage(data.message);
        } else {
          setLatestMessage(null);
        }
      })
      .catch(() => {
        setLatestMessage(null);
      });

    fetch(`${API_BASE_URL}/api/contact_requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.results) {
          setThreads(data.results);
        } else {
          setThreads([]);
        }
      })
      .catch(() => {
        setThreads([]);
      });

    fetch(`${API_BASE_URL}/api/nanny_profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          setSavedProfile(data);
        }
      })
      .catch(() => {
        // ignore
      });

    fetch(`${API_BASE_URL}/api/family_profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          setSavedFamilyProfile(data);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [token]);

  useEffect(() => {
    if (!token || !activeThread) return undefined;

    const ws = new WebSocket(WS_BASE_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          contact_request_id: activeThread.id,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message" && payload.message) {
          setMessages((prev) => [...prev, payload.message]);
          setLatestMessage({
            body: payload.message.body,
            created_at: payload.message.created_at,
            sender_email: payload.message.sender_email || "",
          });
        }
      } catch (err) {
        // ignore
      }
    };

    return () => {
      try {
        ws.send(
          JSON.stringify({
            type: "unsubscribe",
            contact_request_id: activeThread.id,
          })
        );
        ws.close();
      } catch (err) {
        // ignore
      }
      wsRef.current = null;
    };
  }, [token, activeThread?.id]);

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

      setToken(data.token);
      setUser({ id: data.id, email: data.email, role: data.role });
      await AsyncStorage.setItem("auth_token", data.token);
      setStatus(`Welcome ${data.email}`);
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
      await AsyncStorage.setItem("auth_token", data.token);
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
      await AsyncStorage.removeItem("auth_token");
      setToken("");
      setUser(null);
      setSelectedProfile(null);
      setProfileSuccess(false);
      setContactSuccess(false);
      setLatestMessage(null);
      setThreads([]);
      setActiveThread(null);
      setMessages([]);
      setMessageDraft("");
      setSavedProfile(null);
      setSavedFamilyProfile(null);
      setLoading(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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

  const upsertFamilyProfile = async () => {
    if (!token) {
      setStatus("Login required");
      return;
    }
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/family_profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(familyForm),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Profile save failed");
        setLoading(false);
        return;
      }

      setSavedFamilyProfile(data);
      setStatus("Profile saved");
    } catch (err) {
      setStatus("Network error. Check API_BASE_URL.");
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
      setActiveThread({
        id: data.id,
        family_id: user.id,
        nanny_id: selectedProfile.user_id,
        status: "pending",
        created_at: new Date().toISOString(),
        nanny_name: selectedProfile.full_name,
      });
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

  const loadThreadMessages = async (thread: ContactRequest) => {
    if (!token) return;
    setActiveThread(thread);
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/messages?contact_request_id=${thread.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to load messages");
        setLoading(false);
        return;
      }
      setMessages(data.results || []);
    } catch (err) {
      setStatus("Network error. Check API_BASE_URL.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!token || !activeThread || !messageDraft.trim()) return;
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contact_request_id: activeThread.id,
          body: messageDraft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Message failed");
        setLoading(false);
        return;
      }
      setMessages((prev) => [...prev, data]);
      setLatestMessage({
        body: data.body,
        created_at: data.created_at,
        sender_email: user?.email || "",
      });
      setMessageDraft("");
    } catch (err) {
      setStatus("Network error. Check API_BASE_URL.");
    } finally {
      setLoading(false);
    }
  };

  const deleteThread = async (thread: ContactRequest) => {
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/contact_requests/${thread.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Delete failed");
        setLoading(false);
        return;
      }
      setThreads((prev) => prev.filter((item) => item.id !== thread.id));
      if (activeThread?.id === thread.id) {
        setActiveThread(null);
        setMessages([]);
      }
      setStatus("Conversation deleted");
    } catch (err) {
      setStatus("Network error. Check API_BASE_URL.");
    } finally {
      setLoading(false);
    }
  };

  const openMyProfile = async () => {
    if (!token) return;
    if (user?.role === "family" && savedFamilyProfile) {
      setShowProfileOverlay(true);
      return;
    }
    if (user?.role === "nanny" && savedProfile) {
      setShowProfileOverlay(true);
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const endpoint =
        user?.role === "family"
          ? `${API_BASE_URL}/api/family_profiles/me`
          : `${API_BASE_URL}/api/nanny_profiles/me`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Profile not found");
        setLoading(false);
        return;
      }
      if (user?.role === "family") {
        setSavedFamilyProfile(data);
      } else {
        setSavedProfile(data);
      }
      setShowProfileOverlay(true);
    } catch (err) {
      setStatus("Network error. Check API_BASE_URL.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} ref={scrollRef}>
        {user ? (
          <View style={styles.topBar}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowMessages(true)}
              >
                <Text style={styles.iconButtonText}>Msg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setSearchExpanded((prev) => !prev)}
              >
                <Text style={styles.iconButtonText}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={openMyProfile}
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

        {user && user.role === "family" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family Profile</Text>
            <Text style={styles.sectionHint}>
              Tell nannies what you need.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={familyForm.full_name}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, full_name: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              value={familyForm.city}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, city: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Zip"
              keyboardType="numeric"
              value={familyForm.zip}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, zip: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Needs (e.g. infant care)"
              value={familyForm.needs}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, needs: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Schedule"
              value={familyForm.schedule}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, schedule: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Budget (e.g. 25/hr)"
              value={familyForm.budget}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, budget: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Bio"
              value={familyForm.bio}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, bio: value })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Contact info"
              value={familyForm.contact_info}
              onChangeText={(value) =>
                setFamilyForm({ ...familyForm, contact_info: value })
              }
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={upsertFamilyProfile}
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

        {user && showSearch && searchExpanded ? (
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

        {user && showSearch && searchExpanded && selectedProfile ? (
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
      {showProfileOverlay && (savedProfile || savedFamilyProfile) ? (
        <View style={styles.messageOverlay}>
          <View style={styles.messageModal}>
            <View style={styles.messageHeader}>
              <Text style={styles.sectionTitle}>Your Profile</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowProfileOverlay(false)}
              >
                <Text style={styles.iconButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            {user?.role === "family" && savedFamilyProfile ? (
              <>
                <View style={styles.successSummary}>
                  <Text style={styles.successSummaryText}>
                    {savedFamilyProfile.full_name}
                  </Text>
                  <Text style={styles.successSummaryMeta}>
                    {savedFamilyProfile.city} • {savedFamilyProfile.needs}
                  </Text>
                </View>
                <Text style={styles.detailText}>{savedFamilyProfile.bio}</Text>
                <Text style={styles.detailText}>
                  Schedule: {savedFamilyProfile.schedule}
                </Text>
                <Text style={styles.detailText}>
                  Budget: {savedFamilyProfile.budget}
                </Text>
                <Text style={styles.detailText}>
                  Contact: {savedFamilyProfile.contact_info}
                </Text>
              </>
            ) : null}
            {user?.role === "nanny" && savedProfile ? (
              <>
                <View style={styles.successSummary}>
                  <Text style={styles.successSummaryText}>
                    {savedProfile.full_name}
                  </Text>
                  <Text style={styles.successSummaryMeta}>
                    {savedProfile.city} • {savedProfile.availability} • $
                    {savedProfile.preferred_rate}/hr
                  </Text>
                </View>
                <Text style={styles.detailText}>{savedProfile.bio}</Text>
                <Text style={styles.detailText}>
                  Services: {savedProfile.services_offered}
                </Text>
                <Text style={styles.detailText}>
                  Contact: {savedProfile.contact_info}
                </Text>
              </>
            ) : null}
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (user?.role === "family" && savedFamilyProfile) {
                  setFamilyForm({
                    full_name: savedFamilyProfile.full_name,
                    city: savedFamilyProfile.city,
                    zip: savedFamilyProfile.zip,
                    needs: savedFamilyProfile.needs,
                    schedule: savedFamilyProfile.schedule,
                    budget: savedFamilyProfile.budget,
                    bio: savedFamilyProfile.bio,
                    contact_info: savedFamilyProfile.contact_info,
                  });
                } else if (savedProfile) {
                  setProfileForm({
                    full_name: savedProfile.full_name,
                    city: savedProfile.city,
                    zip: savedProfile.zip,
                    years_experience: String(savedProfile.years_experience),
                    availability: savedProfile.availability,
                    bio: savedProfile.bio,
                    services_offered: savedProfile.services_offered,
                    preferred_rate: String(savedProfile.preferred_rate),
                    contact_info: savedProfile.contact_info,
                  });
                }
                setShowProfileOverlay(false);
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <Text style={styles.buttonText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {showMessages && user ? (
        <View style={styles.messageOverlay}>
          <View style={styles.messageModal}>
            <View style={styles.messageHeader}>
              <Text style={styles.sectionTitle}>Messages</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowMessages(false)}
              >
                <Text style={styles.iconButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.messageBodyRow}>
              <View style={styles.messageListPane}>
                {threads.length === 0 ? (
                  <Text style={styles.sectionHint}>No messages yet.</Text>
                ) : (
                  threads.map((thread) => (
                    <TouchableOpacity
                      key={thread.id}
                      style={styles.messageListItem}
                      onPress={() => loadThreadMessages(thread)}
                    >
                      <View style={styles.messageListRow}>
                        <View style={styles.messageListText}>
                          <Text style={styles.resultName}>
                            {user.role === "family"
                              ? thread.nanny_name || "Nanny"
                              : thread.family_email || "Family"}
                          </Text>
                          <Text style={styles.resultMeta}>
                            {thread.status} •{" "}
                            {new Date(thread.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => deleteThread(thread)}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <View style={styles.messageThreadPane}>
                {activeThread ? (
                  <>
                    <View style={styles.messageThread}>
                      {messages.map((message) => (
                        <View
                          key={message.id}
                          style={[
                            styles.messageBubble,
                            message.sender_id === user.id
                              ? styles.messageBubbleMine
                              : styles.messageBubbleTheirs,
                          ]}
                        >
                          <Text style={styles.messageSender}>
                            {message.sender_id === user.id
                              ? "You"
                              : message.sender_email || "Partner"}
                          </Text>
                          <Text style={styles.messageBody}>{message.body}</Text>
                        </View>
                      ))}
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Type a message"
                      value={messageDraft}
                      onChangeText={setMessageDraft}
                      returnKeyType="send"
                      onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={sendMessage}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? "Working..." : "Send message"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.sectionHint}>
                    Select a conversation to view messages.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      ) : null}
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
    alignItems: "center",
  },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#D8ECEB",
    borderWidth: 1,
    borderColor: "#2F7D7B",
  },
  iconButtonText: {
    color: "#1F5A59",
    fontSize: 11,
    fontWeight: "700",
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
  messageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 12,
    zIndex: 10,
  },
  messageModal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7DFD6",
    padding: 16,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  messageBodyRow: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  messageListPane: {
    width: "38%",
    borderRightWidth: 1,
    borderRightColor: "#E7DFD6",
    paddingRight: 10,
  },
  messageListItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F7F3EE",
    marginBottom: 8,
  },
  messageThreadPane: {
    flex: 1,
  },
  messageListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  messageListText: {
    flex: 1,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#F4D7B6",
  },
  deleteButtonText: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "700",
  },
  messageThread: {
    marginTop: 12,
    gap: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
  },
  messageBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#D8ECEB",
  },
  messageBubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "#F2EDE6",
  },
  messageSender: {
    fontSize: 12,
    color: "#5F5852",
    marginBottom: 4,
  },
  messageBody: {
    color: "#1F1A17",
  },
});
