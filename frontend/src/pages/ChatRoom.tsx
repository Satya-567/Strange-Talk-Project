import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { LogOut, SkipForward, Send } from 'lucide-react';

export default function ChatRoom() {
    const { roomId: urlRoomId } = useParams();
    const navigate = useNavigate();
    const { socket } = useAppStore();

    const [messages, setMessages] = useState<{ me: boolean, text: string }[]>([]);
    const [input, setInput] = useState('');
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [status, setStatus] = useState('Looking for someone...');

    const startRandomMatch = () => {
        setMessages([]);
        setActiveRoom(null);
        setStatus('Looking for someone...');
        socket?.emit('join_random', 'text');
    };

    useEffect(() => {
        if (!socket) return;

        if (urlRoomId === 'random') {
            startRandomMatch();
        } else {
            setActiveRoom(urlRoomId || null);
            setStatus('Joined Private Room');
            socket.emit('join_room', urlRoomId);
        }

        socket.on('matched', ({ roomId }) => {
            setActiveRoom(roomId);
            setStatus('Stranger Connected!');
        });

        socket.on('receive_message', (text) => {
            setMessages(prev => [...prev, { me: false, text }]);
        });

        socket.on('peer_left', () => {
            setStatus('Stranger disconnected.');
        });

        return () => {
            socket.emit('leave_room');
            socket.off('matched');
            socket.off('receive_message');
            socket.off('peer_left');
        };
    }, [socket, urlRoomId]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeRoom) return;

        setMessages(prev => [...prev, { me: true, text: input }]);
        socket?.emit('send_message', { roomId: activeRoom, text: input });
        setInput('');
    };

    const nextStranger = () => {
        socket?.emit('leave_room');
        startRandomMatch();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <header className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => navigate('/')} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
                        <LogOut size={18} /> Exit Chat
                    </button>
                    {urlRoomId === 'random' && (
                        <button onClick={nextStranger} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                            <SkipForward size={18} /> Next Stranger
                        </button>
                    )}
                </div>
                <div style={{ color: status.includes('Stranger Connected') ? 'var(--success)' : 'var(--accent-primary)', fontWeight: 'bold' }}>
                    {status}
                </div>
            </header>

            <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {urlRoomId === 'random' ? 'You are now chatting with a random stranger.' : `Welcome to room ${urlRoomId}`}
                </p>
                {messages.map((msg, i) => (
                    <div key={i} style={{ alignSelf: msg.me ? 'flex-end' : 'flex-start', maxWidth: '70%', background: msg.me ? 'var(--accent-primary)' : 'var(--surface-hover)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                        {msg.text}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1 }}
                    disabled={!activeRoom}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }} disabled={!activeRoom}>
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
