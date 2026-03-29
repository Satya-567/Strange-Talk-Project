import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Camera, Mic, PhoneOff, SkipForward, MicOff, CameraOff } from 'lucide-react';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export default function VideoRoom() {
    const { roomId: urlRoomId } = useParams();
    const navigate = useNavigate();
    const { socket } = useAppStore();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const [micActive, setMicActive] = useState(true);
    const [camActive, setCamActive] = useState(true);

    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const activeRoomRef = useRef<string | null>(null);
    const [status, setStatus] = useState('Looking for someone...');

    const setRoom = (id: string | null) => {
        setActiveRoom(id);
        activeRoomRef.current = id;
    };

    const cleanupPeer = () => {
        if (peerRef.current) {
            peerRef.current.onicecandidate = null;
            peerRef.current.ontrack = null;
            peerRef.current.close();
            peerRef.current = null;
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    const startRandomMatch = () => {
        cleanupPeer();
        setRoom(null);
        setStatus('Looking for someone...');
        socket?.emit('join_random', 'video');
    };

    useEffect(() => {
        if (!socket) return;

        // 1. Get local stream
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                // 2. Join Queue or Room
                if (urlRoomId === 'random') {
                    startRandomMatch();
                } else {
                    setRoom(urlRoomId || null);
                    setStatus('Joined Private Room');
                    socket.emit('join_room', urlRoomId);
                }
            })
            .catch(() => {
                alert('Camera/Microphone access denied or unavailable.');
                navigate('/');
            });

        // --- SOCKET HANDLERS ---
        socket.on('matched', async ({ roomId, initiator }) => {
            setRoom(roomId);
            setStatus('Stranger Connected!');

            const peer = new RTCPeerConnection(ICE_SERVERS);
            peerRef.current = peer;

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    peer.addTrack(track, localStreamRef.current!);
                });
            }

            peer.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal', { roomId, signal: { type: 'candidate', candidate: event.candidate } });
                }
            };

            if (initiator) {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('signal', { roomId, signal: offer });
            }
        });

        socket.on('peer_joined', async () => {
            const currentRoom = activeRoomRef.current;
            if (!peerRef.current && currentRoom) {
                setStatus('Stranger Connected!');
                const peer = new RTCPeerConnection(ICE_SERVERS);
                peerRef.current = peer;

                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        peer.addTrack(track, localStreamRef.current!);
                    });
                }

                peer.ontrack = (event) => {
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
                };

                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('signal', { roomId: currentRoom, signal: { type: 'candidate', candidate: event.candidate } });
                    }
                };

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('signal', { roomId: currentRoom, signal: offer });
            }
        });

        socket.on('signal', async (signal) => {
            const peer = peerRef.current;
            const currentRoom = activeRoomRef.current;
            if (!peer || !currentRoom) return;

            if (signal.type === 'offer') {
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('signal', { roomId: currentRoom, signal: answer });
            } else if (signal.type === 'answer') {
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.type === 'candidate') {
                await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        });

        socket.on('peer_left', () => {
            setStatus('Stranger disconnected.');
            cleanupPeer();
        });

        return () => {
            socket.emit('leave_room');
            socket.off('matched');
            socket.off('peer_joined');
            socket.off('signal');
            socket.off('peer_left');
            cleanupPeer();

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [socket, urlRoomId]);

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !micActive;
                setMicActive(!micActive);
            }
        }
    };

    const toggleCam = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !camActive;
                setCamActive(!camActive);
            }
        }
    };

    const nextStranger = () => {
        socket?.emit('leave_room');
        startRandomMatch();
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <header className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{urlRoomId === 'random' ? 'Random Video Chat' : `Room Code: ${urlRoomId}`}</h3>
                <div style={{ color: status.includes('Stranger Connected') ? 'var(--success)' : 'var(--accent-primary)', fontWeight: 'bold' }}>
                    {status}
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', gap: '1rem', position: 'relative' }}>
                <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#000' }}>
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>Stranger</div>
                </div>

                <div className="glass-panel" style={{ width: '30%', minWidth: '200px', overflow: 'hidden', position: 'relative', background: '#000' }}>
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>You</div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button onClick={toggleMic} className={`btn ${micActive ? 'btn-secondary' : 'btn-danger'}`} style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}>
                    {micActive ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button onClick={toggleCam} className={`btn ${camActive ? 'btn-secondary' : 'btn-danger'}`} style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}>
                    {camActive ? <Camera size={24} /> : <CameraOff size={24} />}
                </button>
                <button onClick={() => navigate('/')} className="btn btn-danger" style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}>
                    <PhoneOff size={24} />
                </button>
                {urlRoomId === 'random' && (
                    <button onClick={nextStranger} className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)', padding: '0 2rem' }}>
                        <SkipForward size={24} style={{ marginRight: '0.5rem' }} /> Next
                    </button>
                )}
            </div>
        </div>
    );
}
