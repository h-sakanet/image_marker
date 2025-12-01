import React, { useState, useRef } from 'react';
import { Image, Loader2, FileText } from 'lucide-react';
import { db } from '../db/db';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);

            // Auto-fill title if empty
            if (!title) {
                const firstFile = selectedFiles[0];
                const name = firstFile.name.replace(/\.[^/.]+$/, "");
                setTitle(name);
            }
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const processPdf = async (file: File): Promise<string[]> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 3.0 }); // Higher quality scale
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                images.push(canvas.toDataURL('image/jpeg', 0.95));
            }
        }
        return images;
    };

    const processFile = async (file: File): Promise<string[]> => {
        if (file.type === 'application/pdf') {
            return processPdf(file);
        } else {
            const base64 = await fileToBase64(file);
            return [base64];
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || files.length === 0) return;

        setIsSaving(true);
        try {
            // Process all files (Images & PDFs)
            // Use for...of loop to ensure sequential processing if needed, 
            // but Promise.all is fine as long as we map correctly.
            // Actually, Promise.all preserves order of the array.
            const processedFiles = await Promise.all(files.map(processFile));
            const allImages = processedFiles.flat();

            await db.transaction('rw', db.decks, db.images, async () => {
                const deckId = await db.decks.add({
                    title,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                const imagePromises = allImages.map((base64, index) => ({
                    deckId,
                    imageData: base64,
                    order: index,
                    markers: []
                }));

                await db.images.bulkAdd(imagePromises);
            });

            onCreated();
            onClose();
            setTitle('');
            setFiles([]);
        } catch (error) {
            console.error('Failed to create deck:', error);
            alert('Failed to create deck. Please try again.');
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
                    {/* File Input (Moved to Top) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ファイル (画像 / PDF)</label>
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${files.length > 0 ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {files.length > 0 ? (
                                <div className="text-primary-700">
                                    <div className="flex overflow-x-auto gap-2 mb-3 pb-2 snap-x">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex-shrink-0 relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 snap-start flex items-center justify-center">
                                                {file.type === 'application/pdf' ? (
                                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                                        <FileText size={32} />
                                                        <span className="text-xs mt-1 px-1 truncate w-full text-center">{file.name}</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`preview-${index}`}
                                                        className="w-full h-full object-cover"
                                                        onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="font-semibold text-lg">{files.length} ファイルを選択中</span>
                                    <p className="text-sm mt-1 opacity-75">タップして変更</p>
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <Image className="mx-auto h-10 w-10 mb-3 text-gray-400" />
                                    <span className="font-medium text-base">クリックしてファイルを選択</span>
                                    <p className="text-xs mt-1 text-gray-400">PNG, JPG, PDF</p>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            accept="image/png, image/jpeg, application/pdf"
                            className="hidden"
                        />
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">タイトル</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border bg-gray-50 focus:bg-white transition-colors"
                            required
                            placeholder="ファイルを選択すると自動入力されます"
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
