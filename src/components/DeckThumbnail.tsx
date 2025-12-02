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
                className="w-full h-full object-cover object-top"
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
                        // Locked -> Green (#00FF00), Opacity 0.6 (More vivid)
                        // Unlocked -> Deep Pink (#FF1493), Opacity 0.8 (More vivid)
                        const fill = isLocked ? "#00FF00" : "#FF1493";
                        const stroke = isLocked ? "#006400" : "#C71585";
                        const fillOpacity = isLocked ? 0.6 : 0.8;

                        // Scale 1.5x from center
                        const scale = 1.5;
                        const newWidth = marker.width * scale;
                        const newHeight = marker.height * scale;
                        const newX = marker.x - (newWidth - marker.width) / 2;
                        const newY = marker.y - (newHeight - marker.height) / 2;

                        return (
                            <rect
                                key={index}
                                x={newX}
                                y={newY}
                                width={newWidth}
                                height={newHeight}
                                fill={fill}
                                fillOpacity={fillOpacity}
                                stroke={stroke}
                                strokeWidth={1} // Thin border as requested
                            />
                        );
                    })}
                </svg>
            )}
        </div>
    );
};

export default DeckThumbnail;
