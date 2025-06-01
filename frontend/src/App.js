import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mock user ID for demo
const USER_ID = "demo-user-123";

// Authentication Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      await axios.get(`${API}/verify-token`);
      setLoading(false);
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/login`, {
        username,
        password
      });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Enhanced Logo Component (removed flag emoji and GB)
const RelocateMeLogo = ({ size = "large", className = "" }) => {
  const sizeClasses = {
    small: "text-lg",
    medium: "text-2xl", 
    large: "text-3xl",
    xl: "text-4xl"
  };

  return (
    <div className={`font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent ${sizeClasses[size]} ${className}`}>
      Relocate Platform
    </div>
  );
};

// Navigation Context for better navigation throughout the site
const NavigationContext = React.createContext();

const useNavigation = () => {
  const context = React.useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

const NavigationProvider = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  const navigateTo = (tab, title = '') => {
    setCurrentTab(tab);
    
    const newItem = { tab, title: title || getTabTitle(tab), timestamp: Date.now() };
    setRecentlyViewed(prev => {
      const filtered = prev.filter(item => item.tab !== tab);
      return [newItem, ...filtered].slice(0, 5);
    });

    updateBreadcrumbs(tab, title);
  };

  const updateBreadcrumbs = (tab, title) => {
    const tabMap = {
      'dashboard': { title: 'Dashboard', path: 'dashboard' },
      'arizona': { title: 'Arizona Property', path: 'arizona' },
      'visa': { title: 'UK Visa', path: 'visa' },
      'uk-property': { title: 'UK Properties', path: 'uk-property' },
      'work-search': { title: 'Work Search', path: 'work-search' },
      'chrome-extensions': { title: 'Extensions', path: 'chrome-extensions' },
      'timeline': { title: 'Timeline', path: 'timeline' },
      'financial': { title: 'Financial', path: 'financial' }
    };

    const crumbs = [
      { title: 'Home', path: 'dashboard' },
      tabMap[tab] || { title: title || 'Unknown', path: tab }
    ];

    setBreadcrumbs(crumbs);
  };

  const getTabTitle = (tab) => {
    const titles = {
      'dashboard': 'Dashboard',
      'arizona': 'Arizona Property',
      'visa': 'UK Visa Application',
      'uk-property': 'UK Property Search',
      'work-search': 'Work Search',
      'chrome-extensions': 'Chrome Extensions',
      'timeline': 'Master Timeline',
      'financial': 'Financial Tracker'
    };
    return titles[tab] || 'Unknown';
  };

  const addBookmark = (tab, title, description) => {
    const bookmark = { tab, title, description, timestamp: Date.now() };
    setBookmarks(prev => {
      const filtered = prev.filter(item => item.tab !== tab);
      return [bookmark, ...filtered].slice(0, 8);
    });
  };

  const removeBookmark = (tab) => {
    setBookmarks(prev => prev.filter(item => item.tab !== tab));
  };

  return (
    <NavigationContext.Provider value={{
      currentTab,
      breadcrumbs,
      recentlyViewed,
      bookmarks,
      navigateTo,
      addBookmark,
      removeBookmark,
      getTabTitle
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

// Enhanced Navigation Bar with Success-Driven Colors
const NavigationBar = () => {
  const { currentTab, breadcrumbs, recentlyViewed, bookmarks, navigateTo, addBookmark, removeBookmark } = useNavigation();
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 1) {
      const results = [
        { tab: 'arizona', title: 'Arizona Property Analysis', description: 'Property valuation and market data' },
        { tab: 'visa', title: 'UK Visa Application', description: 'Visa requirements and tracking' },
        { tab: 'uk-property', title: 'UK Property Search', description: 'Find your dream UK home' },
        { tab: 'work-search', title: 'Remote Work Search', description: 'Find remote opportunities' },
        { tab: 'chrome-extensions', title: 'Chrome Extensions', description: 'Productivity tools and extensions' },
        { tab: 'timeline', title: 'Master Timeline', description: 'Track your relocation journey' },
        { tab: 'financial', title: 'Financial Tracker', description: 'Budget and expense tracking' }
      ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const isBookmarked = (tab) => bookmarks.some(b => b.tab === tab);

  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b-2 border-amber-500/20 sticky top-0 z-40 shadow-xl">
      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Breadcrumbs */}
          <div className="flex items-center space-x-6">
            <RelocateMeLogo size="medium" className="cursor-pointer" onClick={() => navigateTo('dashboard')} />
            
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <span className="text-slate-400 mx-2">›</span>}
                  <button
                    onClick={() => navigateTo(crumb.path)}
                    className={`hover:text-amber-400 transition-colors ${
                      index === breadcrumbs.length - 1 ? 'text-amber-400 font-medium' : 'text-slate-300'
                    }`}
                  >
                    {crumb.title}
                  </button>
                </div>
              ))}
            </nav>
          </div>

          {/* Search and Quick Navigation */}
          <div className="flex items-center space-x-4">
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search platform..."
                className="w-64 pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-slate-400"
              />
              <div className="absolute left-3 top-2.5 text-slate-400">🔍</div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
                  {searchResults.map(result => (
                    <button
                      key={result.tab}
                      onClick={() => {
                        navigateTo(result.tab);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="w-full p-3 text-left hover:bg-slate-700 border-b border-slate-600 last:border-b-0"
                    >
                      <div className="font-medium text-amber-300">{result.title}</div>
                      <div className="text-sm text-slate-400">{result.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Nav Button */}
            <button
              onClick={() => setShowQuickNav(!showQuickNav)}
              className="p-2 text-slate-300 hover:text-amber-400 transition-colors"
              title="Quick Navigation"
            >
              ☰
            </button>

            {/* Bookmark Current Page */}
            <button
              onClick={() => {
                if (isBookmarked(currentTab)) {
                  removeBookmark(currentTab);
                } else {
                  addBookmark(currentTab, '', '');
                }
              }}
              className={`p-2 transition-colors ${
                isBookmarked(currentTab) ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
              }`}
              title={isBookmarked(currentTab) ? 'Remove Bookmark' : 'Add Bookmark'}
            >
              ⭐
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Dropdown */}
      {showQuickNav && (
        <div className="border-t border-slate-700 bg-slate-800/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Recently Viewed */}
              <div>
                <h3 className="font-semibold text-amber-300 mb-2">Recently Viewed</h3>
                {recentlyViewed.length > 0 ? (
                  <div className="space-y-1">
                    {recentlyViewed.map(item => (
                      <button
                        key={item.tab}
                        onClick={() => navigateTo(item.tab)}
                        className="block w-full text-left p-2 rounded hover:bg-slate-700 transition-colors text-sm"
                      >
                        <div className="text-slate-200">{item.title}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No recent views</p>
                )}
              </div>

              {/* Bookmarks */}
              <div>
                <h3 className="font-semibold text-amber-300 mb-2">Bookmarks</h3>
                {bookmarks.length > 0 ? (
                  <div className="space-y-1">
                    {bookmarks.map(item => (
                      <button
                        key={item.tab}
                        onClick={() => navigateTo(item.tab)}
                        className="block w-full text-left p-2 rounded hover:bg-slate-700 transition-colors text-sm text-slate-200"
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No bookmarks yet</p>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="font-semibold text-amber-300 mb-2">Quick Actions</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => navigateTo('timeline')}
                    className="block w-full text-left p-2 rounded hover:bg-slate-700 transition-colors text-sm text-slate-200"
                  >
                    📅 View Timeline
                  </button>
                  <button
                    onClick={() => navigateTo('visa')}
                    className="block w-full text-left p-2 rounded hover:bg-slate-700 transition-colors text-sm text-slate-200"
                  >
                    📄 Check Visa Progress
                  </button>
                  <button
                    onClick={() => navigateTo('uk-property')}
                    className="block w-full text-left p-2 rounded hover:bg-slate-700 transition-colors text-sm text-slate-200"
                  >
                    🏠 Browse Properties
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Password Reset Modal
const PasswordResetModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    verification_question: '',
    new_password: '',
    confirm_password: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (formData.new_password !== formData.confirm_password) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/forgot-password`, {
        email: formData.email,
        full_name: formData.full_name,
        verification_question: formData.verification_question,
        new_password: formData.new_password
      });

      setMessage('Password reset successful! You can now login with your new password.');
      setStep(3);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-amber-300">Reset Password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">Please verify your identity to reset your password.</p>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                placeholder="user@relocate.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                placeholder="Arizona Relocator"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Security Question: What city are you moving from?
              </label>
              <input
                type="text"
                value={formData.verification_question}
                onChange={(e) => setFormData({...formData, verification_question: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                placeholder="Enter city name"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2 rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all font-medium disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full bg-slate-600 text-slate-200 py-2 rounded-lg hover:bg-slate-500 transition-all"
            >
              Back
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-emerald-400 text-4xl mb-4">✅</div>
            <p className="text-emerald-400 font-medium mb-4">{message}</p>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              Close
            </button>
          </div>
        )}

        {message && step !== 3 && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('successful') ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Login Screen with Success Psychology
const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await login(username, password);
    
    if (!success) {
      setError('Invalid username or password');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-amber-500/20">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">🏠</span>
          </div>
          <RelocateMeLogo size="xl" className="mb-2" />
          <p className="text-slate-300">Elite relocation platform for achievers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-white"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-white"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 px-4 rounded-lg hover:from-amber-600 hover:via-orange-600 hover:to-red-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Accessing Platform...
              </div>
            ) : (
              'Access Elite Platform'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowResetModal(true)}
            className="text-amber-400 hover:text-amber-300 text-sm font-medium"
          >
            Forgot your password?
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>Your complete UK relocation solution</p>
          <p>🏠 Property • 📄 Visa • 💼 Work • 🔧 Tools</p>
        </div>
      </div>

      <PasswordResetModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};

// Main App Component with Integrated Navigation
function App() {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl text-slate-200">Loading your elite platform...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  return (
    <div className="App min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <NavigationBar />
      <Routes>
        <Route path="/" element={<PlatformDashboard />} />
        <Route path="/arizona-property" element={<ArizonaProperty />} />
        <Route path="/uk-visa" element={<UKVisa />} />
        <Route path="/uk-property" element={<UKPropertySearch />} />
        <Route path="/work-search" element={<WorkSearch />} />
        <Route path="/chrome-extensions" element={<ChromeExtensions />} />
      </Routes>
    </div>
  );
}

// Platform Dashboard - Enhanced Success Psychology
const PlatformDashboard = () => {
  const [apiStatus, setApiStatus] = useState(null);
  const { navigateTo } = useNavigation();

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await axios.get(`${API}/health`);
        setApiStatus("✅ Connected");
      } catch (e) {
        setApiStatus("❌ Disconnected");
        console.error("API connection failed:", e);
      }
    };
    checkApiStatus();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-6">
            Elite Relocation Platform
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Transform your Arizona to UK relocation journey with our premium, 
            success-driven platform designed for high achievers and ambitious professionals.
          </p>
          <div className="text-lg">
            <span className="font-semibold text-slate-300">Platform Status: </span>
            <span className={apiStatus?.includes("✅") ? "text-emerald-400" : "text-red-400"}>
              {apiStatus || "Checking..."}
            </span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon="🏘️"
            title="Arizona Property Management"
            description="Maximize your property value with professional valuation and strategic market analysis."
            link={() => navigateTo('arizona-property')}
            tier="PREMIUM"
          />
          <FeatureCard
            icon="🛂"
            title="UK Visa Mastery"
            description="Navigate complex visa applications with expert guidance and automated tracking."
            link={() => navigateTo('uk-visa')}
            tier="ELITE"
          />
          <FeatureCard
            icon="🏠"
            title="UK Property Intelligence"
            description="Access exclusive property insights and market intelligence for strategic decisions."
            link={() => navigateTo('uk-property')}
            tier="PLATINUM"
          />
          <FeatureCard
            icon="💼"
            title="Remote Work Opportunities"
            description="Discover high-paying remote positions and build your UK career foundation."
            link={() => navigateTo('work-search')}
            tier="PREMIUM"
          />
          <FeatureCard
            icon="🔧"
            title="Chrome Extensions Suite"
            description="Professional browser tools designed for serious relocators and achievers."
            link={() => navigateTo('chrome-extensions')}
            tier="ELITE"
          />
          <FeatureCard
            icon="📊"
            title="Success Tracking"
            description="Monitor your progress with advanced analytics and achievement milestones."
            link={() => navigateTo('timeline')}
            tier="PLATINUM"
          />
        </div>

        {/* Process Timeline */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-2xl p-8 border border-amber-500/20">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Your Elite Relocation Journey
          </h2>
          <div className="flex flex-wrap justify-center items-center space-x-4">
            {[
              "🏠 Optimize Arizona Property",
              "🛂 Master UK Visa Process", 
              "💼 Secure Remote Work",
              "🇬🇧 Acquire UK Property",
              "✈️ Execute Perfect Relocation"
            ].map((step, index) => (
              <div key={index} className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
                  {step}
                </div>
                {index < 4 && <span className="mx-2 text-amber-400 text-2xl">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, link, tier }) => {
  const getTierColor = (tier) => {
    switch(tier) {
      case 'PLATINUM': return 'from-slate-400 to-slate-300';
      case 'ELITE': return 'from-purple-500 to-purple-400';
      case 'PREMIUM': return 'from-amber-500 to-orange-400';
      default: return 'from-slate-400 to-slate-300';
    }
  };

  return (
    <div 
      onClick={link}
      className="group cursor-pointer bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full border border-slate-600/50 hover:border-amber-500/50"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl mb-4">{icon}</div>
        <span className={`text-xs px-2 py-1 rounded bg-gradient-to-r ${getTierColor(tier)} text-white font-bold`}>
          {tier}
        </span>
      </div>
      <h3 className="text-xl font-bold mb-3 group-hover:text-amber-400 transition-colors text-slate-200">
        {title}
      </h3>
      <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
        {description}
      </p>
    </div>
  );
};

// Arizona Property Component - Enhanced Success Psychology
const ArizonaProperty = () => {
  const [properties, setProperties] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [stats, setStats] = useState({ totalValue: 0, avgValue: 0, marketTrend: "rising" });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/arizona-property`);
      setProperties(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const calculateStats = (propertyList) => {
    const totalValue = propertyList.reduce((sum, prop) => sum + (prop.estimated_value || 0), 0);
    const avgValue = propertyList.length > 0 ? totalValue / propertyList.length : 0;
    setStats({ totalValue, avgValue, marketTrend: "rising" });
  };

  const addProperty = async (propertyData) => {
    try {
      await axios.post(`${API}/arizona-property`, propertyData);
      fetchProperties();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding property:", error);
    }
  };

  const getMarketAnalysis = async (propertyId) => {
    try {
      const response = await axios.get(`${API}/arizona-property/${propertyId}/market-analysis`);
      setMarketAnalysis(response.data);
    } catch (error) {
      console.error("Error fetching market analysis:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          🏘️ Arizona Property Elite
        </h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg font-medium"
        >
          + Add Premium Property
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl border border-amber-500/20">
          <h3 className="text-lg font-semibold text-amber-300 mb-2">Total Portfolio Value</h3>
          <p className="text-3xl font-bold text-white">${stats.totalValue.toLocaleString()}</p>
          <p className="text-emerald-400 text-sm mt-2">💰 Elite Portfolio</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl border border-purple-500/20">
          <h3 className="text-lg font-semibold text-purple-300 mb-2">Average Property Value</h3>
          <p className="text-3xl font-bold text-white">${Math.round(stats.avgValue).toLocaleString()}</p>
          <p className="text-purple-400 text-sm mt-2">📊 Premium Average</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl border border-emerald-500/20">
          <h3 className="text-lg font-semibold text-emerald-300 mb-2">Market Status</h3>
          <p className="text-3xl font-bold text-emerald-400">Rising</p>
          <p className="text-emerald-400 text-sm mt-2">📈 Optimal Timing</p>
        </div>
      </div>

      {showAddForm && (
        <PropertyForm
          onSubmit={addProperty}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onSelect={setSelectedProperty}
            onAnalysis={() => getMarketAnalysis(property.id)}
          />
        ))}
      </div>

      {marketAnalysis && (
        <MarketAnalysisModal
          analysis={marketAnalysis}
          onClose={() => setMarketAnalysis(null)}
        />
      )}
    </div>
  );
};

const PropertyForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    address: '',
    city: 'Phoenix',
    zip_code: '',
    property_type: 'single_family',
    square_feet: '',
    bedrooms: '',
    bathrooms: '',
    year_built: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      square_feet: parseInt(formData.square_feet),
      bedrooms: parseInt(formData.bedrooms),
      bathrooms: parseFloat(formData.bathrooms),
      year_built: parseInt(formData.year_built)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto border border-amber-500/20">
        <h2 className="text-2xl font-bold mb-6 text-amber-300">Add Elite Property</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Property Address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
              required
            />
            <input
              type="text"
              placeholder="ZIP Code"
              value={formData.zip_code}
              onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
              required
            />
            <select
              value={formData.property_type}
              onChange={(e) => setFormData({...formData, property_type: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            >
              <option value="single_family">Single Family</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="manufactured">Manufactured</option>
            </select>
            <input
              type="number"
              placeholder="Square Feet"
              value={formData.square_feet}
              onChange={(e) => setFormData({...formData, square_feet: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
              required
            />
            <input
              type="number"
              placeholder="Bedrooms"
              value={formData.bedrooms}
              onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
              required
            />
            <input
              type="number"
              step="0.5"
              placeholder="Bathrooms"
              value={formData.bathrooms}
              onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
              required
            />
          </div>
          <input
            type="number"
            placeholder="Year Built"
            value={formData.year_built}
            onChange={(e) => setFormData({...formData, year_built: e.target.value})}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            required
          />
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all"
            >
              Add Elite Property
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-500 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PropertyCard = ({ property, onSelect, onAnalysis }) => (
  <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg border border-slate-600/50 hover:border-amber-500/50 transition-all">
    <h3 className="text-xl font-bold mb-2 text-amber-300">{property.address}</h3>
    <div className="space-y-2 text-slate-300">
      <p>📐 {property.square_feet} sq ft</p>
      <p>🛏️ {property.bedrooms} bed, {property.bathrooms} bath</p>
      <p>📅 Built: {property.year_built}</p>
      {property.estimated_value && (
        <p className="text-emerald-400 font-bold text-lg">
          💎 Elite Value: ${property.estimated_value.toLocaleString()}
        </p>
      )}
    </div>
    <div className="mt-4 space-y-2">
      <button
        onClick={onAnalysis}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded hover:from-purple-600 hover:to-purple-700 transition-all font-medium"
      >
        📊 Premium Analysis
      </button>
    </div>
  </div>
);

const MarketAnalysisModal = ({ analysis, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-8 rounded-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto border border-amber-500/20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-amber-300">📊 Premium Market Analysis</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">×</button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 p-4 rounded-lg">
          <h3 className="font-bold text-emerald-200">Median Home Value</h3>
          <p className="text-2xl font-bold text-emerald-100">${analysis.median_home_value?.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-800 to-purple-700 p-4 rounded-lg">
          <h3 className="font-bold text-purple-200">Price per Sq Ft</h3>
          <p className="text-2xl font-bold text-purple-100">${analysis.price_per_sqft}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-800 to-orange-700 p-4 rounded-lg">
          <h3 className="font-bold text-amber-200">Market Trend</h3>
          <p className="text-2xl font-bold text-amber-100 capitalize">{analysis.market_trend}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-lg">
          <h3 className="font-bold text-slate-200">Avg Days on Market</h3>
          <p className="text-2xl font-bold text-slate-100">{analysis.days_on_market} days</p>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 text-amber-300">Elite Comparable Sales</h3>
      <div className="space-y-3">
        {analysis.comparable_sales?.map((sale, index) => (
          <div key={index} className="bg-slate-700 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-200">{sale.address}</p>
              <p className="text-slate-400">{sale.sqft} sq ft</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-400">${sale.price?.toLocaleString()}</p>
              <p className="text-slate-400">{sale.date_sold}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// UK Visa Component - Enhanced Success Psychology
const UKVisa = () => {
  const [applications, setApplications] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState(null);
  const [visaInfo, setVisaInfo] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${API}/visa-application`);
      setApplications(response.data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const addApplication = async (visaData) => {
    try {
      await axios.post(`${API}/visa-application`, visaData);
      fetchApplications();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding visa application:", error);
    }
  };

  const getVisaInfo = async (visaType) => {
    try {
      const response = await axios.get(`${API}/visa-info/${visaType}`);
      setVisaInfo(response.data);
    } catch (error) {
      console.error("Error fetching visa info:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          🛂 UK Visa Mastery
        </h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg font-medium"
        >
          + Elite Application
        </button>
      </div>

      {/* Visa Types Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <VisaTypeCard
          type="skilled_worker"
          title="Skilled Worker Visa"
          description="For elite professionals with UK job offers"
          icon="👩‍💼"
          tier="PREMIUM"
          onClick={() => getVisaInfo('skilled_worker')}
        />
        <VisaTypeCard
          type="global_talent"
          title="Global Talent Visa"
          description="For industry leaders and innovators"
          icon="🌟"
          tier="ELITE"
          onClick={() => getVisaInfo('global_talent')}
        />
        <VisaTypeCard
          type="spouse_partner"
          title="Spouse/Partner Visa"
          description="For partners of UK citizens/residents"
          icon="💕"
          tier="PLATINUM"
          onClick={() => getVisaInfo('spouse_partner')}
        />
      </div>

      {showAddForm && (
        <VisaApplicationForm
          onSubmit={addApplication}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((application) => (
          <VisaApplicationCard
            key={application.id}
            application={application}
            onSelect={setSelectedVisa}
          />
        ))}
      </div>

      {visaInfo && (
        <VisaInfoModal
          info={visaInfo}
          onClose={() => setVisaInfo(null)}
        />
      )}
    </div>
  );
};

const VisaTypeCard = ({ type, title, description, icon, tier, onClick }) => {
  const getTierColor = (tier) => {
    switch(tier) {
      case 'PLATINUM': return 'from-slate-400 to-slate-300';
      case 'ELITE': return 'from-purple-500 to-purple-400';
      case 'PREMIUM': return 'from-amber-500 to-orange-400';
      default: return 'from-slate-400 to-slate-300';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 border border-slate-600/50 hover:border-amber-500/50"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl">{icon}</div>
        <span className={`text-xs px-2 py-1 rounded bg-gradient-to-r ${getTierColor(tier)} text-white font-bold`}>
          {tier}
        </span>
      </div>
      <h3 className="text-xl font-bold mb-2 text-amber-300">{title}</h3>
      <p className="text-slate-400">{description}</p>
      <button className="mt-4 text-amber-400 font-semibold hover:text-amber-300">
        Master This Path →
      </button>
    </div>
  );
};

const VisaApplicationForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    visa_type: 'skilled_worker',
    applicant_name: '',
    target_submission_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      target_submission_date: formData.target_submission_date ? new Date(formData.target_submission_date) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full mx-4 border border-amber-500/20">
        <h2 className="text-2xl font-bold mb-6 text-amber-300">Elite Visa Application</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={formData.visa_type}
            onChange={(e) => setFormData({...formData, visa_type: e.target.value})}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
          >
            <option value="skilled_worker">Skilled Worker</option>
            <option value="global_talent">Global Talent</option>
            <option value="spouse_partner">Spouse/Partner</option>
            <option value="family_reunion">Family Reunion</option>
          </select>
          <input
            type="text"
            placeholder="Applicant Name"
            value={formData.applicant_name}
            onChange={(e) => setFormData({...formData, applicant_name: e.target.value})}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            required
          />
          <input
            type="date"
            placeholder="Target Submission Date"
            value={formData.target_submission_date}
            onChange={(e) => setFormData({...formData, target_submission_date: e.target.value})}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
          />
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
            >
              Start Elite Process
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-500 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VisaApplicationCard = ({ application, onSelect }) => (
  <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg border border-slate-600/50">
    <h3 className="text-xl font-bold mb-2 text-amber-300">{application.applicant_name}</h3>
    <div className="space-y-2 text-slate-300">
      <p>📋 {application.visa_type.replace('_', ' ').toUpperCase()}</p>
      <p>📊 Status: <span className="capitalize text-purple-400">{application.status}</span></p>
      {application.target_submission_date && (
        <p>📅 Target: {new Date(application.target_submission_date).toLocaleDateString()}</p>
      )}
    </div>
    <div className="mt-4">
      <div className="text-sm text-slate-400 mb-2">
        Documents: {application.documents_checklist?.filter(doc => doc.obtained).length || 0}/
        {application.documents_checklist?.length || 0}
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
          style={{
            width: `${((application.documents_checklist?.filter(doc => doc.obtained).length || 0) / (application.documents_checklist?.length || 1)) * 100}%`
          }}
        ></div>
      </div>
    </div>
  </div>
);

const VisaInfoModal = ({ info, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-8 rounded-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto border border-amber-500/20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-amber-300">Elite Visa Information</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">×</button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-purple-300">Description</h3>
          <p className="text-slate-300">{info.description}</p>
        </div>
        
        <div>
          <h3 className="font-bold text-lg text-purple-300">Requirements</h3>
          <ul className="list-disc list-inside text-slate-300">
            {info.requirements?.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 p-4 rounded-lg">
            <h4 className="font-bold text-emerald-200">Processing Time</h4>
            <p className="text-emerald-100">{info.processing_time}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-800 to-orange-700 p-4 rounded-lg">
            <h4 className="font-bold text-amber-200">Investment Required</h4>
            <p className="text-amber-100">{info.cost}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-800 to-purple-700 p-4 rounded-lg">
          <h4 className="font-bold text-purple-200">Validity Period</h4>
          <p className="text-purple-100">{info.validity}</p>
        </div>
      </div>
    </div>
  </div>
);

const UKPropertySearch = () => {
  const [properties, setProperties] = useState([]);
  const [searchParams, setSearchParams] = useState({
    region: '',
    property_type: '',
    min_price: '',
    max_price: '',
    min_bedrooms: '',
    max_bedrooms: ''
  });
  const [regionInfo, setRegionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRegionInfo();
  }, []);

  const fetchRegionInfo = async () => {
    try {
      const response = await axios.get(`${API}/uk-regions-info`);
      setRegionInfo(response.data);
    } catch (error) {
      console.error("Error fetching region info:", error);
    }
  };

  const searchProperties = async () => {
    setIsLoading(true);
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, value]) => value !== '')
      );
      const response = await axios.post(`${API}/uk-property-search`, cleanParams);
      setProperties(response.data.properties);
    } catch (error) {
      console.error("Error searching properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProperty = async (propertyId) => {
    try {
      await axios.post(`${API}/uk-property/${propertyId}/save`, { user_id: "user123" });
      alert("Elite property saved to your portfolio!");
    } catch (error) {
      console.error("Error saving property:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-8">
        🏠 UK Property Intelligence
      </h1>

      {/* Search Filters */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg mb-8 border border-amber-500/20">
        <h2 className="text-2xl font-bold mb-4 text-amber-300">Elite Property Search</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <select
            value={searchParams.region}
            onChange={(e) => setSearchParams({...searchParams, region: e.target.value})}
            className="p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
          >
            <option value="">All Regions</option>
            <option value="london">London</option>
            <option value="south_east">South East</option>
            <option value="south_west">South West</option>
            <option value="north">North</option>
            <option value="scotland">Scotland</option>
            <option value="wales">Wales</option>
          </select>

          <select
            value={searchParams.property_type}
            onChange={(e) => setSearchParams({...searchParams, property_type: e.target.value})}
            className="p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
          >
            <option value="">All Types</option>
            <option value="detached">Detached</option>
            <option value="semi_detached">Semi-Detached</option>
            <option value="terraced">Terraced</option>
            <option value="flat">Flat</option>
            <option value="apartment">Apartment</option>
          </select>

          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min Price £"
              value={searchParams.min_price}
              onChange={(e) => setSearchParams({...searchParams, min_price: e.target.value})}
              className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            />
            <input
              type="number"
              placeholder="Max Price £"
              value={searchParams.max_price}
              onChange={(e) => setSearchParams({...searchParams, max_price: e.target.value})}
              className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            />
          </div>

          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min Beds"
              value={searchParams.min_bedrooms}
              onChange={(e) => setSearchParams({...searchParams, min_bedrooms: e.target.value})}
              className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            />
            <input
              type="number"
              placeholder="Max Beds"
              value={searchParams.max_bedrooms}
              onChange={(e) => setSearchParams({...searchParams, max_bedrooms: e.target.value})}
              className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            />
          </div>

          <button
            onClick={searchProperties}
            disabled={isLoading}
            className="md:col-span-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 font-medium"
          >
            {isLoading ? "Searching Elite Properties..." : "🔍 Search Premium Properties"}
          </button>
        </div>
      </div>

      {/* Region Information */}
      {regionInfo && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Object.entries(regionInfo).map(([region, info]) => (
            <div key={region} className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg border border-purple-500/20">
              <h3 className="text-xl font-bold mb-2 capitalize text-purple-300">{region.replace('_', ' ')}</h3>
              <p className="text-3xl font-bold text-emerald-400 mb-2">
                £{info.avg_price?.toLocaleString()}
              </p>
              <p className="text-slate-300 mb-3">{info.description}</p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-400"><strong className="text-amber-300">Transport:</strong> {info.transport}</p>
                <p className="text-slate-400"><strong className="text-amber-300">Schools:</strong> {info.schools}</p>
                <p className="text-slate-400"><strong className="text-amber-300">Top Areas:</strong> {info.top_areas?.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Results */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property, index) => (
          <UKPropertyCard
            key={property.id || index}
            property={property}
            onSave={() => saveProperty(property.id)}
          />
        ))}
      </div>

      {properties.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏰</div>
          <p className="text-slate-400 text-xl">Search for premium UK properties to see results</p>
        </div>
      )}
    </div>
  );
};

const UKPropertyCard = ({ property, onSave }) => (
  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg overflow-hidden border border-slate-600/50 hover:border-amber-500/50 transition-all">
    <img
      src={property.images?.[0] || "https://images.pexels.com/photos/1661566/pexels-photo-1661566.jpeg?w=400&h=250&fit=crop"}
      alt={property.title}
      className="w-full h-48 object-cover"
    />
    <div className="p-6">
      <h3 className="text-xl font-bold mb-2 text-amber-300">{property.title}</h3>
      <p className="text-slate-400 mb-3">{property.address}</p>
      <div className="flex justify-between items-center mb-4">
        <p className="text-2xl font-bold text-emerald-400">
          £{property.price?.toLocaleString()}
        </p>
        <div className="text-slate-300">
          🛏️ {property.bedrooms} bed • 🚿 {property.bathrooms} bath
        </div>
      </div>
      <div className="space-y-2 text-sm text-slate-400 mb-4">
        <p>📍 {property.city}, {property.region?.replace('_', ' ')}</p>
        <p>🏠 {property.property_type?.replace('_', ' ')}</p>
      </div>
      <button
        onClick={onSave}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded hover:from-purple-600 hover:to-purple-700 transition-all font-medium"
      >
        💎 Save Elite Property
      </button>
    </div>
  </div>
);

// Work Search Component - Enhanced Success Psychology
const WorkSearch = () => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async (search = '', page = 1) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/remote-jobs`, {
        params: { search, page, limit: 20 }
      });
      setJobs(response.data.jobs);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${API}/job-applications/user123`);
      setApplications(response.data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const applyToJob = async (jobId) => {
    try {
      await axios.post(`${API}/job-application`, {
        job_id: jobId,
        user_id: "user123"
      });
      fetchApplications();
      alert("Elite application submitted successfully!");
    } catch (error) {
      console.error("Error applying to job:", error);
    }
  };

  const handleSearch = () => {
    fetchJobs(searchTerm, 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          💼 Elite Remote Opportunities
        </h1>
        <div className="text-sm text-slate-400">
          Powered by <a href="https://remote.co" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 hover:underline">Remote.co</a>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg mb-8 border border-amber-500/20">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search premium remote opportunities (e.g., 'software engineer', 'product manager')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 font-medium"
          >
            {isLoading ? "Searching..." : "🔍 Search"}
          </button>
        </div>
      </div>

      {/* Elite Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg text-center border border-amber-500/20">
          <h3 className="text-3xl font-bold text-amber-400">{jobs.length}</h3>
          <p className="text-slate-300">Premium Opportunities</p>
          <p className="text-emerald-400 text-sm mt-2">🌟 Elite Positions</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg text-center border border-purple-500/20">
          <h3 className="text-3xl font-bold text-purple-400">{applications.length}</h3>
          <p className="text-slate-300">Your Applications</p>
          <p className="text-purple-400 text-sm mt-2">📊 Success Tracking</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg text-center border border-emerald-500/20">
          <h3 className="text-3xl font-bold text-emerald-400">100%</h3>
          <p className="text-slate-300">Remote Opportunities</p>
          <p className="text-emerald-400 text-sm mt-2">🌐 Global Freedom</p>
        </div>
      </div>

      {/* Job Listings */}
      <div className="space-y-6">
        {jobs.map((job, index) => (
          <JobCard
            key={job.id || index}
            job={job}
            onApply={() => applyToJob(job.id)}
            hasApplied={applications.some(app => app.job_id === job.id)}
          />
        ))}
      </div>

      {jobs.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💼</div>
          <p className="text-slate-400 text-xl">Search for elite remote opportunities</p>
        </div>
      )}
    </div>
  );
};

const JobCard = ({ job, onApply, hasApplied }) => (
  <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg border border-slate-600/50 hover:border-amber-500/50 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <h3 className="text-xl font-bold mb-2 text-amber-300">{job.title}</h3>
        <p className="text-lg text-slate-200 mb-2">{job.company}</p>
        <div className="flex items-center space-x-4 text-slate-400">
          <span>📍 {job.location}</span>
          <span>💼 {job.job_type?.replace('_', ' ')}</span>
          {job.salary_range && <span>💰 {job.salary_range}</span>}
          {job.visa_sponsorship && <span className="text-emerald-400">✅ Visa Sponsorship</span>}
        </div>
      </div>
      <div className="flex flex-col items-end space-y-2">
        <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
          🌐 Remote Elite
        </span>
        {hasApplied ? (
          <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            ✅ Applied
          </span>
        ) : (
          <button
            onClick={onApply}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-medium"
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
    
    <p className="text-slate-300 mb-4 line-clamp-3">{job.description}</p>
    
    {job.requirements && job.requirements.length > 0 && (
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-purple-300">Elite Requirements:</h4>
        <ul className="list-disc list-inside text-slate-400 text-sm">
          {job.requirements.slice(0, 3).map((req, index) => (
            <li key={index}>{req}</li>
          ))}
        </ul>
      </div>
    )}
    
    <div className="flex justify-between items-center">
      <a
        href={job.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 hover:text-amber-300 hover:underline font-medium"
      >
        View Full Details →
      </a>
      <span className="text-emerald-400 text-sm font-medium">
        Remote-Ready ✅
      </span>
    </div>
  </div>
);

// Chrome Extensions Component - Enhanced Success Psychology
const ChromeExtensions = () => {
  const [extensions, setExtensions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState({});

  useEffect(() => {
    fetchExtensions();
    fetchCategories();
  }, []);

  const fetchExtensions = async (category = '') => {
    try {
      const params = category ? { category } : {};
      const response = await axios.get(`${API}/chrome-extensions`, { params });
      setExtensions(response.data);
    } catch (error) {
      console.error("Error fetching extensions:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/chrome-extensions/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const filterByCategory = (category) => {
    setSelectedCategory(category);
    fetchExtensions(category);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-4">
          🔧 Elite Chrome Extensions Suite
        </h1>
        <p className="text-xl text-slate-300">
          Premium browser tools designed for serious relocators and high achievers
        </p>
      </div>

      {/* Category Filter */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-lg mb-8 border border-amber-500/20">
        <h2 className="text-2xl font-bold mb-4 text-amber-300">Filter by Elite Category</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => filterByCategory('')}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              selectedCategory === '' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            All Extensions
          </button>
          {Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => filterByCategory(key)}
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                selectedCategory === key 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Extensions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {extensions.map((extension) => (
          <ExtensionCard key={extension.id} extension={extension} />
        ))}
      </div>

      {extensions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <p className="text-slate-400 text-xl">No elite extensions found for the selected category</p>
        </div>
      )}

      {/* Installation Instructions */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 p-6 rounded-xl mt-8 border border-emerald-500/20">
        <h2 className="text-2xl font-bold text-emerald-200 mb-4">📥 Elite Installation Guide</h2>
        <ol className="list-decimal list-inside space-y-2 text-emerald-100">
          <li>Click the "Download from Chrome Store" button for your chosen extension</li>
          <li>You'll be redirected to the official Chrome Web Store page</li>
          <li>Click "Add to Chrome" on the extension page</li>
          <li>Confirm installation when prompted by Chrome</li>
          <li>The extension will appear in your browser toolbar for immediate use</li>
        </ol>
        <div className="mt-4 p-3 bg-emerald-900/50 rounded text-sm text-emerald-200">
          💡 <strong>Pro Tip:</strong> Pin essential extensions to your toolbar for quick access during your relocation journey.
        </div>
      </div>
    </div>
  );
};

const ExtensionCard = ({ extension }) => {
  const getCategoryIcon = (category) => {
    const icons = {
      property_search: "🏠",
      job_search: "💼",
      immigration: "🛂",
      productivity: "⚡",
      relocation: "📦"
    };
    return icons[category] || "🔧";
  };

  const getCategoryColor = (category) => {
    const colors = {
      property_search: "bg-gradient-to-r from-emerald-500 to-green-500",
      job_search: "bg-gradient-to-r from-blue-500 to-blue-600",
      immigration: "bg-gradient-to-r from-purple-500 to-purple-600",
      productivity: "bg-gradient-to-r from-amber-500 to-orange-500",
      relocation: "bg-gradient-to-r from-orange-500 to-red-500"
    };
    return colors[category] || "bg-gradient-to-r from-slate-500 to-slate-600";
  };

  const getTierBadge = (userCount) => {
    const count = parseInt(userCount?.replace(/[^\d]/g, '') || '0');
    if (count >= 50000) return { tier: 'PLATINUM', color: 'from-slate-400 to-slate-300' };
    if (count >= 25000) return { tier: 'ELITE', color: 'from-purple-500 to-purple-400' };
    return { tier: 'PREMIUM', color: 'from-amber-500 to-orange-400' };
  };

  const tierBadge = getTierBadge(extension.user_count);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg overflow-hidden border border-slate-600/50 hover:border-amber-500/50 transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img
              src={extension.icon_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=64&h=64&fit=crop"}
              alt={extension.name}
              className="w-12 h-12 rounded-lg"
            />
            <div>
              <h3 className="text-lg font-bold text-amber-300">{extension.name}</h3>
              <span className={`text-xs px-2 py-1 rounded text-white font-bold ${getCategoryColor(extension.category)}`}>
                {getCategoryIcon(extension.category)} {extension.category.replace('_', ' ')}
              </span>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded bg-gradient-to-r ${tierBadge.color} text-white font-bold`}>
            {tierBadge.tier}
          </span>
        </div>
        
        <p className="text-slate-300 mb-4 text-sm">{extension.description}</p>
        
        {extension.features && extension.features.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 text-purple-300">Elite Features:</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              {extension.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="text-emerald-400 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4 text-sm">
          {extension.rating && (
            <div className="flex items-center text-amber-400">
              <span className="mr-1">⭐</span>
              <span className="font-medium">{extension.rating}</span>
            </div>
          )}
          {extension.user_count && (
            <span className="text-slate-400">{extension.user_count} users</span>
          )}
        </div>
        
        <a
          href={extension.chrome_store_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-center py-3 rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all font-semibold"
        >
          📥 Download from Chrome Store
        </a>
      </div>
    </div>
  );
};

// Main App with Providers
function MainApp() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default MainApp;
