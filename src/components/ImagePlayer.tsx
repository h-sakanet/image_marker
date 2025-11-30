import React, { useRef, useState, useEffect } from 'react';
import type { Marker } from '../db/db';

interface ImagePlayerProps {
    imageData: Blob | string;
    markers: Marker[];
}

const ImagePlayer: React.FC<ImagePlayerProps> = ({ imageData, markers }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
    const imgRef = useRef<HTMLImageElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (imageData instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setImageUrl(e.target.result as string);
                }
            };
            reader.readAsDataURL(imageData);
        } else {
            setImageUrl(imageData as string);
        }
    }, [imageData]);

    // Native event listener for marker interaction
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        // Handle touchstart to prevent scrolling for Apple Pencil
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                // @ts-ignore
                const isStylus = touch.touchType === 'stylus' || touch.touchType === 'pen';

                if (isStylus) {
                    e.preventDefault();
                }
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            // Allow touch to scroll
            if (e.pointerType === 'touch') return;

            const target = e.target as Element;
            const indexStr = target.getAttribute('data-index');

            if (indexStr !== null) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(indexStr, 10);

                setRevealedIndices(prev => {
                    const newSet = new Set(prev);
                    newSet.add(index);
                    return newSet;
                });
            }
        };

        svg.addEventListener('touchstart', onTouchStart, { passive: false });
        svg.addEventListener('pointerdown', onPointerDown, { passive: false });

        return () => {
            svg.removeEventListener('touchstart', onTouchStart);
            svg.removeEventListener('pointerdown', onPointerDown);
        };
    }, []);

    return (
        <div className="relative inline-block shadow-xl rounded-lg overflow-hidden bg-white mb-8">
            <img
                ref={imgRef}
                src={imageUrl}
                alt="Study material"
                className="block max-w-full h-auto pointer-events-none select-none"
                draggable={false}
            />

            <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                viewBox={imgRef.current ? `0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}` : undefined}
            >
                {markers.map((marker, index) => {
                    const isRevealed = revealedIndices.has(index);
                    return (
                        <rect
                            key={index}
                            data-index={index}
                            x={marker.x}
                            y={marker.y}
                            width={marker.width}
                            height={marker.height}
                            fill="#FF69B4"
                            fillOpacity={isRevealed ? 0.3 : 1.0}
                            stroke="none"
                            style={{
                                cursor: 'pointer',
                                transition: 'fill-opacity 0.2s ease'
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default ImagePlayer;
