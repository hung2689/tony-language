import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import './VideoText.css';

/**
 * MagicUI VideoText Component.
 * Plays a video masked inside text using dynamic SVG data-URL masking.
 *
 * @param {object} props
 * @param {string} props.src - Video source URL (mp4, webm)
 * @param {React.ReactNode} props.children - Text content to display
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.autoPlay=true] - Autoplay video
 * @param {boolean} [props.muted=true] - Mute video
 * @param {boolean} [props.loop=true] - Loop video
 * @param {string} [props.preload="auto"] - Video preload attribute
 * @param {string|number} [props.fontSize=20] - Font size (numbers are treated as 'vw', strings as-is)
 * @param {string|number} [props.fontWeight="900"] - Font weight
 * @param {string} [props.textAnchor="middle"] - SVG text anchor
 * @param {string} [props.dominantBaseline="middle"] - SVG dominant baseline
 * @param {string} [props.fontFamily="system-ui, -apple-system, sans-serif"] - Font family
 * @param {React.ElementType} [props.as="div"] - HTML element container
 */
export function VideoText({
  src = 'https://cdn.magicui.design/ocean-small.webm',
  children,
  className = '',
  autoPlay = true,
  muted = true,
  loop = true,
  preload = 'auto',
  fontSize = 20,
  fontWeight = '900',
  x = '50%',
  y = '50%',
  textAnchor = 'middle',
  dominantBaseline = 'middle',
  fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  as: Component = 'div',
  ...props
}) {
  const [svgMask, setSvgMask] = useState('');
  const content = React.Children.toArray(children).join('');

  useEffect(() => {
    const updateSvgMask = () => {
      const responsiveFontSize =
        typeof fontSize === 'number' ? `${fontSize}vw` : fontSize;
      const newSvgMask = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'><text x='${x}' y='${y}' font-size='${responsiveFontSize}' font-weight='${fontWeight}' text-anchor='${textAnchor}' dominant-baseline='${dominantBaseline}' font-family='${fontFamily}'>${content}</text></svg>`;
      setSvgMask(newSvgMask);
    };

    updateSvgMask();
    window.addEventListener('resize', updateSvgMask);
    return () => window.removeEventListener('resize', updateSvgMask);
  }, [content, fontSize, fontWeight, x, y, textAnchor, dominantBaseline, fontFamily]);

  const dataUrlMask = `url("data:image/svg+xml,${encodeURIComponent(svgMask)}")`;

  return (
    <Component
      className={cn('magic-video-text-container', className)}
      {...props}
    >
      {/* Create a container that masks the video to only show within text */}
      <div
        className="magic-video-text-mask-layer"
        style={{
          maskImage: dataUrlMask,
          WebkitMaskImage: dataUrlMask,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      >
        <video
          className="magic-video-text-media"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
        >
          <source src={src} />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Screen-reader accessible label */}
      <span className="sr-only">{content}</span>
    </Component>
  );
}

export default VideoText;
