import React, { useState, useEffect } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [sessions, setSessions] = useState({});
  const [currentSession, setCurrentSession] = useState(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('chat_sessions')) || {};
    if (Object.keys(saved).length === 0) {
      const id = Date.now().toString();
      const newSession = {
        title: 'New Chat',
        messages: [],
      };
      saved[id] = newSession;
      setCurrentSession(id);
      localStorage.setItem('chat_sessions', JSON.stringify(saved));
    } else {
      const first = Object.keys(saved)[0];
      setCurrentSession(first);
    }
    setSessions(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = (title) => {
    const id = Date.now().toString();
    const newSession = {
      title,
      messages: [],
    };
    const updated = { ...sessions, [id]: newSession };
    setSessions(updated);
    return id;
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSession) return;

    const updated = { ...sessions };
    const session = updated[currentSession];
    session.messages.push({ role: 'user', content: input });
    session.messages.push({ role: 'assistant', content: 'Typing...' });
    setSessions(updated);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentSession,
          message: input
        }),
      });
      const data = await res.json();
      session.messages.pop();
      session.messages.push({ role: 'assistant', content: data.reply });
      setSessions({ ...updated });
    } catch (error) {
      session.messages.pop();
      session.messages.push({ role: 'assistant', content: 'Error: Could not reach the server.' });
      setSessions({ ...updated });
    }

    setStreaming(false);
  };

  const handleClear = () => {
    if (!currentSession) return;
    const updated = { ...sessions };
    updated[currentSession].messages = [];
    setSessions(updated);
  };

  const renameSession = (id, newTitle) => {
    const updated = { ...sessions };
    updated[id].title = newTitle;
    setSessions(updated);
  };

  const deleteSession = (id) => {
    const updated = { ...sessions };
    delete updated[id];
    setSessions(updated);
    if (currentSession === id) {
      const next = Object.keys(updated)[0] || createNewSession('New Chat');
      setCurrentSession(next);
    }
  };

  const filteredSessions = Object.entries(sessions).sort((a, b) => b[0] - a[0]);

  return (
    <div className={`App ${theme}`}>
      <div className="sidebar">
        <h2>Chat Sessions</h2>
        <input
          placeholder="Search sessions"
          onChange={(e) => {
            const search = e.target.value.toLowerCase();
            const filtered = Object.fromEntries(
              Object.entries(sessions).filter(([_, s]) =>
                s.title.toLowerCase().includes(search)
              )
            );
            setSessions(filtered);
          }}
        />
        <button
          onClick={() => {
            const id = createNewSession('New Chat');
            setCurrentSession(id);
          }}
        >
          + New Chat
        </button>

        <ul>
          {filteredSessions.map(([id, session]) => (
            <li
              key={id}
              className={id === currentSession ? 'active' : ''}
              onClick={() => setCurrentSession(id)}
            >
              <input
                value={session.title}
                onChange={(e) => renameSession(id, e.target.value)}
              />
              <button onClick={(e) => { e.stopPropagation(); deleteSession(id); }}>
                🗑
              </button>
            </li>
          ))}
        </ul>

        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Toggle Theme
        </button>
      </div>

      <div className="chat-window">
        <div className="chat-box">
          {sessions[currentSession]?.messages.map((msg, i) => (
            <div
              key={i}
              className={msg.role === 'user' ? 'user' : 'assistant'}
            >
              <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        <div className="input-box">
          <input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={streaming}>
            Send
          </button>
          <button onClick={handleClear}>
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
}
