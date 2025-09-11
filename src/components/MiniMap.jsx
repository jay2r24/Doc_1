import React, { useEffect, useRef, useState, useCallback } from 'react';
 
const CHANGE_SELECTORS = [
  '.git-line-added',
  '.git-line-removed',
  '.git-line-modified',
  '.git-inline-added',
  '.git-inline-removed',
  '.placeholder-added',
  '.placeholder-removed'
];
 
const UnifiedScrollBar = ({ leftContainerId, rightContainerId }) => {
  const barRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [viewport, setViewport] = useState({ top: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
 
  const getContainers = useCallback(
    () => ({
      left: document.getElementById(leftContainerId),
      right: document.getElementById(rightContainerId)
    }),
    [leftContainerId, rightContainerId]
  );
  /** Scroll both containers to a specific ratio */
  const scrollBothToRatio = useCallback((ratio) => {
    const { left, right } = getContainers();
    if (!left || !right) return;

    // Temporarily disable scroll event listeners to prevent conflicts
    const leftScrollHandler = left.onscroll;
    const rightScrollHandler = right.onscroll;
    left.onscroll = null;
    right.onscroll = null;

    const leftMaxScroll = Math.max(1, left.scrollHeight - left.clientHeight);
    const rightMaxScroll = Math.max(1, right.scrollHeight - right.clientHeight);

    if (leftMaxScroll > 0 && rightMaxScroll > 0) {
      const leftScrollTop = Math.round(leftMaxScroll * ratio);
      const rightScrollTop = Math.round(rightMaxScroll * ratio);

      left.scrollTop = leftScrollTop;
      right.scrollTop = rightScrollTop;
    }

    // Re-enable scroll handlers after a brief delay
    requestAnimationFrame(() => {
      left.onscroll = leftScrollHandler;
      right.onscroll = rightScrollHandler;
    });
  }, [getContainers]);

  /** Handle click on scroll bar */
  const handleBarClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!barRef.current) return;
    
    const rect = barRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / Math.max(1, rect.height)));
    
    scrollBothToRatio(ratio);
  }, [scrollBothToRatio]);

  /** Handle drag on scroll bar */
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const handleMouseMove = (e) => {
      e.preventDefault();
      if (!barRef.current) return;
      
      const rect = barRef.current.getBoundingClientRect();
      const dragY = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, dragY / Math.max(1, rect.height)));
      
      scrollBothToRatio(ratio);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
  }, [scrollBothToRatio]);
 
  /** Collect all change markers */
  const collectMarkers = useCallback(() => {
    const { left, right } = getContainers();
    if (!left || !right) return [];
 
    const scrollHeight = Math.max(left.scrollHeight, right.scrollHeight);
    const allMarkers = [];
 
    [left, right].forEach((container) => {
      const elements = container.querySelectorAll(CHANGE_SELECTORS.join(','));
 
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + container.scrollTop;
 
        const ratio = relativeTop / scrollHeight;
 
        let color = '#6b7280';
        if (
          el.classList.contains('git-line-added') ||
          el.classList.contains('git-inline-added') ||
          el.classList.contains('placeholder-added')
        ) {
          color = '#10b981'; // green
        } else if (
          el.classList.contains('git-line-removed') ||
          el.classList.contains('git-inline-removed') ||
          el.classList.contains('placeholder-removed')
        ) {
          color = '#ef4444'; // red
        } else if (
          el.classList.contains('git-line-modified')
        ) {
          color = '#f59e0b'; // yellow
        }
 
        allMarkers.push({
          ratio,
          color,
          element: el
        });
      });
    });
 
    return allMarkers;
  }, [getContainers]);
 
  /** Update viewport position */
  const updateViewport = useCallback(() => {
    const { left } = getContainers();
    if (!left) return;
 
    const scrollTop = left.scrollTop;
    const clientHeight = left.clientHeight;
    const scrollHeight = left.scrollHeight;
 
    const topPercentage = (scrollTop / scrollHeight) * 100;
    const heightPercentage = (clientHeight / scrollHeight) * 100;
 
    setViewport({
      top: topPercentage,
      height: heightPercentage
    });
  }, [getContainers]);
 
  /** Scroll both docs */
  const scrollToElement = useCallback((element) => {
    if (!element) return;
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, []);
 
  /** Init markers + observers */
  useEffect(() => {
    const refresh = () => {
      setMarkers(collectMarkers());
      updateViewport();
    };
 
    const { left, right } = getContainers();
    if (!left || !right) return;
 
    refresh();
 
    // Only listen to left container for viewport updates to avoid conflicts
    left.addEventListener('scroll', updateViewport, { passive: true });
 
    const observer = new MutationObserver(refresh);
    observer.observe(left, { childList: true, subtree: true });
    observer.observe(right, { childList: true, subtree: true });
 
    window.addEventListener('resize', refresh);
 
    return () => {
      left.removeEventListener('scroll', updateViewport);
      observer.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, [collectMarkers, updateViewport, getContainers]);
 
  return (
    <div
      ref={barRef}
      className={`relative w-6 h-full bg-gray-100 rounded-md cursor-pointer select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onClick={handleBarClick}
      onMouseDown={handleMouseDown}
    >
      {/* Markers */}
      {markers.map((m, i) => (
        <div
          key={i}
          onClick={() => scrollToElement(m.element)}
          className="absolute left-1 right-1 rounded-sm cursor-pointer hover:opacity-100"
          style={{
            top: `${m.ratio * 100}%`,
            height: '3px',
            backgroundColor: m.color,
            opacity: 0.9
          }}
        />
      ))}
 
      {/* Viewport indicator */}
      <div
        className={`absolute left-0 right-0 border-2 border-blue-500 bg-blue-400/20 rounded-sm pointer-events-none ${
          isDragging ? 'bg-blue-500/30' : ''
        }`}
        style={{
          top: `${viewport.top}%`,
          height: `${viewport.height}%`
        }}
      />
    </div>
  );
};
 
export default UnifiedScrollBar;