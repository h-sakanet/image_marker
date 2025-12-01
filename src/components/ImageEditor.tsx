import React, { useRef, useState, useEffect } from 'react';
import type { Marker } from '../db/db';
import type { ToolType } from './Toolbar';

interface ImageEditorProps {
    imageId?: number;
    imageData: Blob | string;
    markers: Marker[];
    activeTool: ToolType;
    onAddMarker: (marker: Marker) => void;
    onRemoveMarker: (index: number) => void;
    scale: number;
    linkMode?: { active: boolean, parentMarkerIndex: number | null, imageId: number | null };
    onEnterLinkMode?: (index: number) => void;
    onLinkMarker?: (index: number) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({
    imageData,
    markers,
    activeTool,
    onAddMarker,
    onRemoveMarker,
    scale,
    linkMode,
    onEnterLinkMode,
    onLinkMarker
}) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Refs for drawing
    const isDrawingRef = useRef(false);
    const startPosRef = useRef<{ x: number, y: number } | null>(null);
    const currentPosRef = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        if (imageData instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setImageUrl(e.target.result as string);
                }
            };
            reader.onerror = (e) => {
                console.error("Blob read error:", e.target?.error?.message);
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


    // Native event listener for pointer events
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        // Handle touchstart to prevent scrolling for Apple Pencil
        const onTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                // @ts-ignore
                if (touch.touchType === 'stylus' || touch.touchType === 'pen') {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                // @ts-ignore
                if (touch.touchType === 'stylus' || touch.touchType === 'pen') {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            // Allow touch to scroll
            if (e.pointerType === 'touch') return;

            // Check if we clicked a marker (rect)
            if ((e.target as Element).tagName === 'rect') {
                // Prevent default to stop scrolling/zooming by browser
                e.preventDefault();
                // Do NOT stop propagation, so React's synthetic event system can see it
                return;
            }

            if (activeTool === 'pen') {
                e.preventDefault();
                e.stopPropagation();
                (e.target as Element).setPointerCapture(e.pointerId);

                const rect = svg.getBoundingClientRect();
                const img = imgRef.current;
                if (!img) return;

                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;

                const pos = {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };

                isDrawingRef.current = true;
                startPosRef.current = pos;
                currentPosRef.current = pos;

                setIsDrawing(true);
                setStartPos(pos);
                setCurrentPos(pos);
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDrawingRef.current || activeTool !== 'pen') return;

            // Double check pointer type
            if (e.pointerType === 'touch') return;

            e.preventDefault();
            e.stopPropagation();

            const rect = svg.getBoundingClientRect();
            const img = imgRef.current;
            if (!img) return;

            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;

            const pos = {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };

            currentPosRef.current = pos;
            setCurrentPos(pos);
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!isDrawingRef.current) return;

            e.preventDefault();
            e.stopPropagation();
            try {
                (e.target as Element).releasePointerCapture(e.pointerId);
            } catch (err) {
                // Ignore if not captured
            }

            const start = startPosRef.current;
            const current = currentPosRef.current;

            if (start && current && activeTool === 'pen') {
                const x = Math.min(start.x, current.x);
                const y = Math.min(start.y, current.y);
                const width = Math.abs(current.x - start.x);
                const height = Math.abs(current.y - start.y);

                if (width > 5 && height > 5) {
                    onAddMarker({ x, y, width, height });
                }
            }

            isDrawingRef.current = false;
            startPosRef.current = null;
            currentPosRef.current = null;

            setIsDrawing(false);
            setStartPos(null);
            setCurrentPos(null);
        };

        svg.addEventListener('touchstart', onTouchStart, { passive: false });
        svg.addEventListener('touchmove', onTouchMove, { passive: false });
        svg.addEventListener('pointerdown', onPointerDown, { passive: false });
        svg.addEventListener('pointermove', onPointerMove, { passive: false });
        svg.addEventListener('pointerup', onPointerUp, { passive: false });
        svg.addEventListener('pointercancel', onPointerUp, { passive: false });

        return () => {
            svg.removeEventListener('touchstart', onTouchStart);
            svg.removeEventListener('touchmove', onTouchMove);
            svg.removeEventListener('pointerdown', onPointerDown);
            svg.removeEventListener('pointermove', onPointerMove);
            svg.removeEventListener('pointerup', onPointerUp);
            svg.removeEventListener('pointercancel', onPointerUp);
        };
    }, [activeTool, onAddMarker]); // Re-bind when tool/callback changes

    const handleMarkerPointerDown = (e: React.PointerEvent, index: number) => {
        // Stop propagation so we don't start drawing on the SVG itself
        e.stopPropagation();
        e.preventDefault(); // Prevent scrolling if it bubbles

        if (activeTool === 'eraser') {
            onRemoveMarker(index);
            return;
        }

        if (activeTool === 'pen') {
            if (linkMode?.active) {
                // In link mode, tap to link
                onLinkMarker?.(index);
            } else {
                // Tap to Enter Link Mode immediately (User Request)
                onEnterLinkMode?.(index);
            }
        }
    };

    // Helper to get center of marker
    const getCenter = (marker: Marker) => ({
        x: marker.x + marker.width / 2,
        y: marker.y + marker.height / 2
    });

    return (
        <div className="relative inline-block shadow-xl rounded-lg overflow-hidden bg-white mb-8">
            {/* CSS for rotating border */}
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
                className="block max-w-full h-auto pointer-events-none select-none"
                draggable={false}
                onLoad={() => setIsImageLoaded(true)}
                onError={(e) => console.error("Image load error:", e)}
            />

            <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                viewBox={imgRef.current && isImageLoaded ? `0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}` : undefined}
            >
                <defs>
                    <filter id="marker-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Connection Lines in Link Mode */}
                {linkMode?.active && linkMode.parentMarkerIndex !== null && markers.map((marker, index) => {
                    const parent = markers[linkMode.parentMarkerIndex!];
                    // If this marker is linked to parent (same groupId)
                    // Or if this IS the parent (no line needed)
                    if (index === linkMode.parentMarkerIndex) return null;

                    // Check if linked
                    const isLinked = parent.groupId && marker.groupId === parent.groupId;

                    if (isLinked) {
                        const pCenter = getCenter(parent);
                        const mCenter = getCenter(marker);
                        return (
                            <line
                                key={`line-${index}`}
                                x1={pCenter.x}
                                y1={pCenter.y}
                                x2={mCenter.x}
                                y2={mCenter.y}
                                stroke="#C71585"
                                strokeWidth={4 * (1 / scale)}
                                strokeDasharray="8,8"
                            />
                        );
                    }
                    return null;
                })}

                {markers.map((marker, index) => {
                    // Determine style based on Link Mode
                    let fillOpacity = 1.0;
                    let stroke = "#C71585";
                    let strokeDasharray = "none";
                    let animation = "none";
                    let filter = "url(#marker-shadow)";

                    if (linkMode?.active) {
                        fillOpacity = 0.3; // All markers get 30% opacity in link mode

                        if (index === linkMode.parentMarkerIndex) {
                            // Parent Marker
                            strokeDasharray = "10, 5";
                            animation = "dash-rotate 1s linear infinite";
                        } else {
                            const parent = markers[linkMode.parentMarkerIndex!];
                            const isLinked = parent.groupId && marker.groupId === parent.groupId;

                            if (isLinked) {
                                // Linked Marker
                                stroke = "#808080"; // Gray
                            } else {
                                // Unlinked Marker (already has fillOpacity 0.3)
                            }
                        }
                    }

                    return (
                        <rect
                            key={index}
                            x={marker.x}
                            y={marker.y}
                            width={marker.width}
                            height={marker.height}
                            fill="#FF69B4"
                            fillOpacity={fillOpacity}
                            stroke={stroke}
                            strokeWidth={10 * (1 / scale)}
                            strokeDasharray={strokeDasharray}
                            filter={filter}
                            style={{
                                cursor: activeTool === 'eraser' || (activeTool === 'pen' && linkMode?.active) ? 'crosshair' : 'default',
                                animation: animation
                            }}
                            onPointerDown={(e) => handleMarkerPointerDown(e, index)}
                        />
                    );
                })}

                {isDrawing && startPos && currentPos && (
                    <rect
                        x={Math.min(startPos.x, currentPos.x)}
                        y={Math.min(startPos.y, currentPos.y)}
                        width={Math.abs(currentPos.x - startPos.x)}
                        height={Math.abs(currentPos.y - startPos.y)}
                        fill="none"
                        stroke="#C71585"
                        strokeWidth={10 * (1 / scale)}
                        strokeDasharray="4"
                    />
                )}
            </svg>
        </div>
    );
};

export default ImageEditor;
