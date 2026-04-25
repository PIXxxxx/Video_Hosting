import { useEffect, useState } from 'react';

export const useUserTimeZone = () => {
  const [timeZone, setTimeZone] = useState<string>('Europe/Moscow');
  
  useEffect(() => {
    // Определяем часовой пояс пользователя
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(tz);
  }, []);
  
  return timeZone;
};