import { useRef, useState, useEffect } from "react";

export default function Video() {
    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const chatBoxRef = useRef(null);
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);

    const [inCall, setInCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null); // 👈 NEW

    const [username, setUsername] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [toast, setToast] = useState("");
    const [error, setError] = useState("");

    /* ================= SCROLL CHAT ================= */
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    /* ================= LOCAL STORAGE ================= */
    useEffect(() => {
        const u = localStorage.getItem("username");
        const t = localStorage.getItem("targetUser");
        const m = localStorage.getItem("messages");

        if (u) setUsername(u);
        if (t) setTargetUser(t);
        if (m) setMessages(JSON.parse(m));
    }, []);

    useEffect(() => {
        if (username) localStorage.setItem("username", username);
        validateUsers();
    }, [username]);

    useEffect(() => {
        if (targetUser) localStorage.setItem("targetUser", targetUser);
        validateUsers();
    }, [targetUser]);

    useEffect(() => {
        localStorage.setItem("messages", JSON.stringify(messages));
    }, [messages]);

    /* ================= VALIDATION ================= */
    const validateUsers = () => {
        if (!username || !targetUser) {
            setError("Please select both users before connecting or calling.");
            return false;
        }
        setError("");
        return true;
    };

    /* ================= TOAST ================= */
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 5000);
    };

    /* ================= CONNECT ================= */
    function connect() {
        if (!validateUsers()) return;

        socketRef.current = new WebSocket("https://chat-be-2wla.onrender.com");

        socketRef.current.onopen = () => {
            socketRef.current.send(JSON.stringify({ type: "join", username }));
            showToast(`🟢 ${username} is online`);
        };

        socketRef.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "chat":
                    setMessages(m => [...m, { from: data.from, text: data.message }]);
                    break;

                case "offer":
                    setIncomingCall({ from: data.from, offer: data.offer });
                    showToast(`📞 Incoming call from ${data.from}`);
                    break;

                case "answer":
                    await peerRef.current.setRemoteDescription(data.answer);
                    break;

                case "ice-candidate":
                    await peerRef.current.addIceCandidate(data.candidate);
                    break;

                case "call-rejected":
                    showToast("❌ Call rejected");
                    disconnectCall();
                    break;

                default:
                    break;
            }
        };
    }

    /* ================= CHAT ================= */
    function sendChat() {
        if (!chatInput) return;

        socketRef.current.send(JSON.stringify({
            type: "chat",
            from: username,
            to: targetUser,
            message: chatInput
        }));

        setMessages(m => [...m, { from: "Me", text: chatInput }]);
        setChatInput("");
    }

    /* ================= PEER ================= */
    function createPeer() {
        peerRef.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerRef.current.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current.send(JSON.stringify({
                    type: "ice-candidate",
                    to: targetUser,
                    candidate: e.candidate
                }));
            }
        };

        peerRef.current.ontrack = (e) => {
            remoteVideo.current.srcObject = e.streams[0];
        };
    }

    async function getMedia() {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.current.srcObject = stream;
        stream.getTracks().forEach(t => peerRef.current.addTrack(t, stream));
    }

    /* ================= START CALL ================= */
    async function startCall() {
        if (!validateUsers()) return;

        setInCall(true);
        showToast("📞 Calling...");

        createPeer();
        await getMedia();

        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);

        socketRef.current.send(JSON.stringify({
            type: "offer",
            from: username,
            to: targetUser,
            offer
        }));
    }

    /* ================= ACCEPT / REJECT ================= */
    async function acceptCall() {
        setTargetUser(incomingCall.from);
        setIncomingCall(null);
        setInCall(true);

        createPeer();
        await getMedia();

        await peerRef.current.setRemoteDescription(incomingCall.offer);

        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);

        socketRef.current.send(JSON.stringify({
            type: "answer",
            from: username,
            to: incomingCall.from,
            answer
        }));
    }

    function rejectCall() {
        socketRef.current.send(JSON.stringify({
            type: "call-rejected",
            from: username,
            to: incomingCall.from
        }));

        setIncomingCall(null);
        showToast("❌ Call rejected");
    }

    /* ================= DISCONNECT ================= */
    function disconnectCall() {
        setInCall(false);
        setIncomingCall(null);

        peerRef.current?.close();
        peerRef.current = null;

        [localVideo, remoteVideo].forEach(v => {
            if (v.current?.srcObject) {
                v.current.srcObject.getTracks().forEach(t => t.stop());
                v.current.srcObject = null;
            }
        });
    }

    /* ================= UI ================= */
    return (
        <div className="app">
            {toast && <div className="toast">{toast}</div>}

            {/* INCOMING CALL POPUP */}
            {incomingCall && (
                <div className="call-popup-overlay">
                    <div className="call-popup">
                        <h3>📲 Incoming…</h3>
                        <p>{incomingCall.from} is calling</p>
                        <div className="call-actions">
                            <button className="accept" onClick={acceptCall}>🟢 Accept</button>
                            <button className="reject" onClick={rejectCall}>🔴 Decline</button>
                        </div>
                    </div>
                </div>
            )}

            <h2>🤝Nexora</h2>

            <div className="top-controls">
                <select value={username} onChange={e => setUsername(e.target.value)}>
                    <option value="">Your name</option>
                    <option>Virendra</option>
                    <option>Abhi</option>
                    <option>Suraj</option>
                    <option>Rohit</option>
                    <option>Monu</option>
                    <option>Chandu</option>
                    <option>Raja</option>
                </select>

                <select value={targetUser} onChange={e => setTargetUser(e.target.value)}>
                    <option value="">Peer name</option>
                    <option>Virendra</option>
                    <option>Abhi</option>
                    <option>Suraj</option>
                    <option>Rohit</option>
                    <option>Monu</option>
                    <option>Chandu</option>
                    <option>Raja</option>

                </select>

                <button onClick={connect}>💬</button>
                <button onClick={startCall}>Call</button>
                <button onClick={disconnectCall}>📞</button>
            </div>

            {error && <div className="error-msg">{error}</div>}

           <div className="videos">
                    {inCall && (
                        <div className="video-section">
                            <video ref={remoteVideo} className="remote" autoPlay />
                            <video ref={localVideo} className="local" autoPlay muted />
                        </div>
                    )}
                </div>

            <div className="chat-box" ref={chatBoxRef}>
                {messages.map((m, i) => (
                    <div key={i} className={m.from === "Me" ? "msg me" : "msg peer"}>
                        <b>{m.from}</b>: {m.text}
                    </div>
                ))}
            </div>
            {/* <div className="chat-input-section">
                <input
                    placeholder="Type message"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                /> */}
                  <div class="chat-input-bar">
                    <div class="input-wrapper">
                        <button class="icon-btn">📎</button>
                        <input placeholder="Type a message 😊"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendChat()} />
                        <button class="icon-btn">📷</button>
                    </div>
                    <button class="send-circle chat-button" id="sendBtn" onClick={sendChat}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                </button>
            </div>
        </div>
        
    );
}
