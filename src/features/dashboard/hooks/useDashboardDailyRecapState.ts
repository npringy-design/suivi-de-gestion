import { useState } from 'react';

export function useDashboardDailyRecapState() {
  const [dailyRecapStatus, setDailyRecapStatus] = useState('');
  const [isDailyRecapModalOpen, setIsDailyRecapModalOpen] = useState(false);
  const [dailyRecapManagers, setDailyRecapManagers] = useState({ midi: '', soir: '' });
  const [dailyRecapServiceComments, setDailyRecapServiceComments] = useState({ midi: '', soir: '' });
  const [dailyRecapGoogleRatings, setDailyRecapGoogleRatings] = useState<Record<number, string>>({ 1: '', 2: '', 3: '', 4: '', 5: '' });

  return {
    dailyRecapStatus,
    setDailyRecapStatus,
    isDailyRecapModalOpen,
    setIsDailyRecapModalOpen,
    dailyRecapManagers,
    setDailyRecapManagers,
    dailyRecapServiceComments,
    setDailyRecapServiceComments,
    dailyRecapGoogleRatings,
    setDailyRecapGoogleRatings,
  };
}
