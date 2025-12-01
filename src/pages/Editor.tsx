import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Loader2, X, Trash2 } from 'lucide-react';
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
    const [confirmingDeleteImageId, setConfirmingDeleteImageId] = useState<number | null>(null);
    const [moveMenuOpenId, setMoveMenuOpenId] = useState<number | null>(null);

    // Zoom & Pan State
    // Initial scale 0.5 to fit large images better on load (since we removed max-w-full)
    const [transform, setTransform] = useState({ scale: 0.5, x: 0, y: 0 });
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
        const image = images.find(img => img.id === imageId);
        if (!image) return;

        const marker = image.markers[markerIndex];

        // Exclusive Rule: 
        // If marker is already part of a group:
        // - If it's the Parent (first in group), allow re-entering Link Mode to add/remove children.
        // - If it's a Child, prevent entering (cannot become a Parent of another group).
        if (marker.groupId) {
            const firstIndex = image.markers.findIndex(m => m.groupId === marker.groupId);
            if (firstIndex !== markerIndex) {
                // It's a child -> Prevent
                return;
            }
            // It's a parent -> Allow re-entry
        }

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

        // Undo Support: Save current state before modification
        setHistory(prev => [...prev.slice(-9), { imageId, markers: [...image.markers] }]);

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
        } else if (!targetMarker.groupId) {
            // Link (Only if target has no group)
            newMarkers[targetIndex] = { ...targetMarker, groupId };
        } else {
            // Target belongs to another group -> Ignore (Exclusive Rule)
            // Optional: Notify user "Marker belongs to another group"
        }

        await saveMarkers(imageId, newMarkers);
    };

    // Image Management Handlers
    const handleMoveImageTo = async (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const newImages = [...images];
        const [movedImage] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedImage);

        // Update order in DB
        await db.transaction('rw', db.images, async () => {
            const promises = newImages.map((img, index) => {
                return db.images.update(img.id!, { order: index });
            });
            await Promise.all(promises);
        });

        setMoveMenuOpenId(null);
    };

    const handleDeleteImage = (imageId: number) => {
        setConfirmingDeleteImageId(imageId);
    };

    const executeDeleteImage = async () => {
        if (confirmingDeleteImageId === null) return;
        await db.images.delete(confirmingDeleteImageId);
        setConfirmingDeleteImageId(null);
    };

    // Helper to check for stylus input
    const isStylus = (e: React.PointerEvent) => {
        return e.pointerType === 'pen';
    };

    // Touch Handlers for Zoom/Pan
    const getValidTouches = (touches: React.TouchList) => {
        if (!containerRef.current) return [];
        return Array.from(touches).filter(touch => {
            return containerRef.current?.contains(touch.target as Node);
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touches = getValidTouches(e.touches);

        // Check if any touch is a stylus/pen
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            // @ts-ignore
            if (touch.touchType === 'stylus' || touch.touchType === 'pen') {
                return; // Ignore stylus touches for pan/zoom
            }
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
        e.preventDefault(); // Prevent browser gestures
        const touches = getValidTouches(e.touches);

        // Check for stylus
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            // @ts-ignore
            if (touch.touchType === 'stylus' || touch.touchType === 'pen') {
                return;
            }
        }

        if (touches.length === 1 && lastTouchRef.current) {
            // Pan
            const dx = touches[0].clientX - lastTouchRef.current.x;
            const dy = touches[0].clientY - lastTouchRef.current.y;

            setTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }));

            lastTouchRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        } else if (touches.length === 2 && lastDistRef.current) {
            // Zoom
            const touch1 = touches[0];
            const touch2 = touches[1];

            const dist = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            );

            const currentLastDist = lastDistRef.current!;
            const scaleFactor = dist / currentLastDist;

            setTransform(prev => {
                const newScale = Math.min(Math.max(prev.scale * scaleFactor, 0.1), 5);

                // Calculate center of pinch
                const cx = (touch1.clientX + touch2.clientX) / 2;
                const cy = (touch1.clientY + touch2.clientY) / 2;

                // Adjust translation to zoom towards center
                // newTx = cx - (cx - oldTx) * (newScale / oldScale)
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
            // Switched from 2 fingers (zoom) to 1 finger (pan)
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
            // Fallback
            setTransform({ scale: 0.5, x: 0, y: 0 });
            return;
        }

        // Find image closest to center of viewport
        const viewportCenterY = window.innerHeight / 2;
        let closestImg = imgs[0];
        let minDiff = Infinity;

        imgs.forEach(img => {
            const rect = img.getBoundingClientRect();
            const imgCenterY = rect.top + rect.height / 2;
            const diff = Math.abs(imgCenterY - viewportCenterY);
            if (diff < minDiff) {
                minDiff = diff;
                closestImg = img;
            }
        });

        if (closestImg && closestImg.naturalWidth > 0) {
            const padding = 40; // Horizontal padding
            const availableWidth = window.innerWidth - padding;

            // Calculate scale to fit width
            const fitScale = availableWidth / closestImg.naturalWidth;

            // Calculate new positions
            // We need the image's position relative to the container (unscaled)
            const currentRect = closestImg.getBoundingClientRect();

            // offsetInContainer = (currentPos - containerPos) / currentScale
            const offsetInContainerX = (currentRect.left - transform.x) / transform.scale;
            const offsetInContainerY = (currentRect.top - transform.y) / transform.scale;

            // Target:
            // newRect.width = naturalWidth * fitScale
            // newRect.left = (windowWidth - newRect.width) / 2
            // newRect.top = 0 (Top aligned)

            // newX = targetLeft - (offsetInContainerX * fitScale)
            // newY = targetTop - (offsetInContainerY * fitScale)

            const newWidth = closestImg.naturalWidth * fitScale;
            const targetLeft = (window.innerWidth - newWidth) / 2;
            const targetTop = 0;

            const newX = targetLeft - (offsetInContainerX * fitScale);
            const newY = targetTop - (offsetInContainerY * fitScale);

            setTransform({
                scale: fitScale,
                x: newX,
                y: newY
            });
        }
    };

    // Initial Fit
    const hasInitialFit = useRef(false);
    useEffect(() => {
        if (images.length > 0 && !hasInitialFit.current) {
            // Wait for image to render and load
            const timer = setTimeout(() => {
                handleFitScreen();
                hasInitialFit.current = true;
            }, 100); // 100ms delay
            return () => clearTimeout(timer);
        }
    }, [images]);

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-100 relative">
            <Toolbar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onUndo={handleUndo}
                canUndo={history.length > 0}
                onBack={() => navigate('/')}
                disabled={linkMode.active}
                onFitScreen={handleFitScreen}
            />

            {/* Confirmation Overlay for Image Deletion */}
            {confirmingDeleteImageId !== null && (
                <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 text-center max-w-sm w-full animate-fade-in">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">画像を削除しますか？</h3>
                        <p className="text-gray-600 mb-8">この操作は取り消せません。</p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setConfirmingDeleteImageId(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={executeDeleteImage}
                                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
                            >
                                削除する
                            </button>
                        </div>
                    </div>
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
                <div className="p-20 flex flex-col items-center gap-4 min-h-screen">
                    {images.map((image, index) => (
                        <div key={image.id} className="relative w-full max-w-5xl">
                            <ImageEditor
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

                            {/* Stylus-Only Controls */}
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Delete Button (Top Right) */}
                                <div
                                    className="absolute top-2 right-2 pointer-events-auto"
                                    onPointerUp={(e) => {
                                        if (isStylus(e)) {
                                            handleDeleteImage(image.id!);
                                        }
                                    }}
                                >
                                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                                        <X size={24} />
                                    </div>
                                </div>

                                {/* Page Number & Move Menu (Top Left) */}
                                <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-auto">
                                    {/* Page Number Button */}
                                    <div
                                        className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center shadow-lg text-white font-bold text-lg opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                                        onPointerUp={(e) => {
                                            if (isStylus(e)) {
                                                setMoveMenuOpenId(moveMenuOpenId === image.id ? null : image.id!);
                                            }
                                        }}
                                    >
                                        {index + 1}
                                    </div>

                                    {/* Move Menu */}
                                    {moveMenuOpenId === image.id && (
                                        <div className="flex gap-2 overflow-x-auto max-w-[300px] bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-xl scrollbar-hide">
                                            {images.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-colors ${i === index
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-600'
                                                        }`}
                                                    onPointerUp={(e) => {
                                                        if (isStylus(e)) {
                                                            handleMoveImageTo(index, i);
                                                        }
                                                    }}
                                                >
                                                    {i + 1}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
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

export default Editor;
