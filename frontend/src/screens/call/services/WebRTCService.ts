import { RTCPeerConnection, mediaDevices, MediaStream, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';

export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null;
  private onTrackCallback: ((stream: MediaStream) => void) | null = null;

  // ⚡ FIX 2: ICE Candidate Queuing System
  private iceCandidateQueue: any[] = [];
  private isRemoteDescriptionSet = false;

  // ⚡ INTEGRATED: Your production Metered.ca ICE layout
  private iceConfig = {
    iceServers: [
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "c6a870838acf0e84e9ebee9d",
        credential: "j11qvtw0tqfIb/Xy",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "c6a870838acf0e84e9ebee9d",
        credential: "j11qvtw0tqfIb/Xy",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "c6a870838acf0e84e9ebee9d",
        credential: "j11qvtw0tqfIb/Xy",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "c6a870838acf0e84e9ebee9d",
        credential: "j11qvtw0tqfIb/Xy",
      },
    ],
    iceCandidatePoolSize: 10,
  };

  public init(
    onIceCandidate: (candidate: any) => void, 
    onTrack: (stream: MediaStream) => void
  ) {
    this.onTrackCallback = onTrack;
    this.onIceCandidateCallback = onIceCandidate; // ⚡ FIX 1: Save the callback!
  }

  public async setupConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.iceConfig);

    // Setup network candidate listener (Bypass TS with 'as any')
    (this.peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    // Setup remote track streaming listener (Bypass TS with 'as any')
    (this.peerConnection as any).ontrack = (event: any) => {
      if (event.streams && event.streams[0] && this.onTrackCallback) {
        this.onTrackCallback(event.streams[0]);
      }
    };

    // Obtain local media tracks
    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });
  }

  public async createOffer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) throw new Error('PeerConnection uninitialized');
    const offer = await this.peerConnection.createOffer({});
    await this.peerConnection.setLocalDescription(offer);
    return this.peerConnection.localDescription!;
  }

  public async handleOffer(offerSdp: any): Promise<RTCSessionDescription> {
    await this.setupConnection();
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offerSdp));
    
    // ⚡ Unlock the queue now that the remote description is set
    this.isRemoteDescriptionSet = true;
    this.flushIceQueue();

    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    return this.peerConnection!.localDescription!;
  }

  public async handleAnswer(answerSdp: any): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
      
      // ⚡ Unlock the queue on the caller's side too
      this.isRemoteDescriptionSet = true;
      this.flushIceQueue();
    }
  }

  public async addIceCandidate(candidateData: any): Promise<void> {
    // ⚡ Added Production Safety Guard: Ignore empty signaling or collection end signals
    if (!candidateData || !candidateData.candidate) {
      return;
    }

    // ⚡ FIX 2: If WebRTC isn't ready, put it in the queue. Otherwise, add it instantly.
    if (!this.peerConnection || !this.isRemoteDescriptionSet) {
      this.iceCandidateQueue.push(candidateData);
    } else {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
      } catch (error) {
        console.log('[WebRTCService] Error adding candidate natively:', error);
      }
    }
  }

  private flushIceQueue(): void {
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
          console.log('[WebRTCService] Error flushing queued candidate:', error);
        });
      }
    }
  }

  public cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    // ⚡ Reset queue states for the next call
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
  }
}

export const webRTCService = new WebRTCService();