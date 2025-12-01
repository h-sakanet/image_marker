import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Settings, Pen, Plus } from 'lucide-react';
import { db, type Deck } from '../db/db';
import GlobalSettingsModal from '../components/GlobalSettingsModal';

const Home: React.FC = () => {
    const decks = useLiveQuery(async () => {
        const allDecks = await db.decks.orderBy('createdAt').reverse().toArray();
        const decksWithImages = await Promise.all(allDecks.map(async (deck) => {
            const images = await db.images.where('deckId').equals(deck.id!).sortBy('order');

            // Calculate marker stats
            let totalMarkers = 0;
            let lockedMarkers = 0;

            images.forEach(img => {
                img.markers.forEach(m => {
                    if (m.groupId) {
                        // Group logic handled below
                    } else {
                        totalMarkers++;
                        if (m.isLocked) lockedMarkers++;
                    }
                });

                // Handle groups separately to count 1 per group
                const groups = new Set<string>();
                const lockedGroups = new Set<string>();

                img.markers.forEach(m => {
                    if (m.groupId) {
                        groups.add(m.groupId);
                        if (m.isLocked) {
                            lockedGroups.add(m.groupId);
                        }
                    }
                });

                totalMarkers += groups.size;
                lockedMarkers += lockedGroups.size;
            });

            return {
                ...deck,
                image: images[0]?.imageData,
                totalMarkers,
                lockedMarkers
            };
        }));
        return decksWithImages;
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingDeck, setEditingDeck] = useState<Deck | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 touch-pan-y">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="flex items-center justify-between py-6">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">暗記ノート</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-gray-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all border border-gray-200"
                            title="設定・バックアップ"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full shadow-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-primary-500/30"
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </header>

                {/* ... existing content ... */}

                {isSettingsModalOpen && (
                    <GlobalSettingsModal
                        onClose={() => setIsSettingsModalOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default Home;
