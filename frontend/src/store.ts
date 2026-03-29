import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface User {
    id: number;
    username: string;
}

interface AppState {
    user: User | null;
    socket: Socket | null;
    locationPermission: boolean;
    setUser: (user: User | null) => void;
    setSocket: (socket: Socket | null) => void;
    setLocationPermission: (status: boolean) => void;
    logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    user: null,
    socket: null,
    locationPermission: false,
    setUser: (user) => set({ user }),
    setSocket: (socket) => set({ socket }),
    setLocationPermission: (status) => set({ locationPermission: status }),
    logout: () => set({ user: null, socket: null })
}));
