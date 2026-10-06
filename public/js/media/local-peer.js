/** @param {object} runtime */
export async function attachLocalMediaToPeer(runtime) {
  const { getPc, getLocalStream, getSocket, startCallAsOfferer } = runtime;
  const pc = getPc();
  const localStream = getLocalStream();
  if (!pc || !localStream) return;
  let upgraded = false;
  for (const track of localStream.getTracks()) {
    const transceiver = pc.getTransceivers().find((item) => {
      const senderKind = item.sender?.track?.kind;
      const receiverKind = item.receiver?.track?.kind;
      return senderKind === track.kind || receiverKind === track.kind;
    });
    if (transceiver?.sender) {
      if (
        transceiver.direction === "recvonly" ||
        transceiver.direction === "inactive"
      ) {
        transceiver.direction = "sendrecv";
        upgraded = true;
      }
      if (transceiver.sender.track !== track) {
        await transceiver.sender.replaceTrack(track);
        upgraded = true;
      }
    } else {
      pc.addTrack(track, localStream);
      upgraded = true;
    }
  }
  if (upgraded && getSocket() && pc.signalingState === "stable") {
    await startCallAsOfferer();
  }
}
