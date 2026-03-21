import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);

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

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div>
      <h1>Hello World Full Stack</h1>
      <input value={msg} onChange={(e) => setMsg(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            {m.content}{" "}
            <button onClick={() => deleteMessage(m.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;