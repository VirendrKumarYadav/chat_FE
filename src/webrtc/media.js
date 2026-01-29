export async function getUserMediaStream() {
  return await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
}
