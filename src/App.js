import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  PlusCircle, DollarSign, Calendar, TrendingUp, Bell, Edit2, Trash2, Search, Filter, 
  BarChart3, PieChart, Settings, CreditCard, Zap, Play, Pause, AlertCircle, LogOut, Lightbulb, Loader2, User
} from 'lucide-react';
import logo from './assets/moneywise-logo.png';
import home from './assets/home-1.png';
// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, collection, query, where, getDocs 
} from 'firebase/firestore';


import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';




// Initialize Firebase (using global variables provided by the Canvas environment)
// Replace with your actual Firebase config for local development as previously instructed
const firebaseConfig = {
  apiKey: "AIzaSyAShqy4W63p9nMwvWgwW6R1Q1QylXk9bZ8",
  authDomain: "moneywise-fd103.firebaseapp.com",
  projectId: "moneywise-fd103",
  storageBucket: "moneywise-fd103.firebasestorage.app",
  messagingSenderId: "668171750388",
  appId: "1:668171750388:web:8a2d1cd09acbd8782607a1",
  measurementId: "G-88T71940FS"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication Context
const AuthContext = createContext(null);

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [username, setUsername] = useState(null); // New state for username

  const appId = firebaseConfig.projectId; // Use projectId as appId for consistency with Firestore paths

  useEffect(() => {
    const initialAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          setLoading(false);
          setIsAuthReady(true);

          if (user) {
            // Fetch username from Firestore if user is logged in
            try {
              const userProfileRef = doc(db, `/artifacts/${appId}/users_profile/${user.uid}`);
              const docSnap = await getDoc(userProfileRef);
              if (docSnap.exists()) {
                setUsername(docSnap.data().username);
              } else {
                console.log("No user profile found in Firestore. Creating one.");
                // If profile doesn't exist, create it. Use display name from auth or email.
                await setDoc(userProfileRef, {
                  username: user.displayName || user.email, // Use displayName from auth or fallback to email
                  email: user.email,
                  createdAt: new Date()
                });
                setUsername(user.displayName || user.email);
              }
            } catch (firestoreError) {
              console.error("Error fetching or creating user profile:", firestoreError);
              setUsername(user.email); // Fallback to email on error
            }
          } else {
            setUsername(null); // Clear username if no user
          }
        });

        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        return unsubscribe;
      } catch (error) {
        console.error("Firebase initial auth error:", error);
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initialAuth();
  }, [appId]); // Depend on appId to re-run if it changes (though it's constant here)

  const signup = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set display name in Firebase Auth profile
    await updateProfile(user, { displayName: displayName });

    // Store username in Firestore
    const userProfileRef = doc(db, `/artifacts/${appId}/users_profile/${user.uid}`);
    await setDoc(userProfileRef, {
      username: displayName,
      email: email,
      createdAt: new Date()
    });

    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // New function to update username
  const updateUsername = async (newUsername) => {
    if (!currentUser) throw new Error("No user logged in to update username.");

    try {
      // 1. Update display name in Firebase Authentication
      await updateProfile(currentUser, { displayName: newUsername });

      // 2. Update username in Firestore user profile document
      const userProfileRef = doc(db, `/artifacts/${appId}/users_profile/${currentUser.uid}`);
      // Use setDoc with merge: true to create if not exists, or update if exists
      await setDoc(userProfileRef, { username: newUsername }, { merge: true });

      // 3. Update local state
      setUsername(newUsername);
      return { success: true };
    } catch (error) {
      console.error("Error updating username:", error);
      throw error; // Re-throw to be caught by the calling component
    }
  };


  const value = {
    currentUser,
    signup,
    login,
    logout,
    loading,
    isAuthReady,
    username, // Provide username from context
    updateUsername // Provide updateUsername function
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom Hook to use Auth Context
const useAuth = () => {
  return useContext(AuthContext);
};

// Login Component
const Login = ({ switchToSignup, switchToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging In...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{' '}
          <button onClick={switchToSignup} className="text-blue-500 hover:underline">
            Sign Up
          </button>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          <button onClick={switchToHome} className="text-gray-500 hover:underline">
            Back to Home
          </button>
        </p>
      </div>
    </div>
  );
};

// Signup Component
const Signup = ({ switchToLogin, switchToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // New state for username
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, username); // Pass username to signup function
      // Optionally, you can automatically log in the user after signup or redirect
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 font-semibold disabled:opacity-50"
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <button onClick={switchToLogin} className="text-blue-500 hover:underline">
            Login
          </button>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          <button onClick={switchToHome} className="text-gray-500 hover:underline">
            Back to Home
          </button>
        </p>
      </div>
    </div>
  );
};

// New component for changing username
const ChangeUsernameForm = ({ currentUsername, onSubmit, onCancel }) => {
  const [newUsername, setNewUsername] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newUsername.trim() === '') {
      setError("Username cannot be empty.");
      return;
    }
    if (newUsername.trim() === currentUsername) {
      setError("New username must be different from current username.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(newUsername);
      setSuccess("Username updated successfully!");
      // Optionally close the form after a short delay
      setTimeout(onCancel, 1500); 
    } catch (err) {
      setError(err.message || "Failed to update username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Change Username</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{success}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current Username</label>
            <input
              type="text"
              value={currentUsername || ''}
              className="w-full p-2 border rounded-md bg-gray-100 cursor-not-allowed"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              {loading ? 'Updating...' : 'Update Username'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const SettingsPanel = () => {
  const { username, updateUsername } = useAuth();
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Settings size={24} /> User Settings
      </h2>

      {/* Change Username Section */}
      <div className="border rounded-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-lg">Change Username</h3>
          <p className="text-gray-600 text-sm">Your current username is: <span className="font-medium text-gray-800">{username || 'N/A'}</span></p>
        </div>
        <button
          onClick={() => setShowChangeUsernameModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
        >
          <User size={16} />
          Edit Username
        </button>
      </div>

      {/* Other settings can go here */}
      <div className="border rounded-md p-4">
        <h3 className="font-semibold text-lg">Account Information</h3>
        <p className="text-gray-600 text-sm">Manage your account details and preferences.</p>
        {/* Add more settings options here */}
      </div>

      {showChangeUsernameModal && (
        <ChangeUsernameForm
          currentUsername={username}
          onSubmit={updateUsername}
          onCancel={() => setShowChangeUsernameModal(false)}
        />
      )}
    </div>
  );
};


const SubscriptionManager = () => {
  const { currentUser, logout, isAuthReady, username } = useAuth(); // Get username from context
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subscriptions, setSubscriptions] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);

  // States for AI Features
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [showAiSuggestionsModal, setShowAiSuggestionsModal] = useState(false);

  // Using projectId as appId for consistency with Firestore paths
  const appId = firebaseConfig.projectId; 
  const userId = currentUser?.uid;

  const categories = [
    { id: 'entertainment', name: 'Entertainment', color: 'bg-purple-500' },
    { id: 'software', name: 'Software', color: 'bg-blue-500' },
    { id: 'fitness', name: 'Fitness', color: 'bg-green-500' },
    { id: 'news', name: 'News & Media', color: 'bg-orange-500' },
    { id: 'cloud', name: 'Cloud Storage', color: 'bg-cyan-500' },
    { id: 'productivity', name: 'Productivity', color: 'bg-indigo-500' },
    { id: 'other', name: 'Other', color: 'bg-gray-500' }
  ];

  // Fetch subscriptions from Firestore
  useEffect(() => {
    if (!isAuthReady || !userId) {
      setDataLoading(true);
      setSubscriptions([]);
      return;
    }

    setDataLoading(true);
    const q = query(collection(db, `/artifacts/${appId}/users/${userId}/subscriptions`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSubscriptions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubscriptions(fetchedSubscriptions);
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching subscriptions:", error);
      setDataLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener
  }, [userId, isAuthReady, appId]);


  const addSubscription = async (subscription) => {
    if (!userId) return;
    try {
      const docRef = await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/subscriptions`), {
        ...subscription,
        isActive: true,
        createdAt: new Date()
      });
      console.log("Document written with ID: ", docRef.id);
      setShowAddForm(false);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const updateSubscription = async (updatedSubscription) => {
    if (!userId || !updatedSubscription.id) return;
    try {
      const subRef = doc(db, `/artifacts/${appId}/users/${userId}/subscriptions`, updatedSubscription.id);
      await setDoc(subRef, updatedSubscription); // Use setDoc to replace the entire document
      setEditingSubscription(null);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const deleteSubscription = async (id) => {
    if (!userId || !id) return;
    try {
      await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/subscriptions`, id));
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  const toggleSubscriptionStatus = async (id, currentStatus) => {
    if (!userId || !id) return;
    try {
      const subRef = doc(db, `/artifacts/${appId}/users/${userId}/subscriptions`, id);
      await updateDoc(subRef, { isActive: !currentStatus });
    } catch (e) {
      console.error("Error toggling status: ", e);
    }
  };

  const calculateTotalCost = (frequency = 'monthly') => {
    return subscriptions
      .filter(sub => sub.isActive)
      .reduce((total, sub) => {
        const cost = typeof sub.cost === 'string' ? parseFloat(sub.cost) : sub.cost;
        if (frequency === 'monthly') {
          return total + (sub.frequency === 'yearly' ? cost / 12 : cost);
        } else {
          return total + (sub.frequency === 'monthly' ? cost * 12 : cost);
        }
      }, 0);
  };

  const getUpcomingRenewals = (days = 7) => {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    return subscriptions
      .filter(sub => sub.isActive)
      .filter(sub => {
        const paymentDate = new Date(sub.nextPayment);
        return paymentDate >= today && paymentDate <= futureDate;
      })
      .sort((a, b) => new Date(a.nextPayment) - new Date(b.nextPayment));
  };

  const getCategoryData = () => {
    const categoryTotals = {};
    subscriptions
      .filter(sub => sub.isActive)
      .forEach(sub => {
        const monthlyCost = (typeof sub.cost === 'string' ? parseFloat(sub.cost) : sub.cost) / (sub.frequency === 'yearly' ? 12 : 1);
        categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + monthlyCost;
      });
    return categoryTotals;
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' || sub.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || sub.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilRenewal = (dateString) => {
    if (!dateString) return Infinity;
    const today = new Date();
    const paymentDate = new Date(dateString);
    const diffTime = paymentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

 // LLM Integration Functions
const getAiSpendingInsight = async () => {
  setAiLoading(true);
  setAiInsight('');
  try {
    const prompt = `Given the following subscription data, provide insights on spending and potential savings. Focus on patterns, high-cost areas, and actionable advice. Respond concisely within 150 words. Use standard Markdown formatting for bolding (**text**), bullet points (* Item, with each item on a new line), and headings (### Heading).

Subscriptions: ${JSON.stringify(subscriptions.map(s => ({ name: s.name, cost: s.cost, frequency: s.frequency, category: s.category, isActive: s.isActive })))}
Monthly Total: ${formatCurrency(calculateTotalCost('monthly'))}
Yearly Total: ${formatCurrency(calculateTotalCost('yearly'))}
`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    const apiKey = "AIzaSyCgYO0qtEMdqAE31wwI0LhuCBdCVw6Lu-o"; // If you want to use models other than gemini-2.0-flash or imagen-3.0-generate-002, provide an API key here. Otherwise, leave this as-is.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      setAiInsight(result.candidates[0].content.parts[0].text);
    } else {
      setAiInsight("Could not generate insights at this moment.");
    }
  } catch (error) {
    console.error("Error calling Gemini API for insights:", error);
    setAiInsight("Failed to get insights. Please try again later.");
  } finally {
    setAiLoading(false);
  }
};

const getAiSubscriptionSuggestions = async () => {
  setAiLoading(true);
  setAiSuggestions('');
  setShowAiSuggestionsModal(true);
  try {
    const currentSubscriptionNames = subscriptions.map(s => s.name).join(', ');
    const prompt = `Based on these existing subscriptions: ${currentSubscriptionNames || 'None'}, suggest 3-5 complementary or new popular subscription services that a user might find useful, across different categories. Provide a brief description for each. Also suggest how one might review their current subscriptions for optimization.
Respond in clear, standard Markdown format. Use headings (###), bold text (**text**), and bulleted lists (* Item, each on a new line).
`; // Added specific Markdown instructions here

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    const apiKey = "AIzaSyB3useXANaz-R5fIoCFFmW2cDQkTxuoo08"; // If you want to use models other than gemini-2.0-flash or imagen-3.0-generate-002, provide an API key here. Otherwise, leave this as-is.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      setAiSuggestions(result.candidates[0].content.parts[0].text);
    } else {
      setAiSuggestions("Could not generate suggestions at this moment.");
    }
  } catch (error) {
    console.error("Error calling Gemini API for suggestions:", error);
    setAiSuggestions("Failed to get suggestions. Please try again later.");
  } finally {
    setAiLoading(false);
  }
};


  // Components
  const SubscriptionForm = ({ subscription, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(subscription || {
      name: '',
      cost: '',
      frequency: 'monthly',
      category: 'other',
      nextPayment: '',
      paymentMethod: 'Credit Card',
      notes: ''
    });

    // Ensure nextPayment is in 'YYYY-MM-DD' format for date input
    useEffect(() => {
      if (subscription && subscription.nextPayment) {
        const date = new Date(subscription.nextPayment);
        const formattedDate = date.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, nextPayment: formattedDate }));
      }
    }, [subscription]);


    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        ...formData,
        cost: parseFloat(formData.cost)
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">
            {subscription ? 'Edit Subscription' : 'Add New Subscription'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Billing Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Payment Date</label>
              <input
                type="date"
                value={formData.nextPayment}
                onChange={(e) => setFormData({...formData, nextPayment: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="PayPal">UPI</option>
                <option value="Bank Transfer">NetBanking</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                {subscription ? 'Update' : 'Add'} Subscription
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const SubscriptionCard = ({ subscription }) => {
    const category = categories.find(cat => cat.id === subscription.category);
    const daysUntil = getDaysUntilRenewal(subscription.nextPayment);
    
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${category?.color || 'border-gray-500'}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{subscription.name}</h3>
            <p className="text-sm text-gray-600">{category?.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingSubscription(subscription)}
              className="p-1 text-gray-500 hover:text-blue-500"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => toggleSubscriptionStatus(subscription.id, subscription.isActive)}
              className={`p-1 ${subscription.isActive ? 'text-green-500 hover:text-yellow-500' : 'text-gray-400 hover:text-green-500'}`}
            >
              {subscription.isActive ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => deleteSubscription(subscription.id)}
              className="p-1 text-gray-500 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(subscription.cost)}
            </span>
            <span className="text-sm text-gray-600">
              /{subscription.frequency}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} />
            <span>Next: {formatDate(subscription.nextPayment)}</span>
            {daysUntil <= 7 && daysUntil >=0 && (
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
              </span>
            )}
            {daysUntil < 0 && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                Overdue
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CreditCard size={14} />
            <span>{subscription.paymentMethod}</span>
          </div>
          
          {subscription.notes && (
            <p className="text-sm text-gray-600 italic">{subscription.notes}</p>
          )}
          
          {!subscription.isActive && (
            <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
              Paused
            </div>
          )}
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const monthlyTotal = calculateTotalCost('monthly');
    const yearlyTotal = calculateTotalCost('yearly');
    const activeCount = subscriptions.filter(sub => sub.isActive).length;
    const upcomingRenewals = getUpcomingRenewals(7);
    const categoryData = getCategoryData();

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyTotal)}</p>
              </div>
              <DollarSign className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Yearly Total</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(yearlyTotal)}</p>
              </div>
              <TrendingUp className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <Zap className="text-purple-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Renewals</p>
                <p className="text-2xl font-bold text-orange-600">{upcomingRenewals.length}</p>
              </div>
              <Bell className="text-orange-500" size={24} />
            </div>
          </div>
        </div>

        {/* AI Spending Insight */}
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Lightbulb className="text-yellow-500" />
                    AI Spending Insights
                </h2>
                <button
                    onClick={getAiSpendingInsight}
                    disabled={aiLoading}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                >
                    {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Lightbulb size={20} />}
                    {aiLoading ? 'Generating...' : 'Get Insights'}
                </button>
            </div>
            {aiInsight && (
    <div className="bg-purple-50 text-purple-800 p-4 rounded-md prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {aiInsight}
        </ReactMarkdown>
    </div>
)}
            {!aiInsight && !aiLoading && (
                <p className="text-gray-500 text-sm">Click "Get Insights" to get AI-powered spending analysis.</p>
            )}
        </div>


        {/* Upcoming Renewals */}
        {upcomingRenewals.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="text-orange-500" />
              Upcoming Renewals (Next 7 Days)
            </h2>
            <div className="space-y-3">
              {upcomingRenewals.map(sub => {
                const daysUntil = getDaysUntilRenewal(sub.nextPayment);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-md">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-gray-600">{formatDate(sub.nextPayment)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(sub.cost)}</p>
                      <p className="text-sm text-orange-600">
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Spending by Category</h2>
          <div className="space-y-3">
            {Object.entries(categoryData).map(([categoryId, amount]) => {
              const category = categories.find(cat => cat.id === categoryId);
              const percentage = (amount / monthlyTotal) * 100;
              return (
                <div key={categoryId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${category?.color}`}></div>
                    <span>{category?.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(amount)}</p>
                    <p className="text-sm text-gray-600">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Subscriptions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Most Expensive Subscriptions</h2>
          <div className="space-y-3">
            {subscriptions
              .filter(sub => sub.isActive)
              .sort((a, b) => {
                const aMonthlyCost = (typeof a.cost === 'string' ? parseFloat(a.cost) : a.cost) / (a.frequency === 'yearly' ? 12 : 1);
                const bMonthlyCost = (typeof b.cost === 'string' ? parseFloat(b.cost) : b.cost) / (b.frequency === 'yearly' ? 12 : 1);
                return bMonthlyCost - aMonthlyCost;
              })
              .slice(0, 5)
              .map((sub, index) => {
                const monthlyCost = (typeof sub.cost === 'string' ? parseFloat(sub.cost) : sub.cost) / (sub.frequency === 'yearly' ? 12 : 1);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{sub.name}</span>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(monthlyCost)}/mo</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const SubscriptionsList = () => {
    return (
      <div className="space-y-6">
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
                onClick={getAiSubscriptionSuggestions}
                disabled={aiLoading}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
                {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Lightbulb size={20} />}
                {aiLoading ? 'Generating...' : 'AI Suggestions'}
            </button>
          </div>
        </div>

        {/* Subscriptions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataLoading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading subscriptions...</div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No subscriptions found</p>
              <p className="text-gray-400">Try adjusting your search or filter criteria or add a new subscription.</p>
            </div>
          ) : (
            filteredSubscriptions.map(subscription => (
              <SubscriptionCard key={subscription.id} subscription={subscription} />
            ))
          )}
        </div>

        {/* AI Suggestions Modal */}
        {showAiSuggestionsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Lightbulb className="text-indigo-500" /> AI Subscription Suggestions
                    </h2>
                    {aiLoading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <p className="mt-4 text-gray-700">Generating suggestions...</p>
                        </div>
                    ) : (
                        <div className="prose max-w-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {aiSuggestions}
    </ReactMarkdown>
</div>
                    )}
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={() => setShowAiSuggestionsModal(false)}
                            className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  const Analytics = () => {
    const categoryData = getCategoryData();
    const monthlyTotal = calculateTotalCost('monthly');
    const yearlyTotal = calculateTotalCost('yearly');

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spending Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Spending Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Monthly Total</span>
                <span className="font-bold text-green-600">{formatCurrency(monthlyTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Yearly Total</span>
                <span className="font-bold text-blue-600">{formatCurrency(yearlyTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Average per Service</span>
                <span className="font-bold">
                  {subscriptions.filter(sub => sub.isActive).length > 0 ? 
                    monthlyTotal / subscriptions.filter(sub => sub.isActive).length : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Most Expensive</span>
                <span className="font-bold text-red-600">
                  {subscriptions.length > 0 ? 
                    formatCurrency(Math.max(...subscriptions.filter(sub => sub.isActive).map(sub => 
                      (typeof sub.cost === 'string' ? parseFloat(sub.cost) : sub.cost) / (sub.frequency === 'yearly' ? 12 : 1)
                    ))) : '$0'}
                </span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Category Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(categoryData).map(([categoryId, amount]) => {
                const category = categories.find(cat => cat.id === categoryId);
                const percentage = (amount / monthlyTotal) * 100;
                return (
                  <div key={categoryId}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${category?.color}`}></div>
                        {category?.name}
                      </span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${category?.color}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-sm text-gray-600 mt-1">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Savings Insights */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Potential Savings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Annual vs Monthly</h3>
              <p className="text-sm text-green-600 mt-1">
                Switching to annual billing could save you money on some subscriptions
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Unused Services</h3>
              <p className="text-sm text-blue-600 mt-1">
                Review subscriptions you haven't used recently
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Bundle Opportunities</h3>
              <p className="text-sm text-purple-600 mt-1">
                Look for bundle deals that include multiple services
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="MoneyWise Logo" className="h-64 w-64 " />
              <h1 className="text-2xl font-bold text-gray-900"></h1>
            </div>
            <div className="flex items-center gap-4">
                {currentUser && username && ( // Display username if available
                    <span className="text-sm text-gray-600">
                        Hello, {username}!
                    </span>
                )}
                <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                <PlusCircle size={20} />
                Add Subscription
                </button>
                <button
                    onClick={logout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
              { id: 'subscriptions', name: 'Subscriptions', icon: CreditCard },
              { id: 'analytics', name: 'Analytics', icon: PieChart },
              { id: 'settings', name: 'Settings', icon: Settings } // New Settings tab
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={20} />
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'subscriptions' && <SubscriptionsList />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'settings' && <SettingsPanel />} {/* Render SettingsPanel */}
      </main>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <SubscriptionForm
          onSubmit={addSubscription}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingSubscription && (
        <SubscriptionForm
          subscription={editingSubscription}
          onSubmit={updateSubscription}
          onCancel={() => setEditingSubscription(null)}
        />
      )}
    </div>
  );
};

// New Homepage Component
const HomePage = ({ switchToLogin, switchToSignup }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logo} alt="MoneyWise Logo" className="h-64 w-64 " />
              <span className="text-2xl font-bold text-gray-900"></span>
            </div>
            <div className="flex items-center space-x-4">
              {/* These links are placeholders as per the image, not functional in this context */}
              {/* <a href="#" className="text-gray-600 hover:text-blue-600 font-medium hidden md:block">Features</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium hidden md:block">Pricing</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium hidden md:block">Learn More</a> */}
              
              <button
                onClick={switchToLogin}
                className="text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 font-medium"
              >
                Log in
              </button>
              <button
                onClick={switchToSignup}
                className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 font-semibold shadow-md"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row items-center p-8 lg:p-12 gap-8">
          {/* Left Content Block */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 mb-6">
              Manage Your Subscriptions, <br className="hidden sm:inline" /> Master Your Finances.
            </h1>
            <p className="text-lg text-gray-700 mb-8 max-w-lg mx-auto lg:mx-0">
              Stop losing track of your recurring payments. Our app empowers you to see everything, 
              spend less, and take back control of your financial life with ease.
            </p>
            <button
              onClick={switchToSignup}
              className="bg-black text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-800 shadow-lg transition-all duration-300"
            >
              Sign up
            </button>
          </div>

          {/* Right Image/Mockup Block */}
          <div className="flex-1 flex justify-center items-center relative p-4">
              {/* Mockup Phone Screen - Using a placeholder image for visual representation */}
              <img src={home} alt="MoneyWise Logo" className="h-164 w-164" />
              
            
          </div>
        </div>
      </main>
    </div>
  );
};


// Main App Component for routing based on auth state
const App = () => {
  const { currentUser, loading, isAuthReady } = useAuth();
  const [currentAuthView, setCurrentAuthView] = useState('home'); // 'home', 'login', 'signup'

  // If loading or auth not ready, show a simple loader
  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-gray-700">Loading application...</p>
        </div>
      </div>
    );
  }

  // Render the SubscriptionManager if user is logged in
  if (currentUser) {
    return <SubscriptionManager />;
  }

  // Render auth views if user is not logged in
  switch (currentAuthView) {
    case 'login':
      return <Login switchToSignup={() => setCurrentAuthView('signup')} switchToHome={() => setCurrentAuthView('home')} />;
    case 'signup':
      return <Signup switchToLogin={() => setCurrentAuthView('login')} switchToHome={() => setCurrentAuthView('home')} />;
    case 'home':
    default:
      return <HomePage switchToLogin={() => setCurrentAuthView('login')} switchToSignup={() => setCurrentAuthView('signup')} />;
  }
};

// New top-level component to wrap App with AuthProvider
const RootApp = () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);

export default RootApp;
