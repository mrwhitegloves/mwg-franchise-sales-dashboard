import { createContext, useContext, useEffect, useRef } from "react";

export const SocketContext = createContext({ socket: null, status: "offline" });

export const useSocket = () => useContext(SocketContext);

/** Subscribe a component to one socket event for its lifetime */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; }, [handler]);
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => ref.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
