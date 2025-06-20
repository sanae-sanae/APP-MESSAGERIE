import React, { createContext, useContext, useEffect } from 'react';
import SocketService from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.token) {
      SocketService.connect(currentUser.token);
    }

    return () => {
      SocketService.disconnect();
    };
  }, [currentUser]);

  return (
    <SocketContext.Provider value={SocketService}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
