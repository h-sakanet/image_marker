import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { FolderInput, Pen, Plus } from 'lucide-react';
import { db, type Deck } from '../db/db';
import GlobalSettingsModal from '../components/GlobalSettingsModal';
import DeckCreateModal from '../components/DeckCreateModal';
import DeckSettingsModal from '../components/DeckSettingsModal';

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
                            <FolderInput size={20} />
                        </button>
                    </div>
                </header>

                {/* Deck Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks?.map((deck: any) => (
                        <div key={deck.id} className="group relative aspect-video bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">

                            {/* Main Click Area (Play) */}
                            <Link to={`/deck/${deck.id}/play`} className="absolute inset-0 z-0">
                                {deck.image ? (
                                    <img
                                        src={typeof deck.image === 'string' ? deck.image : ''}
                                        alt={deck.title}
                                        className="w-full h-full object-cover object-top bg-white"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50">
                                        <span className="text-sm">No Image</span>
                                    </div>
                                )}
                                {/* White Overlay for Visibility */}
                                <div className="absolute inset-0 bg-white/30 pointer-events-none" />
                                {/* Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 pointer-events-none" />
                            </Link>

                            {/* Title & Stats (Bottom Left) */}
                            <div className="absolute bottom-4 left-4 z-10 pointer-events-none pr-16">
                                <h3 className="text-lg font-bold text-white drop-shadow-md truncate leading-tight">
                                    {deck.title}
                                </h3>
                                <div className="mt-1 flex items-center text-white/90 text-sm font-medium drop-shadow-md">
                                    <span>
                                        {deck.totalMarkers > 0 ? Math.round((deck.lockedMarkers / deck.totalMarkers) * 100) : 0}% ({deck.lockedMarkers}/{deck.totalMarkers})
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons (Top Right) */}
                            <div className="absolute top-3 right-3 z-20 flex gap-2">
                                {/* Edit Button */}
                                <Link
                                    to={`/deck/${deck.id}/edit`}
                                    className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                                    title="編集"
                                >
                                    <Pen size={18} />
                                </Link>

                                {/* Settings Button */}
                                <button
                                    onClick={() => setEditingDeck(deck)}
                                    className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                                    title="設定"
                                >
                                    <FolderInput size={18} />
                                </button>
                            </div>

                        </div>
                    ))}

                    {/* Create New Deck Card */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="group relative aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 flex flex-col items-center justify-center gap-3"
                    >
                        <div className="w-14 h-14 rounded-full bg-gray-200 group-hover:bg-primary-200 flex items-center justify-center transition-colors">
                            <Plus size={28} className="text-gray-500 group-hover:text-primary-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-500 group-hover:text-primary-700">新規ノート作成</span>
                    </button>
                </div>

                {isCreateModalOpen && (
                    <DeckCreateModal
                        onClose={() => setIsCreateModalOpen(false)}
                        onCreated={() => { }}
                    />
                )}

                {
                    editingDeck && (
                        <DeckSettingsModal
                            deck={editingDeck}
                            onClose={() => setEditingDeck(null)}
                            onDelete={() => setEditingDeck(null)}
                        />
                    )
                }

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
