import React, { useRef, useState, useEffect } from 'react';
import { db, type Marker } from '../db/db';

interface ImagePlayerProps {
    imageId: number;
    imageData: Blob | string;
    markers: Marker[];
    onMarkerUpdate: () => void; // Callback to refresh parent state if needed
}

const ImagePlayer: React.FC<ImagePlayerProps> = ({
    imageId,
    imageData,
    markers,
    onMarkerUpdate
}) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // Local state for ephemeral transparency
    // Key: marker index, Value: true if transparent
    const [transparentMarkers, setTransparentMarkers] = useState<Set<number>>(new Set());

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

    // Helper to get center of marker
    const getCenter = (marker: Marker) => ({
        x: marker.x + marker.width / 2,
        y: marker.y + marker.height / 2
    });

    const handleMarkerTap = async (index: number) => {
        const marker = markers[index];
        const isLinked = !!marker.groupId;

        // Find all indices in this group (including self)
        const groupIndices = isLinked
            ? markers.map((m, i) => m.groupId === marker.groupId ? i : -1).filter(i => i !== -1)
            : [index];

        // Determine current state
        // State 1: Default (Opaque) -> !isLocked && !transparent
        // State 2: Transparent -> !isLocked && transparent
        // State 3: Locked -> isLocked

        // Check the state of the *target* marker (or the group leader)
        // Since they sync, checking one is enough.
        const isLocked = marker.isLocked;
        const isTransparent = transparentMarkers.has(index);

        if (!isLocked && !isTransparent) {
            // State 1 -> State 2 (Transparent)
            const newSet = new Set(transparentMarkers);
            groupIndices.forEach(i => newSet.add(i));
            setTransparentMarkers(newSet);
        } else if (!isLocked && isTransparent) {
            // State 2 -> State 3 (Locked)
            // Update DB
            await db.transaction('rw', db.images, async () => {
                const image = await db.images.get(imageId);
                if (image) {
                    const newMarkers = [...image.markers];
                    groupIndices.forEach(i => {
                        if (newMarkers[i]) newMarkers[i].isLocked = true;
                    });
                    await db.images.update(imageId, { markers: newMarkers });
                }
            });
            // Clear transparency (it's now locked)
            const newSet = new Set(transparentMarkers);
            groupIndices.forEach(i => newSet.delete(i));
            setTransparentMarkers(newSet);
            onMarkerUpdate();
        } else if (isLocked) {
            // State 3 -> State 1 (Default)
            // Update DB
            await db.transaction('rw', db.images, async () => {
                const image = await db.images.get(imageId);
                if (image) {
                    const newMarkers = [...image.markers];
                    groupIndices.forEach(i => {
                        if (newMarkers[i]) newMarkers[i].isLocked = false;
                    });
                    await db.images.update(imageId, { markers: newMarkers });
                }
            });
            onMarkerUpdate();
        }
    };

    return (
        <div className="relative inline-block shadow-xl rounded-lg overflow-hidden bg-white mb-8">
            <style>{`
                @keyframes dash-rotate {
                    to {
                        stroke-dashoffset: -20;
                    }
                }
            `}</style>

            <img
                ref={imgRef}
                src={imageUrl}
                alt="Study material"
                className="block pointer-events-none select-none"
                style={{ maxWidth: 'none', height: 'auto' }}
                draggable={false}
                onLoad={() => setIsImageLoaded(true)}
            />

            <svg
                className="absolute inset-0 w-full h-full"
                viewBox={imgRef.current && isImageLoaded ? `0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}` : undefined}
            >
                <defs>
                    <filter id="marker-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Connection Lines */}
                {markers.map((marker, index) => {
                    if (!marker.groupId) return null;
                    const parentIndex = markers.findIndex(m => m.groupId === marker.groupId);
                    if (parentIndex === -1 || parentIndex === index) return null;

                    const parent = markers[parentIndex];
                    const start = getCenter(parent);
                    const end = getCenter(marker);

                    return (
                        <line
                            key={`line-${index}`}
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            stroke="#808080"
                            strokeWidth={2}
                            strokeDasharray="5,5"
                            pointerEvents="none"
                        />
                    );
                })}

                {/* Markers */}
                {markers.map((marker, index) => {
                    const isLinked = !!marker.groupId;
                    const parentIndex = isLinked ? markers.findIndex(m => m.groupId === marker.groupId) : -1;
                    const isParent = isLinked && index === parentIndex;
                    const isChild = isLinked && !isParent;

                    const isTransparent = transparentMarkers.has(index);
                    const isLocked = !!marker.isLocked;

                    // Base Styles
                    let fill = "#FF69B4"; // Pink
                    let stroke = "#C71585";
                    let fillOpacity = 1.0;
                    let strokeWidth = 3;

                    // Child Style
                    if (isChild) {
                        fill = "#DDDDDD"; // Gray
                        stroke = "#555555";
                    }

                    // State Overrides
                    if (isLocked) {
                        // Locked State (Green)
                        if (isChild) {
                            // Linked markers stay Gray but locked behavior?
                            // User said: "Link destination marker is also locked at the same time. Color remains gray."
                            // So visual style doesn't change much for child, but parent changes.
                            // But wait, "Locked markers... displayed as transparent".
                            // Wait, "Tap again -> Locked (Green border/fill). Opacity remains."
                            // So Locked = Green + Transparent?
                            // User said: "The frame line and inside become green and locked. The transparency remains."
                            // So it's Green AND Transparent (0.3).

                            // For Child: "Color remains gray."
                            // So Child Locked = Gray + Transparent (0.3).
                            fillOpacity = 0.3;
                        } else {
                            // Parent/Normal Locked = Green + Transparent (0.3)
                            fill = "#00FF00"; // Green
                            stroke = "#006400"; // Dark Green
                            fillOpacity = 0.3;
                        }
                    } else if (isTransparent) {
                        // Transparent State (Ephemeral)
                        fillOpacity = 0.3;
                    }

                    return (
                        <rect
                            key={index}
                            id={`marker-${imageId}-${index}`} // For scrolling
                            x={marker.x}
                            y={marker.y}
                            width={marker.width}
                            height={marker.height}
                            fill={fill}
                            fillOpacity={fillOpacity}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            filter="url(#marker-shadow)"
                            className="transition-all duration-200"
                            onPointerUp={(e) => {
                                // Stylus check
                                if (e.pointerType === 'pen') {
                                    e.stopPropagation();
                                    handleMarkerTap(index);
                                }
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default ImagePlayer;
