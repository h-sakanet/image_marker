import React, { useRef, useState, useEffect } from 'react';
import type { Marker } from '../db/db';
import type { ToolType } from './Toolbar';

interface ImageEditorProps {
    imageData: Blob | string;
    markers: Marker[];
    activeTool: ToolType;
    onAddMarker: (marker: Marker) => void;
    onRemoveMarker: (index: number) => void;
    scale: number;
}

const ImageEditor: React.FC<ImageEditorProps> = ({
    imageData,
    markers,
    activeTool,
    onAddMarker,
    onRemoveMarker,
    scale
}) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

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



    const isDrawingRef = useRef(false);
    const startPosRef = useRef<{ x: number, y: number } | null>(null);
    const currentPosRef = useRef<{ x: number, y: number } | null>(null);

    // Native event listener for pointer events
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        // Handle touchstart to prevent scrolling for Apple Pencil
        const onTouchStart = (e: TouchEvent) => {
            let hasStylus = false;
            const types = [];

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                // @ts-ignore
                const type = touch.touchType;
                types.push(type);
                if (type === 'stylus' || type === 'pen') {
                    hasStylus = true;
                }
            }


            if (hasStylus) {
                e.preventDefault(); // Critical: Stop iOS scroll
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            let hasStylus = false;
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                // @ts-ignore
                const type = touch.touchType;
                if (type === 'stylus' || type === 'pen') {
                    hasStylus = true;
                }
            }

            if (hasStylus) {
                e.preventDefault();
            }
        };

        const onPointerDown = (e: PointerEvent) => {

            // Allow touch to scroll
            if (e.pointerType === 'touch') return;

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
            if (!isDrawingRef.current || activeTool !== 'pen') return;

            e.preventDefault();
            e.stopPropagation();
            try {
                (e.target as Element).releasePointerCapture(e.pointerId);
            } catch (err) {
                // Ignore if not captured
            }

            const start = startPosRef.current;
            const current = currentPosRef.current;

            if (start && current) {
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

    const handleMarkerClick = (index: number) => {
        if (activeTool === 'eraser') {
            onRemoveMarker(index);
        }
    };

    return (
        <div className="relative inline-block shadow-xl rounded-lg overflow-hidden bg-white mb-8">

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

                {markers.map((marker, index) => (
                    <rect
                        key={index}
                        x={marker.x}
                        y={marker.y}
                        width={marker.width}
                        height={marker.height}
                        fill="#FF69B4"
                        fillOpacity="1.0"
                        stroke="#C71585"
                        strokeWidth={10 * (1 / scale)}
                        filter="url(#marker-shadow)"
                        onPointerDown={(e) => {
                            if (activeTool === 'eraser') {
                                e.stopPropagation();
                                handleMarkerClick(index);
                            }
                        }}
                        style={{ cursor: activeTool === 'eraser' ? 'crosshair' : 'default' }}
                    />
                ))}

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
