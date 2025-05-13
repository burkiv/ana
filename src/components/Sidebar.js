import React from 'react';
import ChatItem from './ChatItem';
import './Sidebar.css';

const Sidebar = ({ chatSessions, onNewChat, onSelectChat, activeThreadId, onRenameChat, onDeleteChat }) => {
  return (
    <div className="sidebar">
      <button onClick={onNewChat} className="new-chat-button">
        + Yeni Sohbet
      </button>
      <div className="chat-list">
        {chatSessions.sort((a, b) => b.createdAt - a.createdAt).map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.threadId === activeThreadId}
            onSelect={() => onSelectChat(chat.threadId)}
            onRename={onRenameChat}
            onDelete={onDeleteChat}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
