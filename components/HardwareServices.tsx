import React, { useEffect, useRef } from 'react';
import { useHardware } from '../contexts/HardwareContext';
import { useAudioSystem } from '../contexts/AudioContext';

const HardwareServices: React.FC = () => {
  const { isProjectionActive, projectionWindow } = useHardware();
  const { visualData } = useAudioSystem();
  const rafRef = useRef<number>(0);

  // Background Projection Sync Loop
  useEffect(() => {
    if (!isProjectionActive || !projectionWindow) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      
      // Safety Check
      if (projectionWindow.closed) {
          // Context will clean this up via its own interval, but we stop sending
          return;
      }
      
      // Send raw visual data
      projectionWindow.postMessage({
          type: 'renderFrame',
          payload: {
              hue: visualData.current.hue,
              bass: visualData.current.bass,
              mid: visualData.current.mid,
              high: visualData.current.high
          }
      }, '*');
    };

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isProjectionActive, projectionWindow, visualData]);

  return null;
};

export default HardwareServices;