"use client";

import React, { useState, useEffect } from 'react';

export default function DynamicBackground() {
  const [isDay, setIsDay] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const hourPart = parts.find(p => p.type === 'hour');
      let currentHour = hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
      
      if (currentHour === 24) currentHour = 0;
      
      const isDaytime = currentHour >= 6 && currentHour < 18;
      setIsDay(isDaytime);
      
      if (isDaytime) {
        document.body.classList.add('day-mode');
      } else {
        document.body.classList.remove('day-mode');
      }
    };

    checkTime();
    setMounted(true);
    
    // Default check every minute to smoothly transition when the hour changes
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[-1] bg-slate-50 overflow-hidden transition-opacity duration-700 ease-in-out pointer-events-none ${mounted && isDay ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 opacity-80">
         <div className="day-cloud cloud-1"></div>
         <div className="day-cloud cloud-2"></div>
         <div className="day-cloud cloud-3"></div>
      </div>
    </div>
  );
}
