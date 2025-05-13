import React, { useState, useRef, useEffect } from 'react';
import './ChatItem.css';
import { FiEdit2, FiCheck, FiX, FiTrash2 } from 'react-icons/fi'; // FiTrash2 ikonu eklendi

const ChatItem = ({ chat, isActive, onSelect, onRename, onDelete }) => { // onDelete prop'u eklendi
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Metni seçili hale getir
    }
  }, [isRenaming]);

  const handleRenameStart = (e) => {
    e.stopPropagation(); // onSelect'in tetiklenmesini engelle
    setIsRenaming(true);
  };

  const handleRenameConfirm = (e) => {
    e.stopPropagation();
    if (newTitle.trim() && newTitle.trim() !== chat.title) {
      onRename(chat.id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = (e) => {
    e.stopPropagation();
    setNewTitle(chat.title); // Eski başlığa geri dön
    setIsRenaming(false);
  };

  const handleInputChange = (e) => {
    setNewTitle(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRenameConfirm(e);
    } else if (e.key === 'Escape') {
      handleRenameCancel(e);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // onSelect'in tetiklenmesini engelle
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`'${chat.title}' başlıklı sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      onDelete(chat.id, chat.threadId);
    }
  };

  return (
    <div 
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={() => !isRenaming && onSelect()} // Yeniden adlandırma sırasında seçimi engelle
    >
      {isRenaming ? (
        <div className="rename-controls">
          <input 
            ref={inputRef}
            type="text" 
            value={newTitle} 
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onClick={(e) => e.stopPropagation()} // Input'a tıklayınca seçimi engelle
            className="rename-input"
          />
          <button onClick={handleRenameConfirm} className="rename-action-button confirm"><FiCheck /></button>
          <button onClick={handleRenameCancel} className="rename-action-button cancel"><FiX /></button>
        </div>
      ) : (
        <>
          <span className="chat-title">{chat.title}</span>
          <div className="chat-item-actions">
            {!isActive && (
              <button onClick={handleRenameStart} className="action-button rename-button" aria-label="Sohbeti yeniden adlandır">
                  <FiEdit2 size={14}/>
              </button>
            )}
            {/* Silme butonu her zaman görünebilir veya sadece aktif değilken */} 
            {/* Şimdilik her zaman gösterelim, ama aktifken silme işlemi App.js'de engellenebilir */} 
            <button onClick={handleDeleteClick} className="action-button delete-button" aria-label="Sohbeti sil">
                <FiTrash2 size={14}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatItem;
