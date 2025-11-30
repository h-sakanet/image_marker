import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Plus, Trash2 } from 'lucide-react';
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
    const [confirmingDeleteImageId, setConfirmingDeleteImageId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const images = useLiveQuery(
        () => db.images.where('deckId').equals(deck.id!).sortBy('order'),
        [deck.id]
    );

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

    const handleDeleteImage = (imageId: number) => {
        setConfirmingDeleteImageId(imageId);
    };

    const executeDeleteImage = async () => {
        if (confirmingDeleteImageId === null) return;
        await db.images.delete(confirmingDeleteImageId);
        setConfirmingDeleteImageId(null);
    };

    const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && deck.id) {
            const files = Array.from(e.target.files);
            const currentCount = images?.length || 0;

            const promises = files.map((file, index) => {
                return db.images.add({
                    deckId: deck.id!,
                    imageData: file,
                    order: currentCount + index,
                    markers: []
                });
            });

            await Promise.all(promises);
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

                {/* Confirmation Overlay for Image Deletion */}
                {confirmingDeleteImageId !== null && (
                    <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">画像を削除しますか？</h3>
                        <p className="text-gray-600 mb-8">この操作は取り消せません。</p>
                        <div className="flex gap-4 w-full max-w-xs">
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

                    {/* Image Management */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-bold text-gray-700">画像一覧</label>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center"
                            >
                                <Plus size={16} className="mr-1" />
                                画像を追加
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAddImages}
                                multiple
                                accept="image/png, image/jpeg"
                                className="hidden"
                            />
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {images?.map((img) => (
                                <div key={img.id} className="relative aspect-square group rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                    <ImageThumbnail imageData={img.imageData} />
                                    <button
                                        onClick={() => handleDeleteImage(img.id!)}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="pt-6 border-t border-gray-100">
                        <button
                            onClick={handleDeleteDeck}
                            disabled={isDeleting}
                            className="w-full py-3 px-4 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-medium transition-colors flex justify-center items-center"
                        >
                            <Trash2 size={20} className="mr-2" />
                            この暗記セットを削除
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};

// Helper component to render blob/string images
const ImageThumbnail: React.FC<{ imageData: Blob | string }> = ({ imageData }) => {
    const [url, setUrl] = useState<string>('');

    useEffect(() => {
        if (imageData instanceof Blob) {
            const newUrl = URL.createObjectURL(imageData);
            setUrl(newUrl);
            return () => URL.revokeObjectURL(newUrl);
        } else {
            setUrl(imageData);
        }
    }, [imageData]);

    return (
        <img
            src={url}
            alt="Thumbnail"
            className="w-full h-full object-cover bg-white"
        />
    );
};

export default DeckSettingsModal;
