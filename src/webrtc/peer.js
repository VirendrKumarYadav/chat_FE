export function createPeerConnection(onIce, onTrack) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = e => {
    if (e.candidate) onIce(e.candidate);
  };

  pc.ontrack = e => {
    onTrack(e.streams[0]);
  };

  return pc;
}
