import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { deviceTimeZone, LocalDate, todayIn } from '@/domain/dates/local-date';

/** Today's calendar date in the device timezone; refreshes when the app returns to the foreground. */
export function useToday(): LocalDate {
  const [today, setToday] = useState(() => todayIn(deviceTimeZone()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(todayIn(deviceTimeZone()));
    });
    return () => sub.remove();
  }, []);
  return today;
}
