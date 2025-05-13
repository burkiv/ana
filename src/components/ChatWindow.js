import React, { useEffect, useRef } from 'react';
import './ChatWindow.css';

const ChatWindow = ({ messages, onSpeakText, isLoading }) => { // isLoading prop'u eklendi
  const chatWindowRef = useRef(null);

  useEffect(() => {
    // Yeni mesaj geldiğinde en alta kaydır
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-window" ref={chatWindowRef}>
      {messages.map((message) => (
        <div key={message.id} className={`message-wrapper ${message.sender}`}>
          <div className={`message-bubble ${message.sender}`}>
            <span>{message.text}</span>
            {message.sender === 'assistant' && message.text && !message.text.startsWith("Dinliyorum...") && !message.text.startsWith("İşlem tamamlanamadı") && !message.text.startsWith("Bir yanıt aldım") && (
              <button 
                onClick={() => onSpeakText(message.text)} 
                className="speak-button"
                aria-label="Mesajı seslendir"
              >
                🔊
              </button>
            )}
          </div>
        </div>
      ))}
      {isLoading && messages[messages.length -1]?.sender === 'user' && (
        <div className="message-wrapper assistant">
          <div className="message-bubble assistant thinking-bubble">
            <span className="thinking-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
