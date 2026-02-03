import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const PEER_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};

export const CallManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [incomingCall, setIncomingCall] = useState(null); // { senderId, type, offer, name, avatar }
  const [activeCall, setActiveCall] = useState(null); // { peerId, type, stream, remoteStream }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const activeCallRef = useRef(null); // Ref to track active call state in polling loop

  // Sync state to ref
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const endCall = useCallback(() => {
    if (activeCallRef.current) {
      api.post('/signal/send', {
        targetUserId: activeCallRef.current.peerId,
        type: 'end-call',
        data: {}
      }).catch(() => {});
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    
    peerRef.current = null;
    localStreamRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const handleSignalMessage = useCallback(async (msg) => {
    switch (msg.type) {
      case 'offer':
        if (activeCallRef.current) return; // Busy
        // Fetch sender details to show name
        try {
            const { data: sender } = await api.post('/users/batch', { userIds: [msg.senderId] });
            setIncomingCall({
              senderId: msg.senderId,
              type: msg.data.type,
              offer: msg.data.offer,
              name: sender[0]?.username || "Unknown",
              avatar: sender[0]?.avatar_url
            });
        } catch (e) {
            console.error("Error fetching caller details", e);
        }
        break;
      
      case 'answer':
        if (peerRef.current) {
          try {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(msg.data.answer));
          } catch (e) {
            console.error("Error setting remote description", e);
          }
        }
        break;
      
      case 'candidate':
        if (peerRef.current) {
          try {
             await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
          } catch (e) {
             console.error("Error adding ICE candidate", e);
          }
        }
        break;

      case 'end-call':
        endCall();
        break;
    }
  }, [endCall]);

  // Heartbeat to keep user online
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        await api.post('/auth/heartbeat');
      } catch (error) {
        // Silent fail
      }
    };

    sendHeartbeat(); // Immediate
    const interval = setInterval(sendHeartbeat, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [user]);

  // Poll for signaling messages
  useEffect(() => {
    if (!user) return;

    const pollSignals = async () => {
      try {
        const { data: messages } = await api.get('/signal/poll');
        if (Array.isArray(messages)) {
            for (const msg of messages) {
              await handleSignalMessage(msg);
            }
        }
      } catch (error) {
        // Silently fail on network error to avoid console spam, or log only if not 404/500
        // console.error("Signaling poll error:", error); 
      }
    };

    const intervalId = setInterval(pollSignals, 2000);
    return () => clearInterval(intervalId);
  }, [user, handleSignalMessage]);

  const startCall = async (targetUserId, type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      
      localStreamRef.current = stream;
      const newCallState = { peerId: targetUserId, type, stream };
      setActiveCall(newCallState);
      
      const peer = new RTCPeerConnection(PEER_CONFIG);
      peerRef.current = peer;
      
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          api.post('/signal/send', {
            targetUserId,
            type: 'candidate',
            data: { candidate: event.candidate }
          });
        }
      };
      
      peer.ontrack = (event) => {
        setActiveCall(prev => prev ? ({ ...prev, remoteStream: event.streams[0] }) : null);
      };
      
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      await api.post('/signal/send', {
        targetUserId,
        type: 'offer',
        data: { type, offer }
      });
      
    } catch (err) {
      console.error("Failed to start call:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not access camera/microphone. Ensure HTTPS is enabled." });
      setActiveCall(null);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      const { senderId, type, offer } = incomingCall;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      
      localStreamRef.current = stream;
      setIncomingCall(null);
      setActiveCall({ peerId: senderId, type, stream });
      
      const peer = new RTCPeerConnection(PEER_CONFIG);
      peerRef.current = peer;
      
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          api.post('/signal/send', {
            targetUserId: senderId,
            type: 'candidate',
            data: { candidate: event.candidate }
          });
        }
      };
      
      peer.ontrack = (event) => {
        setActiveCall(prev => prev ? ({ ...prev, remoteStream: event.streams[0] }) : null);
      };
      
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      await api.post('/signal/send', {
        targetUserId: senderId,
        type: 'answer',
        data: { answer }
      });
      
    } catch (err) {
      console.error("Failed to accept call:", err);
      endCall();
    }
  };

  // Listen for 'start-call' event from ChatView
  useEffect(() => {
    const handleStartCall = (e) => {
      const { targetUserId, type } = e.detail;
      startCall(targetUserId, type);
    };
    
    window.addEventListener('start-call', handleStartCall);
    return () => window.removeEventListener('start-call', handleStartCall);
  }, []);

  // Attach streams to video elements
  useEffect(() => {
    if (activeCall?.stream && localVideoRef.current) {
      localVideoRef.current.srcObject = activeCall.stream;
    }
    if (activeCall?.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = activeCall.remoteStream;
    }
  }, [activeCall]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  if (incomingCall) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white" onInteractOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <Avatar className="h-24 w-24 border-4 border-slate-700">
              <AvatarImage src={incomingCall.avatar} />
              <AvatarFallback className="text-2xl">{incomingCall.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-2xl font-bold">{incomingCall.name}</h3>
              <p className="text-slate-400">Incoming {incomingCall.type} call...</p>
            </div>
            <div className="flex gap-8 w-full justify-center">
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
                onClick={() => {
                   api.post('/signal/send', { targetUserId: incomingCall.senderId, type: 'end-call', data: {} });
                   setIncomingCall(null);
                }}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 animate-pulse"
                onClick={acceptCall}
              >
                {incomingCall.type === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (activeCall) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
          {/* Remote Video */}
          {activeCall.type === 'video' && (
            <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
            />
          )}
          
          {/* Fallback for Audio Only or No Video */}
          {(!activeCall.remoteStream || activeCall.type === 'voice') && (
             <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-slate-700">
                    <AvatarFallback className="text-4xl">USER</AvatarFallback>
                </Avatar>
                <p className="text-xl text-white animate-pulse">Connected...</p>
             </div>
          )}

          {/* Local Video (PIP) */}
          {activeCall.type === 'video' && (
            <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-lg overflow-hidden border-2 border-slate-700 shadow-xl">
               <video 
                 ref={localVideoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover transform scale-x-[-1]"
               />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="h-24 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex items-center justify-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-12 w-12 rounded-full ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'}`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
            onClick={endCall}
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {activeCall.type === 'video' && (
            <Button 
                variant="ghost" 
                size="icon" 
                className={`h-12 w-12 rounded-full ${isVideoOff ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'}`}
                onClick={toggleVideo}
            >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
