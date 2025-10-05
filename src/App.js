import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, Loader2, ArrowRight, ArrowLeft, Send, Menu, X, Search, Library, FolderPlus, MessageSquarePlus, Copy, ThumbsUp, ThumbsDown, RefreshCw, ChevronDown, Sun, Moon } from 'lucide-react';
import './App.css';

const INDUSTRIES = [
  'Marketing & Advertising', 'E-commerce & Retail', 'Content Creation & Social Media',
  'Education & Training', 'Real Estate', 'Technology & Software', 'Healthcare & Wellness',
  'Food & Beverage', 'Fashion & Beauty', 'Entertainment & Media', 'Finance & Business', 'Other'
];

const PURPOSES = [
  'Social media posts', 'Website content', 'Blog articles', 'Product mockups',
  'Marketing materials', 'Presentations', 'Advertising campaigns', 'Print materials',
  'Personal projects', 'Other'
];

const IMAGE_STYLES = [
  'Photorealistic', 'Illustration', 'Abstract', 'Minimalist', 'Vintage/Retro',
  'Modern/Futuristic', 'Artistic/Painterly', 'Corporate/Professional', 'Casual/Friendly', 'Mixed/Varies'
];

const IMAGE_KEYWORDS = [
  'generate', 'create', 'make', 'draw', 'design', 'picture', 'image', 'photo',
  'illustration', 'render', 'visualize', 'show me', 'gawa', 'landscape', 'portrait',
  'scene', 'artwork', 'painting', 'sketch', 'drawing', 'graphic', 'logo', 'poster',
  'banner', 'thumbnail'
];

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState({
    name: '', industry: '', niche: '', purpose: '', goals: '', imageStyle: ''
  });
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('rod-ai-theme');
    return saved || 'dark';
  });
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rod-ai-theme', theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  const isImageRequest = useCallback((text) => {
    const lowerText = text.toLowerCase();
    return IMAGE_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }, []);

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleNext = () => {
    if (onboardingStep < 4) {
      setOnboardingStep(s => s + 1);
    } else {
      setShowOnboarding(false);
    }
  };

  const handleBack = () => {
    if (onboardingStep > 1) setOnboardingStep(s => s - 1);
  };

  const canProceed = () => {
    switch (onboardingStep) {
      case 1: return userData.name.trim() !== '';
      case 2: return userData.industry !== '' && userData.niche.trim() !== '';
      case 3: return userData.purpose !== '' && userData.goals.trim() !== '';
      case 4: return userData.imageStyle !== '';
      default: return false;
    }
  };

  const updateUserData = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const generateImage = async (userPrompt) => {
    const enhancedPrompt = `${userPrompt}, ${userData.imageStyle || 'Photorealistic'} style, professional quality for ${userData.industry || 'general use'}`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024'
      }),
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Failed to generate image');
    }

    let imageUrl = data?.data?.[0]?.url || null;
    if (!imageUrl && data?.data?.[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    }
    if (!imageUrl) throw new Error('No image returned from API');

    return { imageUrl, prompt: userPrompt };
  };

  const getChatResponse = async (userPrompt) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Rod, a helpful AI assistant in ROD AI Studio. Be friendly, concise, and helpful. You can suggest image prompts when asked. The user works in ${userData.industry || 'an unspecified industry'} and focuses on ${userData.niche || 'a general niche'}.`,
          },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Failed to get response');
    }

    return data?.choices?.[0]?.message?.content ?? '(No content returned)';
  };

  const handleSendMessage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a message');
      return;
    }
    if (!API_KEY) {
      setError('Missing API key. Set REACT_APP_OPENAI_API_KEY in your environment.');
      return;
    }

    const userMessage = {
      type: 'user',
      content: prompt,
      timestamp: nowTime(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    const currentPrompt = prompt;
    setPrompt('');

    try {
      if (isImageRequest(currentPrompt)) {
        const { imageUrl, prompt: originalPrompt } = await generateImage(currentPrompt);
        const assistantMessage = {
          type: 'assistant',
          contentType: 'image',
          content: imageUrl,
          prompt: originalPrompt,
          timestamp: nowTime(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        const content = await getChatResponse(currentPrompt);
        const assistantMessage = {
          type: 'assistant',
          contentType: 'text',
          content,
          timestamp: nowTime(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const renderOnboardingStep = () => {
    switch (onboardingStep) {
      case 1:
        return (
          <div className="onboarding-step">
            <div className="step-icon">
              <Sparkles size={40} color="#3b82f6" />
            </div>
            <h1 className="step-title">Welcome to ROD AI Studio</h1>
            <p className="step-description">Let's personalize your experience. What should we call you?</p>
            <div className="form-field">
              <label className="field-label">Your Name</label>
              <input
                type="text"
                className="field-input"
                placeholder="Enter your name"
                value={userData.name}
                onChange={(e) => updateUserData('name', e.target.value)}
                autoFocus
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="onboarding-step">
            <h2 className="step-title">Tell us about your work</h2>
            <p className="step-description">This helps Rod generate images tailored to your industry</p>
            <div className="form-field">
              <label className="field-label">What industry are you in?</label>
              <select
                className="field-select"
                value={userData.industry}
                onChange={(e) => updateUserData('industry', e.target.value)}
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">What's your specific niche or focus?</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g., Sustainable fashion, SaaS startups, Fitness coaching"
                value={userData.niche}
                onChange={(e) => updateUserData('niche', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="onboarding-step">
            <h2 className="step-title">What will you create?</h2>
            <p className="step-description">Understanding your goals helps us optimize image generation</p>
            <div className="form-field">
              <label className="field-label">Primary purpose for images</label>
              <select
                className="field-select"
                value={userData.purpose}
                onChange={(e) => updateUserData('purpose', e.target.value)}
              >
                <option value="">Select a purpose</option>
                {PURPOSES.map(purpose => (
                  <option key={purpose} value={purpose}>{purpose}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">What are your main goals?</label>
              <textarea
                className="field-textarea"
                rows="4"
                placeholder="e.g., Increase engagement on Instagram, create professional product images, build brand awareness"
                value={userData.goals}
                onChange={(e) => updateUserData('goals', e.target.value)}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="onboarding-step">
            <h2 className="step-title">Choose your style</h2>
            <p className="step-description">Select your preferred image style</p>
            <div className="style-grid">
              {IMAGE_STYLES.map(style => (
                <button
                  key={style}
                  className={`style-card ${userData.imageStyle === style ? 'selected' : ''}`}
                  onClick={() => updateUserData('imageStyle', style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showOnboarding) {
    return (
      <>
        {/* Global Theme Toggle - Fixed Position */}
        <button 
          className="theme-toggle-floating" 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="onboarding-screen">
          <div className="onboarding-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(onboardingStep / 4) * 100}%` }} />
            </div>
            <p className="progress-text">Step {onboardingStep} of 4</p>
            
            {renderOnboardingStep()}

            <div className="onboarding-actions">
              {onboardingStep > 1 && (
                <button onClick={handleBack} className="btn btn-secondary">
                  <ArrowLeft size={20} />
                  Back
                </button>
              )}
              <button onClick={handleNext} className="btn btn-primary" disabled={!canProceed()}>
                {onboardingStep === 4 ? 'Start Creating' : 'Next'}
                <ArrowRight size={20} />
              </button>
            </div>

            <button onClick={() => setShowOnboarding(false)} className="skip-button">
              Skip for now
            </button>
          </div>
        </div>
      </>
    );
  }

  const hasConversation = chatHistory.length > 0 || loading;

  return (
    <>
      {/* Global Theme Toggle - Fixed Position */}
      <button 
        className="theme-toggle-floating" 
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="claude-layout">
        <aside className={`claude-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>

          {!sidebarCollapsed ? (
            <>
              <div className="sidebar-top">
                <div className="sidebar-logo-section">
                  <div className="logo-small">
                    <div className="logo-overlay" />
                    <div className="logo-ring-small" />
                    <div className="logo-dot-small" />
                  </div>
                  <h1 className="sidebar-title-main">ROD AI Studio</h1>
                </div>

                <div className="sidebar-nav">
                  <button className="nav-item active">
                    <MessageSquarePlus size={18} />
                    <span>New chat</span>
                  </button>
                  <button className="nav-item">
                    <Search size={18} />
                    <span>Search chats</span>
                  </button>
                  <button className="nav-item">
                    <Library size={18} />
                    <span>Library</span>
                  </button>
                </div>

                <div className="sidebar-section">
                  <div className="section-header">
                    <span className="section-title">Projects</span>
                    <button className="section-action">
                      <FolderPlus size={16} />
                    </button>
                  </div>
                  <button className="project-item" onClick={() => setChatHistory([])}>
                    <Sparkles size={16} />
                    <span>New Conversation</span>
                  </button>
                </div>
              </div>

              <div className="sidebar-bottom">
                <div className="user-menu-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
                  <div className="user-avatar-badge">
                    {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="user-info-bottom">
                    <p className="user-name">{userData.name || 'User'}</p>
                    <p className="user-workspace">{userData.industry || 'ROD AI Workspace'}</p>
                  </div>
                  <ChevronDown size={16} className="chevron-icon" />
                </div>
                
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="dropdown-item">
                      <span className="dropdown-label">Industry:</span>
                      <span className="dropdown-value">{userData.industry || 'Not set'}</span>
                    </div>
                    <div className="dropdown-item">
                      <span className="dropdown-label">Niche:</span>
                      <span className="dropdown-value">{userData.niche || 'Not set'}</span>
                    </div>
                    <div className="dropdown-item">
                      <span className="dropdown-label">Style:</span>
                      <span className="dropdown-value">{userData.imageStyle || 'Not set'}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="sidebar-icons">
              <button className="icon-btn" title="New Chat" onClick={() => setChatHistory([])}>
                <MessageSquarePlus size={20} />
              </button>
              <button className="icon-btn" title="Search">
                <Search size={20} />
              </button>
              <button className="icon-btn" title="Library">
                <Library size={20} />
              </button>
            </div>
          )}
        </aside>

        <main className="claude-main">
          <div className="chat-container">
            {!hasConversation ? (
              <div className="centered-content">
                <div className="empty-state">
                  <div className="empty-icon">
                    <Sparkles size={48} color="#3b82f6" />
                  </div>
                  <h2 className="empty-title">Ready to create, {userData.name || 'there'}?</h2>
                  <p className="empty-subtitle">Ask me anything or generate images</p>
                </div>

                <div className="centered-input-wrapper">
                  <textarea
                    ref={textareaRef}
                    className="centered-input"
                    placeholder="Ask a question or describe an image to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows="3"
                  />
                  <button
                    className="centered-send-button"
                    onClick={handleSendMessage}
                    disabled={loading || !prompt.trim()}
                    aria-label="Send message"
                  >
                    <Send size={20} />
                  </button>
                </div>

                <div className="centered-suggestion-chips">
                  <button className="chip" onClick={() => setPrompt('Create a serene mountain landscape at golden hour')}>
                    Mountain landscape
                  </button>
                  <button className="chip" onClick={() => setPrompt('What are the best practices for social media images?')}>
                    Social media tips
                  </button>
                  <button className="chip" onClick={() => setPrompt('Generate a futuristic robot in a cyberpunk city')}>
                    Sci-fi scene
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="messages">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`message ${message.type}`}>
                      {message.type === 'assistant' ? (
                        <div className="message-content">
                          <div className="message-avatar rod-avatar">
                            <Sparkles size={16} />
                          </div>
                          <div className="message-wrapper">
                            {message.contentType === 'image' ? (
                              <>
                                <div className="generated-result">
                                  <img src={message.content} alt="Generated" className="result-image" />
                                  <p className="result-prompt">"{message.prompt}"</p>
                                </div>
                                <div className="message-actions">
                                  <button className="action-btn" onClick={() => handleCopy(message.prompt)}>
                                    <Copy size={14} />
                                  </button>
                                  <button className="action-btn">
                                    <ThumbsUp size={14} />
                                  </button>
                                  <button className="action-btn">
                                    <ThumbsDown size={14} />
                                  </button>
                                  <a href={message.content} download="rod-ai-image.png" className="action-btn">
                                    <Download size={14} />
                                  </a>
                                  <button className="action-btn" onClick={() => setPrompt(message.prompt)}>
                                    <RefreshCw size={14} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="message-text">
                                  <p>{message.content}</p>
                                </div>
                                <div className="message-actions">
                                  <button className="action-btn" onClick={() => handleCopy(message.content)}>
                                    <Copy size={14} />
                                  </button>
                                  <button className="action-btn">
                                    <ThumbsUp size={14} />
                                  </button>
                                  <button className="action-btn">
                                    <ThumbsDown size={14} />
                                  </button>
                                  <button className="action-btn" onClick={() => setPrompt(message.content)}>
                                    <RefreshCw size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="message-content user-content">
                          <div className="user-message-bubble">
                            <p>{message.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="message assistant">
                      <div className="message-content">
                        <div className="message-avatar rod-avatar">
                          <Loader2 size={16} className="spinner-icon" />
                        </div>
                        <div className="message-wrapper">
                          <div className="message-text">
                            <p className="loading-text">Rod is working on it...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && <div className="error-message">{error}</div>}
                  <div ref={messagesEndRef} />
                </div>

                <div className="input-container">
                  <div className="input-wrapper">
                    <textarea
                      ref={textareaRef}
                      className="claude-input"
                      placeholder="Ask a question or describe an image..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows="1"
                    />
                    <button
                      className="send-button"
                      onClick={handleSendMessage}
                      disabled={loading || !prompt.trim()}
                      aria-label="Send message"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default App;