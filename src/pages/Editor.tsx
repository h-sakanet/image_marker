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

    // Link Mode State
    const [linkMode, setLinkMode] = useState<{ active: boolean, parentMarkerIndex: number | null, imageId: number | null }>({
        active: false,
        parentMarkerIndex: null,
        imageId: null
    });

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

        const targetMarker = image.markers[index];
        setHistory(prev => [...prev.slice(-9), { imageId, markers: [...image.markers] }]);

        let newMarkers: Marker[];
        if (targetMarker.groupId) {
            // Remove all markers in the same group
            newMarkers = image.markers.filter(m => m.groupId !== targetMarker.groupId);
        } else {
            newMarkers = image.markers.filter((_, i) => i !== index);
        }

        await saveMarkers(imageId, newMarkers);
    };

    const handleUndo = async () => {
        if (history.length === 0) return;

        const lastAction = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);

        await saveMarkers(lastAction.imageId, lastAction.markers);
    };

    // Link Mode Handlers
    const handleEnterLinkMode = (imageId: number, markerIndex: number) => {
        setLinkMode({
            active: true,
            parentMarkerIndex: markerIndex,
            imageId: imageId
        });
    };

    const handleExitLinkMode = () => {
        setLinkMode({
            active: false,
            parentMarkerIndex: null,
            imageId: null
        });
    };

    const handleLinkMarker = async (imageId: number, targetIndex: number) => {
        if (!linkMode.active || linkMode.imageId !== imageId) return;

        const image = images.find(img => img.id === imageId);
        if (!image) return;

        const parentIndex = linkMode.parentMarkerIndex!;
        if (parentIndex === targetIndex) {
            handleExitLinkMode();
            return;
        }

        const newMarkers = [...image.markers];
        const parentMarker = newMarkers[parentIndex];
        const targetMarker = newMarkers[targetIndex];

        // Ensure parent has a groupId
        let groupId = parentMarker.groupId;
        if (!groupId) {
            groupId = crypto.randomUUID();
            newMarkers[parentIndex] = { ...parentMarker, groupId };
        }

        // Toggle target marker's groupId
        if (targetMarker.groupId === groupId) {
            // Unlink
            const { groupId: _, ...rest } = targetMarker;
            newMarkers[targetIndex] = rest;

            // If parent is the only one left, remove its groupId too (optional cleanup)
            const othersInGroup = newMarkers.filter((m, i) => i !== parentIndex && m.groupId === groupId);
            if (othersInGroup.length === 0) {
                const { groupId: _, ...restParent } = newMarkers[parentIndex];
                newMarkers[parentIndex] = restParent;
            }
        } else {
            // Link
            newMarkers[targetIndex] = { ...targetMarker, groupId };
        }

        await saveMarkers(imageId, newMarkers);
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

            {/* Link Mode Banner */}
            {linkMode.active && (
                <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 text-center z-50 shadow-lg flex justify-between items-center px-8">
                    <span className="font-bold">Link Mode: Touch markers to link/unlink</span>
                    <button
                        onClick={handleExitLinkMode}
                        className="bg-white text-blue-600 px-4 py-1 rounded-full text-sm font-bold"
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Zoom/Pan Container */}
            <div
                ref={containerRef}
                className="w-full h-full touch-none origin-top-left will-change-transform"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="p-20 flex flex-col items-center gap-2 min-h-screen">
                    {images.map(image => (
                        <ImageEditor
                            key={image.id}
                            imageId={image.id!}
                            imageData={image.imageData}
                            markers={image.markers}
                            activeTool={activeTool}
                            onAddMarker={(marker) => handleAddMarker(image.id!, marker)}
                            onRemoveMarker={(index) => handleRemoveMarker(image.id!, index)}
                            scale={transform.scale}
                            linkMode={linkMode.imageId === image.id ? linkMode : undefined}
                            onEnterLinkMode={(index) => handleEnterLinkMode(image.id!, index)}
                            onLinkMarker={(index) => handleLinkMarker(image.id!, index)}
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
