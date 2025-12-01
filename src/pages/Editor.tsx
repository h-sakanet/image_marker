import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Loader2 } from 'lucide-react';
import { db, type ImageItem, type Marker } from '../db/db';
import Toolbar, { type ToolType } from '../components/Toolbar';
import ImageEditor from '../components/ImageEditor';

interface HistoryItem {
    imageId: number;
    markers: Marker[];
}

const Editor: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const [activeTool, setActiveTool] = useState<ToolType>('pen');
    const [images, setImages] = useState<ImageItem[]>([]);

    // Zoom & Pan State
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
    const lastDistRef = useRef<number | null>(null);

    // Undo History
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Load images
    const dbImages = useLiveQuery(
        () => db.images.where('deckId').equals(Number(deckId)).sortBy('order'),
        [deckId]
    );

    useEffect(() => {
        if (dbImages) {
            setImages(dbImages);
        }
    }, [dbImages]);

    // Save marker changes to DB
    const saveMarkers = async (imageId: number, newMarkers: Marker[]) => {
        await db.images.update(imageId, { markers: newMarkers });
    };

    const handleAddMarker = async (imageId: number, marker: Marker) => {
        const image = images.find(img => img.id === imageId);
        if (!image) return;

        setHistory(prev => [...prev.slice(-9), { imageId, markers: [...image.markers] }]);

        const newMarkers = [...image.markers, marker];
        await saveMarkers(imageId, newMarkers);
    };

    const handleRemoveMarker = async (imageId: number, index: number) => {
        const image = images.find(img => img.id === imageId);
        if (!image) return;

        setHistory(prev => [...prev.slice(-9), { imageId, markers: [...image.markers] }]);

        const newMarkers = image.markers.filter((_, i) => i !== index);
        await saveMarkers(imageId, newMarkers);
    };

    const handleUndo = async () => {
        if (history.length === 0) return;

        const lastAction = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);

        await saveMarkers(lastAction.imageId, lastAction.markers);
    };

    // Touch Handlers for Zoom/Pan
    const handleTouchStart = (e: React.TouchEvent) => {
        // Check if any touch is a stylus/pen
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            // @ts-ignore
            if (touch.touchType === 'stylus' || touch.touchType === 'pen') {
                return; // Ignore stylus touches for pan/zoom
            }
        }

        if (e.touches.length === 1) {
            lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastDistRef.current = dist;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Check for stylus
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            // @ts-ignore
            if (touch.touchType === 'stylus' || touch.touchType === 'pen') {
                return;
            }
        }

        if (e.touches.length === 1 && lastTouchRef.current) {
            // Pan
            const dx = e.touches[0].clientX - lastTouchRef.current.x;
            const dy = e.touches[0].clientY - lastTouchRef.current.y;

            setTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }));

            lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2 && lastDistRef.current) {
            // Zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const dist = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            );

            const scaleFactor = dist / lastDistRef.current;
            const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.5), 5);

            // Calculate center of pinch
            const cx = (touch1.clientX + touch2.clientX) / 2;
            const cy = (touch1.clientY + touch2.clientY) / 2;

            // Adjust translation to zoom towards center
            // newTx = cx - (cx - oldTx) * (newScale / oldScale)
            const actualScaleFactor = newScale / transform.scale;

            setTransform(prev => ({
                scale: newScale,
                x: cx - (cx - prev.x) * actualScaleFactor,
                y: cy - (cy - prev.y) * actualScaleFactor
            }));

            lastDistRef.current = dist;
        }
    };

    const handleTouchEnd = () => {
        lastTouchRef.current = null;
        lastDistRef.current = null;
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-100 relative">
            <Toolbar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onUndo={handleUndo}
                canUndo={history.length > 0}
                onBack={() => navigate('/')}
            />

            {/* Zoom/Pan Container */}
            <div
                ref={containerRef}
                className="w-full h-full touch-none origin-top-left transition-transform duration-75 ease-linear"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="p-20 flex flex-col items-center gap-8 min-h-screen">
                    {images.map(image => (
                        <ImageEditor
                            key={image.id}
                            imageData={image.imageData}
                            markers={image.markers}
                            activeTool={activeTool}
                            onAddMarker={(marker) => handleAddMarker(image.id!, marker)}
                            onRemoveMarker={(index) => handleRemoveMarker(image.id!, index)}
                            scale={transform.scale}
                        />
                    ))}

                    {images.length === 0 && (
                        <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
                            <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                            <p>Loading images...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Editor;
