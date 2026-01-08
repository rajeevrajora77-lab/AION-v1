import React from 'react';
import styles from '../styles/sidebar.module.css';

const Sidebar = ({ conversations, onSelectConversation, onNewConversation }) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2>AION</h2>
        <button
          className={styles.newChatBtn}
          onClick={onNewConversation}
          title="Start a new conversation"
        >
          + New Chat
        </button>
      </div>
      <nav className={styles.conversationList}>
        {conversations.length === 0 ? (
          <p className={styles.emptyState}>No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={styles.conversationItem}
              onClick={() => onSelectConversation(conv.id)}
              role="button"
              tabIndex={0}
            >
              <p className={styles.conversationTitle}>{conv.title || 'Untitled'}</p>
              <span className={styles.timestamp}>
                {new Date(conv.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
