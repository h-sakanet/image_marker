import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { FolderInput, Pen, Plus, Settings, Search, X, ArrowDownUp, ArrowUpAZ, ArrowUpZA, ArrowUp01, ArrowUp10 } from 'lucide-react';
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

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [sortOption, setSortOption] = useState<'titleAsc' | 'titleDesc' | 'scoreAsc' | 'scoreDesc'>('titleAsc');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    // Filter and Sort Logic
    const filteredAndSortedDecks = React.useMemo(() => {
        if (!decks) return [];

        let result = [...decks];

        // Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(deck => deck.title.toLowerCase().includes(query));
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'titleAsc':
                    return a.title.localeCompare(b.title);
                case 'titleDesc':
                    return b.title.localeCompare(a.title);
                case 'scoreAsc': {
                    const scoreA = a.totalMarkers > 0 ? a.lockedMarkers / a.totalMarkers : 0;
                    const scoreB = b.totalMarkers > 0 ? b.lockedMarkers / b.totalMarkers : 0;
                    return scoreA - scoreB;
                }
                case 'scoreDesc': {
                    const scoreA = a.totalMarkers > 0 ? a.lockedMarkers / a.totalMarkers : 0;
                    const scoreB = b.totalMarkers > 0 ? b.lockedMarkers / b.totalMarkers : 0;
                    return scoreB - scoreA;
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [decks, searchQuery, sortOption]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 touch-pan-y" onClick={() => { setIsSortMenuOpen(false); if (!searchQuery) setIsSearchExpanded(false); }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md mb-6 transition-all py-4 px-4 -mx-4 sm:px-0 sm:mx-0 flex items-center justify-between">
                    <h1 className={`text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap transition-opacity duration-300 ${isSearchExpanded ? 'opacity-0 sm:opacity-100 hidden sm:block' : 'opacity-100'}`}>
                        暗記ノート
                    </h1>

                    <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                        {/* Expandable Search Bar */}
                        <div className={`relative flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-full sm:w-64' : 'w-10'}`} onClick={(e) => e.stopPropagation()}>
                            <div className={`absolute inset-y-0 left-0 flex items-center justify-center w-10 h-10 pointer-events-none z-10 ${isSearchExpanded ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchExpanded(true)}
                                className={`block w-full h-10 pl-10 pr-10 border-gray-200 rounded-full leading-5 bg-white placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm shadow-sm transition-all duration-300 ${isSearchExpanded ? 'opacity-100 border px-3' : 'opacity-0 w-0 border-0 p-0 pointer-events-none'}`}
                                placeholder="検索..."
                                ref={(input) => { if (isSearchExpanded && input) input.focus(); }}
                            />
                            {!isSearchExpanded && (
                                <button
                                    onClick={() => setIsSearchExpanded(true)}
                                    className="absolute inset-0 w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-all"
                                >
                                    <Search size={20} />
                                </button>
                            )}
                            {isSearchExpanded && searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Sort Button */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none transition-all ${isSortMenuOpen ? 'bg-gray-100 text-gray-700' : ''}`}
                                title="並び替え"
                            >
                                <ArrowDownUp size={20} />
                            </button>

                            {/* Sort Dropdown */}
                            {isSortMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 transform origin-top-right transition-all overflow-hidden">
                                    <div className="py-1" role="menu">
                                        <button
                                            onClick={() => { setSortOption('titleAsc'); setIsSortMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${sortOption === 'titleAsc' ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-700'}`}
                                        >
                                            <ArrowUpAZ size={18} />
                                            タイトル昇順
                                        </button>
                                        <button
                                            onClick={() => { setSortOption('titleDesc'); setIsSortMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${sortOption === 'titleDesc' ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-700'}`}
                                        >
                                            <ArrowUpZA size={18} />
                                            タイトル降順
                                        </button>
                                        <button
                                            onClick={() => { setSortOption('scoreAsc'); setIsSortMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${sortOption === 'scoreAsc' ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-700'}`}
                                        >
                                            <ArrowUp01 size={18} />
                                            スコア昇順
                                        </button>
                                        <button
                                            onClick={() => { setSortOption('scoreDesc'); setIsSortMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${sortOption === 'scoreDesc' ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-700'}`}
                                        >
                                            <ArrowUp10 size={18} />
                                            スコア降順
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Create New Deck Button (+) */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none transition-all"
                            title="新規ノート作成"
                        >
                            <Plus size={24} />
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none transition-all"
                            title="設定・バックアップ"
                        >
                            <FolderInput size={20} />
                        </button>
                    </div>
                </header>

                {/* Deck Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    {filteredAndSortedDecks.map((deck: any) => (
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
                                    <Settings size={18} />
                                </button>
                            </div>

                        </div>
                    ))}
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
