import React, { useState, MouseEvent, TouchEvent } from 'react';

export interface RippleItem {
  x: number;
  y: number;
  id: number;
  size: number;
}

export const useTouchRipple = () => {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const triggerRipple = (e: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent<HTMLElement>).clientX;
      clientY = (e as MouseEvent<HTMLElement>).clientY;
    } else {
      return;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.8;
    const id = Date.now() + Math.random();

    setRipples(prev => [...prev, { x, y, id, size }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 700);
  };

  return { ripples, triggerRipple };
};

export const RippleContainer: React.FC<{
  ripples: RippleItem[];
  color?: string;
}> = ({ ripples, color = 'rgba(255, 255, 255, 0.45)' }) => {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-0">
      {ripples.map(r => (
        <span
          key={r.id}
          className="touch-ripple"
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
            width: `${r.size}px`,
            height: `${r.size}px`,
            backgroundColor: color,
          }}
        />
      ))}
    </span>
  );
};
