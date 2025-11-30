import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { House, Loader2 } from 'lucide-react';
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

    // Touch Handlers for Zoom/Pan
    const handleTouchStart = (e: React.TouchEvent) => {
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
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const scaleFactor = dist / lastDistRef.current;
            const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.5), 5);

            setTransform(prev => ({
                ...prev,
                scale: newScale
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
            {/* Back Button */}
            <div className="fixed left-6 top-6 z-50">
                <button
                    onClick={() => navigate('/')}
                    className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/50 hover:bg-white transition-all active:scale-95 text-gray-600"
                    title="Back to Home"
                >
                    <House size={24} />
                </button>
            </div>

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
                        <ImagePlayer
                            key={image.id}
                            imageData={image.imageData}
                            markers={image.markers}
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

export default Player;
