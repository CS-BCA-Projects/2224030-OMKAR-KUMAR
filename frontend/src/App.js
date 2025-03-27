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
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/history');
      const data = await response.json();
      if (response.ok) {
        setHistory(data);
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
        setConfidences(data.confidences);
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

  return (
    <div className="app">
      <div className="sidebar">
        <h2>📊 Detection History</h2>
        <button onClick={clearHistory} className="clear-button">Clear History</button>
        {history.length > 0 ? (
          <div className="history-table">
            {history.map((item, index) => (
              <div key={index} className="history-item">
                <div>{new Date(item.timestamp).toLocaleString()}</div>
                <div>{item.text}</div>
                <div>{item.detected_language}</div>
                <div>{(item.confidence * 100).toFixed(2)}%</div>
              </div>
            ))}
          </div>
        ) : (
          <p>No detection history yet</p>
        )}
      </div>

      <div className="main-content">
        <h1>🌎 Advanced Language Detection</h1>
        
        {error && <div className="error">{error}</div>}

        <div className="content-grid">
          <div className="input-section">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text to detect language"
              rows={6}
            />
            {textInput.trim().length < 20 && (
              <p className="warning">Please enter at least 20 characters for accurate detection</p>
            )}
            <button
              onClick={handleDetect}
              disabled={textInput.trim().length < 20 || isLoading}
              className="detect-button"
            >
              {isLoading ? 'Analyzing...' : '🔍 Detect Language'}
            </button>
          </div>

          <div className="examples-section">
            <h3>📝 Example Texts</h3>
            <select
              value={selectedExample}
              onChange={(e) => setSelectedExample(e.target.value)}
            >
              {Object.keys(EXAMPLE_TEXTS).map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <button onClick={handleLoadExample}>Load Example</button>
          </div>
        </div>

        {detectedLanguage && (
          <div className="results">
            <h3>📊 Detection Results</h3>
            <div className="result-grid">
              <div className="result-box">
                <h4>Detected Language</h4>
                <p className="language-confidence">{detectedLanguage}</p>
              </div>
              <div className="result-box">
                <h4>Confidence Score</h4>
                <p className="language-confidence">{(confidence * 100).toFixed(2)}%</p>
              </div>
            </div>

            <h3>🎯 Top Language Matches</h3>
            <div className="confidence-list">
              {confidences.map(([lang, conf], index) => (
                <div
                  key={index}
                  className={`confidence-item ${lang === detectedLanguage ? 'highlight' : ''}`}
                >
                  <strong>{lang}</strong>: {(conf * 100).toFixed(2)}%
                </div>
              ))}
            </div>
          </div>
        )}

        <details className="supported-languages">
          <summary>🌍 Supported Languages</summary>
          <div className="language-grid">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <div key={lang}>- {lang}</div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default App;