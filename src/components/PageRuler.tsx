import React, { useRef, useState } from 'react';

interface PageRulerProps {
    totalImages: number;
    currentPage: number;
    onScrollToPage: (pageIndex: number) => void;
}

const PageRuler: React.FC<PageRulerProps> = ({ totalImages, currentPage, onScrollToPage }) => {
    const rulerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleInteraction = (clientY: number) => {
        if (!rulerRef.current) return;
        const rect = rulerRef.current.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const percentage = Math.max(0, Math.min(1, relativeY / rect.height));

        const targetPage = Math.floor(percentage * totalImages);
        const clampedPage = Math.max(0, Math.min(totalImages - 1, targetPage));

        onScrollToPage(clampedPage);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        setIsDragging(true);
        handleInteraction(e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        handleInteraction(e.clientY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        try {
            (e.target as Element).releasePointerCapture(e.pointerId);
        } catch (err) {
            // Ignore
        }
    };

    if (totalImages <= 1) return null;

    return (
        <div
            className="absolute right-0 top-20 bottom-20 w-8 z-40 flex flex-col items-center justify-between py-2 pointer-events-auto select-none touch-none"
            style={{ touchAction: 'none' }}
        >
            {/* Background Bar */}
            <div className="absolute inset-y-0 right-0 w-6 bg-white/80 backdrop-blur-sm rounded-l-lg shadow-sm border-l border-gray-100" />

            {/* Interactive Area (Wider than visible bar for easier touch) */}
            <div
                ref={rulerRef}
                className="absolute inset-y-0 right-0 w-12 cursor-pointer"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            />

            {/* Page Indicators */}
            {Array.from({ length: totalImages }).map((_, index) => {
                // Only show some numbers to avoid clutter if too many pages
                const showNumber = totalImages <= 20 || index === 0 || index === totalImages - 1 || index % 5 === 0;
                const isCurrent = index === currentPage;

                return (
                    <div
                        key={index}
                        className={`relative z-10 text-[10px] font-bold transition-all duration-200 ${isCurrent ? 'text-primary-600 scale-150' : 'text-gray-400'
                            }`}
                        style={{
                            opacity: showNumber || isCurrent ? 1 : 0,
                            height: `${100 / totalImages}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {showNumber || isCurrent ? index + 1 : '•'}
                    </div>
                );
            })}
        </div>
    );
};

export default PageRuler;
