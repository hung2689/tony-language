import React from 'react';
import { cn } from '@/lib/utils';
import './BorderBeam.css';

/**
 * Magic UI BorderBeam Component.
 * Animated glowing gradient beam that travels continuously around borders.
 */
export function BorderBeam({
  className = '',
  size = 100,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = '#a855f7',
  colorTo = '#3b82f6',
  colorOrange = '#f97316',
  delay = 0,
}) {
  return (
    <div
      style={{
        '--size': size,
        '--duration': duration,
        '--border-width': borderWidth,
        '--color-from': colorFrom,
        '--color-to': colorTo,
        '--color-orange': colorOrange,
        '--delay': delay,
      }}
      className={cn('magic-border-beam', className)}
      aria-hidden="true"
    />
  );
}

export default BorderBeam;
