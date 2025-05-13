import React, { useState } from 'react';
import './MessageInput.css';

const MessageInput = ({ onSend, onMicClick }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="message-input">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Mesajınızı yazın..."
      />
      <button onClick={handleSend}>Gönder</button>
      <button onClick={onMicClick} className="mic-button">🎤</button>
    </div>
  );
};

export default MessageInput;
