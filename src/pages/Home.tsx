import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Settings, Pen, Plus } from 'lucide-react';
import { db, type Deck } from '../db/db';
import DeckCreateModal from '../components/DeckCreateModal';
import DeckSettingsModal from '../components/DeckSettingsModal';

const Home: React.FC = () => {
    const decks = useLiveQuery(async () => {
        const allDecks = await db.decks.orderBy('createdAt').reverse().toArray();
        const decksWithImages = await Promise.all(allDecks.map(async (deck) => {
            const firstImage = await db.images.where('deckId').equals(deck.id!).first();
            return { ...deck, image: firstImage?.imageData };
        }));
        return decksWithImages;
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDeck, setEditingDeck] = useState<Deck | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 touch-pan-y">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="flex items-center justify-between py-6">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">暗記ノート</h1>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full shadow-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-primary-500/30"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </header>

                {/* Empty State */}
                {decks?.length === 0 && (
                    <div className="text-center py-32">
                        <div className="mx-auto h-24 w-24 text-gray-300 mb-4 flex items-center justify-center">
                            <Plus size={64} strokeWidth={1} />
                        </div>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">暗記ノートを作成しましょう</h3>
                        <div className="mt-6">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                作成する
                            </button>
                        </div>
                    </div>
                )}

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
                                        className="w-full h-full object-cover bg-white"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50">
                                        <span className="text-sm">No Image</span>
                                    </div>
                                )}
                                {/* Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/30 opacity-60 pointer-events-none" />
                            </Link>

                            {/* Title (Top Left) */}
                            <div className="absolute top-3 left-4 z-10 pointer-events-none">
                                <h3 className="text-lg font-bold text-gray-900 [-webkit-text-stroke:3px_rgba(255,255,255,0.8)] [paint-order:stroke_fill] truncate max-w-[200px] leading-tight">
                                    {deck.title}
                                </h3>
                            </div>

                            {/* Right Action Bar */}
                            <div className="absolute top-0 right-0 bottom-0 w-14 flex flex-col items-center justify-center gap-4 z-20">

                                {/* Edit Button */}
                                <Link
                                    to={`/deck/${deck.id}/edit`}
                                    className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm transition-all active:scale-95"
                                    title="編集"
                                >
                                    <Pen size={20} />
                                </Link>

                                {/* Settings Button */}
                                <button
                                    onClick={() => setEditingDeck(deck)}
                                    className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm transition-all active:scale-95"
                                    title="設定"
                                >
                                    <Settings size={20} />
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {isCreateModalOpen && (
                <DeckCreateModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={() => { }}
                />
            )}

            {editingDeck && (
                <DeckSettingsModal
                    deck={editingDeck}
                    onClose={() => setEditingDeck(null)}
                    onDelete={() => setEditingDeck(null)}
                />
            )}
        </div>
    );
};

export default Home;
