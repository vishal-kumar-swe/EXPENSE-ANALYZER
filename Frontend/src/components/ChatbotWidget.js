// ===================================================================
// CHATBOT WIDGET - components/ChatbotWidget.js
// ===================================================================
// Floating button (bottom-right) that expands into a chat panel. Talks
// to POST /api/chatbot/ask, which answers using the student's own
// spending data and the forecasting engine - see
// Backend/chatbot_engine.py for how those answers are built.
//
// Only ever rendered inside AppShell (student view) - RoleGate makes
// sure a parent account never reaches AppShell, so this never renders
// for a parent session. Chat history lives in component state only
// (nothing persisted server-side) and resets on reload - see
// Backend/chatbot_routes.py for why that scope was chosen.
// ===================================================================

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const STARTER_PROMPTS = [
  'How much can I safely spend this month?',
  'Can I afford a ₹3000 trip next week?',
  'What do you predict I will spend next month?'
];

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! Ask me about your spending, or what you can safely afford this month." }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/chatbot/ask`, { message: trimmed });
      if (response.data.success) {
        setMessages((prev) => [...prev, { role: 'bot', text: response.data.data.reply }]);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div className="chatbot-panel" role="dialog" aria-label="Expense Tracker assistant">
          <div className="chatbot-panel-header">
            <span>Spending Assistant</span>
            <button
              type="button"
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>

          <div className="chatbot-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-message ${m.role}`}>
                {m.text}
              </div>
            ))}
            {isSending && (
              <div className="chatbot-message bot chatbot-typing">
                <span></span><span></span><span></span>
              </div>
            )}
            {error && <div className="chatbot-message error">{error}</div>}
          </div>

          {messages.length <= 1 && (
            <div className="chatbot-starters">
              {STARTER_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form className="chatbot-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending..."
              aria-label="Message"
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !input.trim()} aria-label="Send">
              <FiSend aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close spending assistant' : 'Open spending assistant'}
      >
        {isOpen ? <FiX aria-hidden="true" /> : <FiMessageCircle aria-hidden="true" />}
      </button>
    </div>
  );
}

export default ChatbotWidget;
