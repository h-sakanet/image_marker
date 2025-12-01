import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { House, Loader2, Maximize, MoveUp, MoveDown, Pen } from 'lucide-react';
import { db, type ImageItem } from '../db/db';
import ImagePlayer from '../components/ImagePlayer';

const Player: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const [images, setImages] = useState<ImageItem[]>([]);

    // Zoom & Pan State
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
    const lastDistRef = useRef<number | null>(null);

    const dbImages = useLiveQuery(
        () => db.images.where('deckId').equals(Number(deckId)).sortBy('order'),
        [deckId]
    );

    useEffect(() => {
        if (dbImages) {
            setImages(dbImages);
        }
    }, [dbImages]);

    // Touch Handlers for Zoom/Pan (Same as Editor)
    const getValidTouches = (touches: React.TouchList) => {
        if (!containerRef.current) return [];
        return Array.from(touches).filter(touch => {
            return containerRef.current?.contains(touch.target as Node);
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touches = getValidTouches(e.touches);
        // Ignore stylus for pan/zoom
        for (let i = 0; i < touches.length; i++) {
            // @ts-ignore
            if (touches[i].touchType === 'stylus' || touches[i].touchType === 'pen') return;
        }

        if (touches.length === 1) {
            lastTouchRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        } else if (touches.length === 2) {
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            lastDistRef.current = dist;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        const touches = getValidTouches(e.touches);
        // Ignore stylus
        for (let i = 0; i < touches.length; i++) {
            // @ts-ignore
            if (touches[i].touchType === 'stylus' || touches[i].touchType === 'pen') return;
        }

        if (touches.length === 1 && lastTouchRef.current) {
            // Pan
            const dx = touches[0].clientX - lastTouchRef.current.x;
            const dy = touches[0].clientY - lastTouchRef.current.y;
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            lastTouchRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        } else if (touches.length === 2 && lastDistRef.current) {
            // Zoom
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            const scaleFactor = dist / lastDistRef.current;
            setTransform(prev => {
                const newScale = Math.min(Math.max(prev.scale * scaleFactor, 0.1), 5);
                const cx = (touches[0].clientX + touches[1].clientX) / 2;
                const cy = (touches[0].clientY + touches[1].clientY) / 2;
                const actualScaleFactor = newScale / prev.scale;
                return {
                    scale: newScale,
                    x: cx - (cx - prev.x) * actualScaleFactor,
                    y: cy - (cy - prev.y) * actualScaleFactor
                };
            });
            lastDistRef.current = dist;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touches = getValidTouches(e.touches);
        if (touches.length === 0) {
            lastTouchRef.current = null;
            lastDistRef.current = null;
        } else if (touches.length === 1) {
            lastTouchRef.current = { x: touches[0].clientX, y: touches[0].clientY };
            lastDistRef.current = null;
        } else {
            lastDistRef.current = null;
        }
    };

    const handleFitScreen = () => {
        if (!containerRef.current) return;
        const imgs = Array.from(containerRef.current.querySelectorAll('img'));
        if (imgs.length === 0) {
            setTransform({ scale: 0.5, x: 0, y: 0 });
            return;
        }
        // Find image closest to center
        const viewportCenterY = window.innerHeight / 2;
        let closestImg = imgs[0];
        let minDiff = Infinity;
        imgs.forEach(img => {
            const rect = img.getBoundingClientRect();
            const diff = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
            if (diff < minDiff) { minDiff = diff; closestImg = img; }
        });

        if (closestImg && closestImg.naturalWidth > 0) {
            const padding = 40;
            const fitScale = (window.innerWidth - padding) / closestImg.naturalWidth;
            const currentRect = closestImg.getBoundingClientRect();
            const offsetInContainerX = (currentRect.left - transform.x) / transform.scale;
            const offsetInContainerY = (currentRect.top - transform.y) / transform.scale;

            const newX = ((window.innerWidth - closestImg.naturalWidth * fitScale) / 2) - (offsetInContainerX * fitScale);
            const newY = 0 - (offsetInContainerY * fitScale);

            setTransform({ scale: fitScale, x: newX, y: newY });
        }
    };

    // Initial Fit
    const hasInitialFit = useRef(false);
    useEffect(() => {
        if (images.length > 0 && !hasInitialFit.current) {
            const timer = setTimeout(() => {
                handleFitScreen();
                hasInitialFit.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [images]);

    // Navigation Logic
    const scrollToMarker = (markerIndex: number, imageIndex: number) => {
        // Find the marker element
        // Since we map over images, we need a way to find the specific marker.
        // We can use IDs or refs. Let's assume ImagePlayer assigns IDs like `marker-${index}` 
        // BUT indices are local to ImagePlayer.
        // We need to find the specific ImagePlayer instance first?
        // Actually, we can just calculate position if we know image position.
        // But `ImagePlayer` renders the SVG.

        // Let's use DOM query for simplicity: find all markers across all images?
        // No, IDs in ImagePlayer are `marker-${index}` which is not unique across images.
        // We need unique IDs. Let's update ImagePlayer to use `marker-${imageId}-${index}`.

        const markerId = `marker-${images[imageIndex].id}-${markerIndex}`;
        const markerEl = document.getElementById(markerId);

        if (markerEl && containerRef.current) {
            const rect = markerEl.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            // We want to center this marker on screen
            const viewportCenterX = window.innerWidth / 2;
            const viewportCenterY = window.innerHeight / 2;

            // Current position relative to viewport
            const currentX = rect.left + rect.width / 2;
            const currentY = rect.top + rect.height / 2;

            // Difference needed
            const dx = viewportCenterX - currentX;
            const dy = viewportCenterY - currentY;

            setTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }));
        }
    };

    // Flatten all markers for navigation
    // We only want "Parent" markers (no groupId or first of group)
    const getAllNavigableMarkers = () => {
        const navMarkers: { imageIndex: number, markerIndex: number }[] = [];
        images.forEach((img, imgIdx) => {
            img.markers.forEach((m, mIdx) => {
                // Skip if it is a child (has groupId and is not the first one we've seen? 
                // Actually, simpler: check if it's a child based on our logic: 
                // In ImagePlayer we derived isChild. Here we need same logic.
                // "Link destination marker is out of target"

                // If it has groupId, we need to check if it's the parent.
                // Parent is the first marker with that groupId in the list.
                let isNavigable = true;
                if (m.groupId) {
                    const parentIdx = img.markers.findIndex(gm => gm.groupId === m.groupId);
                    if (parentIdx !== mIdx) isNavigable = false; // It's a child
                }

                if (isNavigable) {
                    navMarkers.push({ imageIndex: imgIdx, markerIndex: mIdx });
                }
            });
        });
        return navMarkers;
    };

    const [currentNavIndex, setCurrentNavIndex] = useState(-1);

    const handleNextMarker = () => {
        const navMarkers = getAllNavigableMarkers();
        if (navMarkers.length === 0) return;

        const nextIndex = currentNavIndex + 1;
        if (nextIndex < navMarkers.length) {
            setCurrentNavIndex(nextIndex);
            const target = navMarkers[nextIndex];
            scrollToMarker(target.markerIndex, target.imageIndex);
        }
    };

    const handlePrevMarker = () => {
        const navMarkers = getAllNavigableMarkers();
        if (navMarkers.length === 0) return;

        const prevIndex = currentNavIndex - 1;
        if (prevIndex >= 0) {
            setCurrentNavIndex(prevIndex);
            const target = navMarkers[prevIndex];
            scrollToMarker(target.markerIndex, target.imageIndex);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-100 relative">
            {/* Toolbar */}
            <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
                {/* Home */}
                <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto p-2 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                    title="ホームに戻る"
                >
                    <House size={20} />
                </button>

                <div className="h-4" />

                {/* Fullscreen */}
                <button
                    onClick={handleFitScreen}
                    className="pointer-events-auto p-2 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                    title="画面に合わせる"
                >
                    <Maximize size={20} />
                </button>

                {/* Move Up (Prev) */}
                <button
                    onClick={handlePrevMarker}
                    className="pointer-events-auto p-2 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                    title="前のマーカー"
                >
                    <MoveUp size={20} />
                </button>

                {/* Move Down (Next) */}
                <button
                    onClick={handleNextMarker}
                    className="pointer-events-auto p-2 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                    title="次のマーカー"
                >
                    <MoveDown size={20} />
                </button>

                {/* Edit */}
                <button
                    onClick={() => navigate(`/deck/${deckId}/edit`, { state: { transform } })}
                    className="pointer-events-auto p-2 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                    title="編集"
                >
                    <Pen size={20} />
                </button>
            </div>

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
                <div className="p-20 flex flex-col items-center gap-8 min-h-screen">
                    {images.map((image, index) => (
                        <div key={image.id} className="relative w-fit">
                            <ImagePlayer
                                imageId={image.id!}
                                imageData={image.imageData}
                                markers={image.markers}
                                onMarkerUpdate={() => {
                                    // Refresh logic if needed, but useLiveQuery handles it mostly?
                                    // Actually useLiveQuery updates `dbImages` when DB changes.
                                    // So `images` state will update automatically via useEffect.
                                }}
                            />
                        </div>
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

export default Player;
