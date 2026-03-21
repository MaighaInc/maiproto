import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const fetchMessages = async () => {
    const res = await axios.get("http://localhost:4000/messages");
    setMessages(res.data);
  };

  const sendMessage = async () => {
    await axios.post("http://localhost:4000/messages", { content: msg });
    setMsg("");
    fetchMessages();
  };

  const deleteMessage = async (id) => {
    await axios.delete(`http://localhost:4000/messages/${id}`);
    fetchMessages();
  };

  const startEdit = (m) => {
    setEditId(m.id);
    setEditContent(m.content);
  };

  const saveEdit = async () => {
    await axios.put(`http://localhost:4000/messages/${editId}`, { content: editContent });
    setEditId(null);
    setEditContent("");
    fetchMessages();
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditContent("");
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div>
      <h1>Hello World Full Stack</h1>
      <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="New message..." />
      <button onClick={sendMessage}>Send</button>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            {editId === m.id ? (
              <>
                <input value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                <button onClick={saveEdit}>Save</button>
                <button onClick={cancelEdit}>Cancel</button>
              </>
            ) : (
              <>
                {m.content}{" "}
                <button onClick={() => startEdit(m)}>Edit</button>
                <button onClick={() => deleteMessage(m.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;