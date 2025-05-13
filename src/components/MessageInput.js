import React, { useState } from 'react';
import './MessageInput.css';
import { FiSend, FiMic } from 'react-icons/fi'; // İkonlar eklendi

const MessageInput = ({ onSend, onMicClick, disabled, isListening }) => { 
  const [input, setInput] = useState('');

  const handleSendClick = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Yeni satır eklemesini engelle
      handleSendClick();
    }
  };

  return (
    <div className="message-input-area">
      <button 
        onClick={onMicClick} 
        className={`mic-button ${isListening ? 'listening' : ''}`}
        disabled={disabled}
        aria-label="Sesli giriş"
      >
        <FiMic size={20} />
      </button>
      <textarea
        value={input}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress} // Enter ile gönderme
        placeholder={isListening ? "Dinliyorum..." : "Bir mesaj yazın..."} 
        disabled={disabled}
        rows={1} // Başlangıçta tek satır, içerik arttıkça genişler
      />
      <button 
        onClick={handleSendClick} 
        className="send-button" 
        disabled={disabled || !input.trim()} 
        aria-label="Gönder"
      >
        <FiSend size={20} />
      </button>
    </div>
  );
};

export default MessageInput;
