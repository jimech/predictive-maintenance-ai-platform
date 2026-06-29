import React, { createContext, useContext, useEffect, useState } from 'react';
import { setDemoMode as setApiDemoMode } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: true,
  toggleDemoMode: () => {},
});

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('demoMode') !== 'false';
  });

  useEffect(() => {
    setApiDemoMode(isDemoMode);
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const newValue = !prev;
      localStorage.setItem('demoMode', String(newValue));
      setApiDemoMode(newValue);
      
      // Invalidate queries so that components refetch using the new mode
      queryClient.invalidateQueries();
      
      return newValue;
    });
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoMode = () => useContext(DemoContext);
