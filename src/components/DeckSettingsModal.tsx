import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { db, type Deck } from '../db/db';

interface DeckSettingsModalProps {
    deck: Deck;
    onClose: () => void;
    onDelete: () => void;
}

const DeckSettingsModal: React.FC<DeckSettingsModalProps> = ({ deck, onClose, onDelete }) => {
    const [title, setTitle] = useState(deck.title);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmingDeleteDeck, setConfirmingDeleteDeck] = useState(false);

    const handleUpdateTitle = async () => {
        if (deck.id && title !== deck.title) {
            await db.decks.update(deck.id, { title, updatedAt: new Date() });
        }
    };

    const handleDeleteDeck = () => {
        setConfirmingDeleteDeck(true);
    };

    const executeDeleteDeck = async () => {
        setIsDeleting(true);
        try {
            if (deck.id) {
                await db.transaction('rw', db.decks, db.images, async () => {
                    await db.images.where('deckId').equals(deck.id!).delete();
                    await db.decks.delete(deck.id!);
                });
                onDelete();
                onClose();
            }
        } catch (error) {
            console.error("Failed to delete deck:", error);
            alert("削除に失敗しました。");
        } finally {
            setIsDeleting(false);
            setConfirmingDeleteDeck(false);
        }
    };

    // Auto-save title on blur or close is tricky, let's save on blur
    const handleTitleBlur = () => {
        handleUpdateTitle();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
                {/* Confirmation Overlay for Deck Deletion */}
                {confirmingDeleteDeck && (
                    <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">暗記セットを削除しますか？</h3>
                        <p className="text-gray-600 mb-8">この操作は取り消せません。<br />すべての画像とマーカーが削除されます。</p>
                        <div className="flex gap-4 w-full max-w-xs">
                            <button
                                onClick={() => setConfirmingDeleteDeck(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={executeDeleteDeck}
                                disabled={isDeleting}
                                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
                            >
                                {isDeleting ? '削除中...' : '削除する'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">設定</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {/* Title Edit */}
                    <section>
                        <label className="block text-sm font-bold text-gray-700 mb-2">タイトル</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </section>

                    {/* Danger Zone */}
                    <section className="pt-6 border-t border-gray-100">
                        <button
                            onClick={handleDeleteDeck}
                            disabled={isDeleting}
                            className="w-full py-3 px-4 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-medium transition-colors flex justify-center items-center"
                        >
                            <Trash2 size={20} className="mr-2" />
                            このノートを削除
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DeckSettingsModal;
