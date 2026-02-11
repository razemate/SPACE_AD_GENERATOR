
import React, { useRef, useState, useEffect } from 'react';
import { AdData } from '../types';

interface AdPreviewProps {
  data: AdData;
  isGenerating: boolean;
}

const AdPreview: React.FC<AdPreviewProps> = ({ data, isGenerating }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  
  const baseWidth = 1920;
  const getBaseHeight = () => {
    switch (data.aspectRatio) {
      case '16:9': return 1080;
      case '9:16': return 3413;
      case '4:3': return 1440;
      case '3:4': return 2560;
      case '2:3': return 2880;
      case '3:2': return 1280;
      case '21:9': return 823;
      case '1:1': default: return 1920;
    }
  };

  const baseHeight = getBaseHeight();

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && containerRef.current.parentElement) {
        const parent = containerRef.current.parentElement;
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight;
        
        // Ensure we have valid parent dimensions before scaling
        if (parentWidth > 0 && parentHeight > 0) {
          const widthScale = (parentWidth * 0.98) / baseWidth;
          const heightScale = (parentHeight * 0.98) / baseHeight;
          const newScale = Math.min(widthScale, heightScale);
          setScale(Math.max(newScale, 0.1)); // Never go below 10%
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, [baseWidth, baseHeight, data.aspectRatio]);

  const getStyle = (font: string, size: string, lineHeight?: string, weight?: string, color?: string) => {
    const style: React.CSSProperties = {};
    if (font && font !== 'Auto') style.fontFamily = `'${font}', sans-serif`;
    if (size && size !== 'Auto') style.fontSize = size; 
    if (lineHeight && lineHeight !== 'Auto') style.lineHeight = lineHeight;
    if (weight) {
      const weightMap: Record<string, string> = {
        'Regular': '400',
        'Medium': '500',
        'Bold': '700',
        'Black': '900'
      };
      style.fontWeight = weightMap[weight] || weight;
    }
    if (color) style.color = color;
    return style;
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-zinc-900 shadow-[0_30px_100px_rgba(0,0,0,1)] overflow-hidden transition-all duration-200 ease-out"
      style={{ 
        width: `${baseWidth}px`, 
        height: `${baseHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        marginBottom: `-${baseHeight * (1 - scale)}px`,
        marginRight: `-${baseWidth * (1 - scale)}px`
      }}
    >
      <div className="absolute inset-0 w-full h-full">
        {data.imageUrl ? (
          <img 
            src={data.imageUrl} 
            alt="Ad Background" 
            className={`w-full h-full object-cover transition-opacity duration-1000 ${isGenerating ? 'opacity-20' : 'opacity-100'}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black"></div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>

      <div className="absolute inset-0 flex flex-col justify-end p-[100px]">
        <div className="max-w-[1500px] space-y-[35px]">
          <h2 
            className="drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] uppercase tracking-tight"
            style={{
              ...getStyle(data.headlineFont, data.headlineSize, data.headlineLineHeight, data.headlineWeight, data.headlineColor),
              fontSize: data.headlineSize === 'Auto' ? '120px' : data.headlineSize,
              lineHeight: data.headlineLineHeight === 'Auto' ? '1.05' : data.headlineLineHeight,
            }}
          >
            {data.headline}
          </h2>

          <p 
            className="drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]"
            style={{
              ...getStyle(data.subheadlineFont, data.subheadlineSize, data.subheadlineLineHeight, data.subheadlineWeight, data.subheadlineColor),
              fontSize: data.subheadlineSize === 'Auto' ? '42px' : data.subheadlineSize,
              lineHeight: data.subheadlineLineHeight === 'Auto' ? '1.5' : data.subheadlineLineHeight,
              maxWidth: '1200px'
            }}
          >
            {data.subheadline}
          </p>

          <div className="pt-[30px]">
            <button 
              className="rounded-none shadow-2xl flex items-center gap-[20px] active:scale-95 transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_0_80px_rgba(234,179,8,0.6)] group"
              style={{
                ...getStyle(data.ctaFont, data.ctaSize === 'Auto' ? '32px' : data.ctaSize, undefined, data.ctaWeight, data.ctaColor),
                backgroundColor: data.ctaColor === '#ebb308' || !data.ctaColor ? '#ebb308' : data.ctaColor,
                color: (data.ctaColor === '#ebb308' || !data.ctaColor) ? 'black' : 'white', // Basic auto-color for text if background changes
                padding: '25px 70px',
                fontSize: data.ctaSize === 'Auto' ? '32px' : data.ctaSize,
                letterSpacing: '0.1em'
              }}
            >
              <span className="uppercase">{data.cta}</span>
              <svg className="w-[30px] h-[30px] transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {data.showBadge && (
        <div className="absolute top-[60px] left-[60px] flex items-center gap-[15px] bg-black/60 backdrop-blur-2xl px-[35px] py-[15px] rounded-full border border-white/20">
          <div className="w-[10px] h-[10px] bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-[20px] font-black text-white uppercase tracking-[0.2em]">Market Intelligence Report</span>
        </div>
      )}

      {isGenerating && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-[100px] h-[100px] border-[10px] border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-[30px]"></div>
          <p className="text-yellow-500 font-black text-[36px] uppercase tracking-[0.2em] animate-pulse">Rendering Asset</p>
        </div>
      )}
    </div>
  );
};

export default AdPreview;
