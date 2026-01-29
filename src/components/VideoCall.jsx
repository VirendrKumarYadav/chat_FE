import { useRef, useState,useEffect } from "react";

export default function Video() {
    const socketRef = useRef(null);
    const peerRef = useRef(null);
  const chatBoxRef = useRef(null);
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);

    const [username, setUsername] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [toast, setToast] = useState("");
  
  useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);
    /* ---------------- CONNECT ---------------- */
    function connect() {
        socketRef.current = new WebSocket("https://chat-be-2wla.onrender.com");

        socketRef.current.onopen = () => {
            socketRef.current.send(JSON.stringify({
                type: "join",
                username
            }));

            showToast(`🟢 ${username} is online`);
        };

        socketRef.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "chat":
                    setMessages(m => [...m, { from: data.from, text: data.message }]);
                    break;

                case "offer":
                    await handleOffer(data);
                    break;

                case "answer":
                    await peerRef.current.setRemoteDescription(data.answer);
                    break;

                case "ice-candidate":
                    await peerRef.current.addIceCandidate(data.candidate);
                    break;

                default:
                    break;
            }
        };
    }

    /* ---------------- TOAST ---------------- */
    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    }

    /* ---------------- CHAT ---------------- */
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

  

    /* ---------------- PEER ---------------- */
    function createPeer() {
        peerRef.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.send(JSON.stringify({
                    type: "ice-candidate",
                    to: targetUser,
                    candidate: event.candidate
                }));
            }
        };

        peerRef.current.ontrack = (event) => {
            remoteVideo.current.srcObject = event.streams[0];
        };
    }

    /* ---------------- MEDIA ---------------- */
    async function getMedia() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.current.srcObject = stream;
        stream.getTracks().forEach(track =>
            peerRef.current.addTrack(track, stream)
        );
    }

    /* ---------------- CALL ---------------- */
    async function startCall() {
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

    async function handleOffer(data) {
        setTargetUser(data.from);
        showToast(`📞 Incoming call from ${data.from}`);

        createPeer();
        await getMedia();

        await peerRef.current.setRemoteDescription(data.offer);

        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);

        socketRef.current.send(JSON.stringify({
            type: "answer",
            from: username,
            to: data.from,
            answer
        }));
    }

    /* ---------------- UI ---------------- */
    return (
        <div className="app">
            {toast && <div className="toast">{toast}</div>}

            <h2>🎥 Sandhya Video Chat App</h2>

            <div className="top-controls">
                <input placeholder="👤 Your name" onChange={e => setUsername(e.target.value)} />
                <input placeholder="🎯 Peer name" onChange={e => setTargetUser(e.target.value)} />
                <button onClick={connect}>Connect</button>
                <button onClick={startCall}>Call</button>
            </div>

            <div className="main">
                <div className="videos">
                    <video ref={localVideo} autoPlay muted />
                    <video ref={remoteVideo} autoPlay />
                </div>

                <div className="chat">
                    <h3>💬 Chat</h3>

                    <div className="chat-box" ref={chatBoxRef}>
                        {messages.slice(-5).map((m, i) => (
                            <div
                                key={i}
                                className={m.from === "Me" ? "msg me" : "msg peer"}
                            >
                                <b>{m.from}</b>: {m.text}
                            </div>
                        ))}
                    </div>

                    <div className="chat-input">
                        <input
                            placeholder="Type a message 😊"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendChat()}
                        />
                        <button onClick={sendChat}>Send 🚀</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
