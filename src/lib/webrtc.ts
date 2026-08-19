import { rtdb } from "./firebase";
import { 
  ref, 
  set, 
  onValue, 
  push, 
  onDisconnect, 
  remove, 
  off 
} from "firebase/database";
import { IceCandidatePayload, SignalingOfferAnswer } from "@/types";

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Initializes deterministic WebRTC signaling session over Firebase RTDB
 */
export function setupWebRTCSignaling(
  matchId: string,
  localUid: string,
  peerUid: string,
  localStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void,
  onPeerDisconnected: () => void
) {
  const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
  const isOfferer = localUid < peerUid; // Lower UID is deterministic offerer

  // Add local tracks to peer connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle remote tracks
  const remoteStream = new MediaStream();
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
    onRemoteStream(remoteStream);
  };

  // RTDB References
  const matchSignalingRef = ref(rtdb, `signaling/${matchId}`);
  const offerRef = ref(rtdb, `signaling/${matchId}/offer`);
  const answerRef = ref(rtdb, `signaling/${matchId}/answer`);
  const myCandidatesRef = ref(rtdb, `signaling/${matchId}/candidates/${localUid}`);
  const peerCandidatesRef = ref(rtdb, `signaling/${matchId}/candidates/${peerUid}`);
  const myPresenceRef = ref(rtdb, `signaling/${matchId}/presence/${localUid}`);
  const peerPresenceRef = ref(rtdb, `signaling/${matchId}/presence/${peerUid}`);

  // Setup presence & onDisconnect
  set(myPresenceRef, { connected: true, lastSeen: Date.now() });
  onDisconnect(myPresenceRef).set({ connected: false, lastSeen: Date.now() });

  // Listen to peer presence
  const unsubPeerPresence = onValue(peerPresenceRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.connected === false) {
      onPeerDisconnected();
    }
  });

  // Collect ICE candidates and push to RTDB
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      const candidatePayload: IceCandidatePayload = {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      };
      push(myCandidatesRef, candidatePayload);
    }
  };

  // Listen for peer ICE candidates
  const unsubPeerCandidates = onValue(peerCandidatesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      Object.values(data).forEach((cand: any) => {
        if (cand && cand.candidate) {
          try {
            peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } catch (e) {
            // ICE candidate addition error fallback
          }
        }
      });
    }
  });

  // Deterministic SDP Offer / Answer Exchange
  let unsubOffer: any = null;
  let unsubAnswer: any = null;

  if (isOfferer) {
    // Local peer creates offer
    peerConnection
      .createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => {
        if (peerConnection.localDescription) {
          set(offerRef, {
            sdp: peerConnection.localDescription.sdp,
            type: peerConnection.localDescription.type,
          });
        }
      })
      .catch((err) => console.error("Error creating offer:", err));

    // Offerer listens for peer answer
    unsubAnswer = onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val() as SignalingOfferAnswer;
      if (answer && answer.sdp && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
  } else {
    // Non-offerer listens for offer, sets remote description, and sends answer
    unsubOffer = onValue(offerRef, async (snapshot) => {
      const offer = snapshot.val() as SignalingOfferAnswer;
      if (offer && offer.sdp && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await set(answerRef, {
          sdp: answer.sdp,
          type: answer.type,
        });
      }
    });
  }

  // Cleanup handler
  return {
    peerConnection,
    cleanup: () => {
      try {
        if (unsubOffer) off(offerRef);
        if (unsubAnswer) off(answerRef);
        off(peerCandidatesRef);
        off(peerPresenceRef);
        set(myPresenceRef, { connected: false, lastSeen: Date.now() });
        peerConnection.close();
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    },
  };
}
