// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [textInput, setTextInput] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [confidences, setConfidences] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExample, setSelectedExample] = useState('English');
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const EXAMPLE_TEXTS = {
    English: "Hello! How are you doing today? I hope you're having a wonderful day filled with joy and happiness.",
    French: "Bonjour! Comment allez-vous aujourd'hui? J'espère que vous passez une merveilleuse journée remplie de joie et de bonheur.",
    Spanish: "¡Hola! ¿Cómo estás hoy? Espero que estés teniendo un día maravilloso lleno de alegría y felicidad.",
    German: "Hallo! Wie geht es dir heute? Ich hoffe, du hast einen wunderbaren Tag voller Freude und Glück.",
    Italian: "Ciao! Come stai oggi? Spero che tu stia passando una giornata meravigliosa piena di gioia e felicità.",
    Russian: "Привет! Как ты сегодня? Надеюсь, у тебя прекрасный день, полный радости и счастья.",
    Japanese: "こんにちは！今日の調子はどうですか？喜びと幸せに満ちた素晴らしい一日をお過ごしください。",
    Chinese: "你好！今天好吗？希望你度过充满欢乐和幸福的美好一天。",
    Arabic: "مرحبا! كيف حالك اليوم؟ أتمنى أن تقضي يومًا رائعًا مليئًا بالفرح والسعادة。",
    Hindi: "नमस्ते! आज आप कैसे हैं? मुझे आशा है कि आपका दिन खुशी और आनंद से भरा हो।"
  };

  const SUPPORTED_LANGUAGES = [
    'English', 'French', 'German', 'Spanish', 'Portuguese', 'Italian', 'Russian',
    'Arabic', 'Hindi', 'Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Thai',
    'Dutch', 'Greek', 'Turkish', 'Polish', 'Danish', 'Finnish', 'Hungarian',
    'Swedish', 'Indonesian', 'Romanian', 'Bengali', 'Persian'
  ];

  useEffect(() => {
    fetchHistory();
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/history');
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      } else {
        setError(data.error || 'Failed to fetch history');
      }
    } catch (error) {
      setError('Error fetching history');
      console.error(error);
    }
  };

  const detectLanguage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });
      const data = await response.json();
      if (response.ok) {
        setDetectedLanguage(data.detected_language);
        setConfidence(data.confidence);
        setConfidences(data.confidences || []);
        fetchHistory();
      } else {
        setError(data.error || 'Detection failed');
      }
    } catch (error) {
      setError('Error detecting language');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/history', { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        setHistory([]);
      } else {
        setError(data.error || 'Failed to clear history');
      }
    } catch (error) {
      setError('Error clearing history');
      console.error(error);
    }
  };

  const handleDetect = () => {
    if (textInput.trim().length >= 20) {
      detectLanguage();
    }
  };

  const handleLoadExample = () => {
    setTextInput(EXAMPLE_TEXTS[selectedExample]);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="app">
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isSidebarOpen ? '◄' : '►'}
      </button>

      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          <h2>📊 Detection History</h2>
          <button onClick={clearHistory} className="clear-button">
            🗑️ Clear History
          </button>
          {history.length > 0 ? (
            <div className="history-scroll">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-timestamp">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <div className="history-text">{item.text_preview}</div>
                  <div className="history-language">
                    <span className="language-tag">{item.detected_language}</span>
                    <span className="confidence-badge">
                      {(item.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-history">
              <p>No detection history yet</p>
              <div className="empty-icon">📭</div>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <h1>
            <span className="icon-globe">🌎</span>
            <span className="title-text">
              <span className="title-main">Advanced Language Detection</span>
              <span className="title-sub">Powered by AI</span>
            </span>
          </h1>
        </div>

        {error && (
          <div className="error-message animate-shake">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="content-grid">
          <div className="input-section">
            <div className="textarea-container">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter at least 20 characters to detect language..."
                rows={6}
                className={textInput.trim().length >= 20 ? 'valid' : ''}
              />
              <div className="character-count">
                {textInput.length}/20 characters
                {textInput.trim().length < 20 && (
                  <span className="warning-icon">⚠️</span>
                )}
              </div>
            </div>
            <button
              onClick={handleDetect}
              disabled={textInput.trim().length < 20 || isLoading}
              className={`detect-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="icon">🔍</span>
                  Detect Language
                </>
              )}
            </button>
          </div>

          <div className="examples-section">
            <div className="examples-card">
              <h3>
                <span className="icon">📝</span> Example Texts
              </h3>
              <div className="example-controls">
                <select
                  value={selectedExample}
                  onChange={(e) => setSelectedExample(e.target.value)}
                  className="language-select"
                >
                  {Object.keys(EXAMPLE_TEXTS).map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <button onClick={handleLoadExample} className="load-example">
                  <span className="icon">↩️</span>
                  Load Example
                </button>
              </div>
              <div className="example-preview">
                {EXAMPLE_TEXTS[selectedExample].substring(0, 100)}...
              </div>
            </div>
          </div>
        </div>

        {detectedLanguage && (
          <div className="results animate-fade-in">
            <h3>
              <span className="icon">📊</span> Detection Results
            </h3>
            <div className="result-grid">
              <div className="result-card primary">
                <div className="result-icon">🌐</div>
                <h4>Detected Language</h4>
                <p className="language-result">{detectedLanguage}</p>
              </div>
              <div className="result-card secondary">
                <div className="result-icon">📈</div>
                <h4>Confidence Score</h4>
                <p className="confidence-score">
                  {(confidence * 100).toFixed(2)}%
                </p>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <h3>
              <span className="icon">🎯</span> Top Language Matches
            </h3>
            <div className="confidence-list">
              {confidences.map((item, index) => (
                <div
                  key={index}
                  className={`confidence-item ${
                    item.language === detectedLanguage ? 'highlight' : ''
                  }`}
                >
                  <div className="language-name">
                    <strong>{item.language}</strong>
                  </div>
                  <div className="confidence-meter">
                    <div
                      className="meter-fill"
                      style={{ width: `${item.confidence * 100}%` }}
                    ></div>
                    <span className="confidence-percent">
                      {(item.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <details className="supported-languages">
          <summary>
            <span className="icon">🌍</span> Supported Languages
          </summary>
          <div className="language-grid">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <div key={lang} className="language-item">
                <span className="language-dot"></span>
                {lang}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default App;