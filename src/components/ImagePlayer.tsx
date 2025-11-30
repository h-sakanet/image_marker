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

    useEffect(() => {
        if (imageData instanceof Blob) {
            const url = URL.createObjectURL(imageData);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setImageUrl(imageData as string);
        }
    }, [imageData]);

    const handleMarkerClick = (index: number, e: React.PointerEvent) => {
        // Allow touch to scroll
        if (e.pointerType === 'touch') return;

        e.preventDefault();
        e.stopPropagation();
        setRevealedIndices(prev => {
            const newSet = new Set(prev);
            newSet.add(index);
            return newSet;
        });
    };

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
                className="absolute inset-0 w-full h-full"
                viewBox={imgRef.current ? `0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}` : undefined}
            >
                {markers.map((marker, index) => {
                    const isRevealed = revealedIndices.has(index);
                    return (
                        <rect
                            key={index}
                            x={marker.x}
                            y={marker.y}
                            width={marker.width}
                            height={marker.height}
                            fill="#FF69B4"
                            fillOpacity={isRevealed ? 0.3 : 1.0}
                            stroke="none"
                            onPointerDown={(e) => handleMarkerClick(index, e)}
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
