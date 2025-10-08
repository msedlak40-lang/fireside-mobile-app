// mobile/lib/activeGroup.tsx
import React, { createContext, useContext, useState } from 'react';

type ActiveGroupCtx = {
  groupId: string | null;
  setGroupId: (id: string | null) => void;
};

const Ctx = createContext<ActiveGroupCtx | undefined>(undefined);

export const ActiveGroupProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [groupId, setGroupId] = useState<string | null>(null);
  return <Ctx.Provider value={{ groupId, setGroupId }}>{children}</Ctx.Provider>;
};

export const useActiveGroup = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActiveGroup must be used within ActiveGroupProvider');
  return ctx;
};
