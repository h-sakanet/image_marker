import React, { useState, useRef } from 'react';
import { Image, Loader2 } from 'lucide-react';
import { db } from '../db/db';

interface DeckCreateModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const DeckCreateModal: React.FC<DeckCreateModalProps> = ({ onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || files.length === 0) return;

        setIsSaving(true);
        try {
            const deckId = await db.decks.add({
                title,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const imagePromises = files.map(async (file, index) => {
                return db.images.add({
                    deckId: Number(deckId),
                    imageData: file,
                    order: index,
                    markers: []
                });
            });

            await Promise.all(imagePromises);

            onCreated();
            onClose();
        } catch (error) {
            console.error("Failed to save deck:", error);
            alert("Failed to save deck. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in transform transition-all">
                <div className="px-6 py-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">新しいノートを作る</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">タイトル</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border bg-gray-50 focus:bg-white transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">画像</label>
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${files.length > 0 ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {files.length > 0 ? (
                                <div className="text-primary-700">
                                    <div className="flex overflow-x-auto gap-2 mb-3 pb-2 snap-x">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex-shrink-0 relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 snap-start">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`preview-${index}`}
                                                    className="w-full h-full object-cover"
                                                    onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="font-semibold text-lg">{files.length} 枚の画像を選択中</span>
                                    <p className="text-sm mt-1 opacity-75">タップして変更</p>
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <Image className="mx-auto h-10 w-10 mb-3 text-gray-400" />
                                    <span className="font-medium text-base">クリックして画像をアップロード</span>
                                    <p className="text-xs mt-1 text-gray-400">PNG, JPG</p>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            accept="image/png, image/jpeg"
                            className="hidden"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !title || files.length === 0}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSaving ? (
                                <span className="flex items-center">
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                    保存中...
                                </span>
                            ) : '作成'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeckCreateModal;
