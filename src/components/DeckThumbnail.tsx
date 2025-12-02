import React, { useState, useRef, useEffect } from 'react';
import type { Marker } from '../db/db';

interface DeckThumbnailProps {
    imageData: Blob | string;
    markers: Marker[];
    alt: string;
}

const DeckThumbnail: React.FC<DeckThumbnailProps> = ({ imageData, markers, alt }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (imageData instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setImageUrl(e.target.result as string);
                }
            };
            try {
                reader.readAsDataURL(imageData);
            } catch (e) {
                console.error("Blob processing error:", e);
            }
        } else {
            setImageUrl(imageData as string);
        }
    }, [imageData]);

    return (
        <div className="relative w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
                ref={imgRef}
                src={imageUrl}
                alt={alt}
                className="w-full h-full object-cover"
                onLoad={() => setIsImageLoaded(true)}
            />

            {isImageLoaded && imgRef.current && (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                    preserveAspectRatio="xMidYMid slice"
                >
                    {markers.map((marker, index) => {
                        // Filter Logic: Hide Child Markers
                        // If it has a groupId, we need to check if it's the first one in that group within this list.
                        // However, the markers prop passed here might be the full list from DB.
                        // Let's assume the markers list is sorted or we can find the "parent".

                        if (marker.groupId) {
                            // Find the first marker with this groupId
                            const parentIndex = markers.findIndex(m => m.groupId === marker.groupId);
                            // If this is not the parent (index !== parentIndex), hide it.
                            if (index !== parentIndex) return null;
                        }

                        const isLocked = !!marker.isLocked;

                        // Style Logic
                        // Locked -> Green (#00FF00), Opacity 0.3
                        // Unlocked -> Pink (#FF69B4), Opacity 0.5 (to be visible but not overwhelming)
                        const fill = isLocked ? "#00FF00" : "#FF69B4";
                        const stroke = isLocked ? "#006400" : "#C71585";
                        const fillOpacity = isLocked ? 0.3 : 0.5;

                        return (
                            <rect
                                key={index}
                                x={marker.x}
                                y={marker.y}
                                width={marker.width}
                                height={marker.height}
                                fill={fill}
                                fillOpacity={fillOpacity}
                                stroke={stroke}
                                strokeWidth={1} // Thin stroke as requested
                            />
                        );
                    })}
                </svg>
            )}
        </div>
    );
};

export default DeckThumbnail;
