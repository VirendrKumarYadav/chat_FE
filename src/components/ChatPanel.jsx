import { useState } from "react";

export default function ChatPanel({ messages, onSend, onlineUser }) {
  const [text, setText] = useState("");

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="profile">😀</span>
        <span>
          {onlineUser}
          <span className="online-dot"></span>
        </span>
      </div>

      <div className="chat-body">
        {messages.map((msg, i) => (
          <div key={i} className="chat-msg">
            <b>{msg.from}:</b> {msg.text}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type message..."
        />
        <button onClick={() => {
          onSend(text);
          setText("");
        }}>Send</button>
      </div>
    </div>
  );
}
