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
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
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

    const getSvgCoordinates = (e: React.PointerEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };

        return {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d
        };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (activeTool === 'pen') {
            e.preventDefault();
            e.stopPropagation();
            (e.target as Element).setPointerCapture(e.pointerId);

            const pos = getSvgCoordinates(e);
            setIsDrawing(true);
            setStartPos(pos);
            setCurrentPos(pos);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing || activeTool !== 'pen') return;

        e.preventDefault();
        e.stopPropagation();

        const pos = getSvgCoordinates(e);
        setCurrentPos(pos);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing || activeTool !== 'pen') return;

        e.preventDefault();
        e.stopPropagation();
        (e.target as Element).releasePointerCapture(e.pointerId);

        if (startPos && currentPos) {
            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const width = Math.abs(currentPos.x - startPos.x);
            const height = Math.abs(currentPos.y - startPos.y);

            if (width > 5 && height > 5) {
                onAddMarker({ x, y, width, height });
            }
        }

        setIsDrawing(false);
        setStartPos(null);
        setCurrentPos(null);
    };

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
            />

            <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full touch-none"
                viewBox={imgRef.current ? `0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}` : undefined}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {markers.map((marker, index) => (
                    <rect
                        key={index}
                        x={marker.x}
                        y={marker.y}
                        width={marker.width}
                        height={marker.height}
                        fill="#FF69B4"
                        fillOpacity="1.0"
                        stroke="none"
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
                        stroke="#FF69B4"
                        strokeWidth={2 * (1 / scale)}
                        strokeDasharray="4"
                    />
                )}
            </svg>
        </div>
    );
};

export default ImageEditor;
