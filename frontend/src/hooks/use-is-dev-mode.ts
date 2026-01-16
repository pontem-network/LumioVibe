// hooks/useDevMode.ts
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

export const useIsDevMode = (): boolean => {
  const location = useLocation();
  const [isDev, setIsDev] = useState<boolean>(false);

  useEffect(() => {
    const { hash } = location;
    const hasDevParam = hash.includes("&dev") || hash.endsWith("dev");
    setIsDev(hasDevParam);
  }, [location.hash]); // Перезапускаем эффект при изменении хэша

  return isDev;
};
