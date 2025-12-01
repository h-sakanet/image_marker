import React, { useState, useRef } from 'react';
import { Download, Upload, X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, type ImageItem } from '../db/db';

interface GlobalSettingsModalProps {
    onClose: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ onClose }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Export Logic ---
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const dataFolder = zip.folder("data");
            const imagesFolder = zip.folder("images");

            // 1. Fetch Data
            const decks = await db.decks.toArray();
            const images = await db.images.toArray();

            // 2. Create JSON Data (excluding huge image blobs from JSON to keep it light)
            const exportData = {
                version: 1,
                timestamp: new Date().toISOString(),
                decks,
                images: images.map(img => ({
                    ...img,
                    imageData: null // We'll store images separately
                }))
            };

            if (dataFolder) {
                dataFolder.file("data.json", JSON.stringify(exportData, null, 2));
            }

            // 3. Add Images to ZIP
            if (imagesFolder) {
                for (const img of images) {
                    if (img.imageData instanceof Blob) {
                        imagesFolder.file(`${img.id}.png`, img.imageData);
                    } else if (typeof img.imageData === 'string' && img.imageData.startsWith('data:')) {
                        // Convert Base64 to Blob
                        const response = await fetch(img.imageData);
                        const blob = await response.blob();
                        imagesFolder.file(`${img.id}.png`, blob);
                    }
                }
            }

            // 4. Generate ZIP
            const content = await zip.generateAsync({ type: "blob" });

            // 5. Save File
            const now = new Date();
            const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
            const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
            const filename = `anki-note_backup_${yyyymmdd}_${hhmmss}.zip`;

            saveAs(content, filename);

        } catch (error) {
            console.error("Export failed:", error);
            alert("バックアップの作成に失敗しました。");
        } finally {
            setIsExporting(false);
        }
    };

    // --- Import Logic ---
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportStatus('idle');
        setErrorMessage('');

        try {
            const zip = await JSZip.loadAsync(file);
            const dataFile = zip.file("data/data.json");

            if (!dataFile) {
                throw new Error("Invalid backup file: data.json not found.");
            }

            const jsonStr = await dataFile.async("string");
            const data = JSON.parse(jsonStr);

            if (!data.decks || !data.images) {
                throw new Error("Invalid backup data format.");
            }

            // Restore Data
            await db.transaction('rw', db.decks, db.images, async () => {
                // Option: Clear existing data? For now, let's Merge/Overwrite based on ID.
                // Or maybe safer to clear all for a "Restore" operation?
                // User requirement: "Import from new device". Usually implies full restore.
                // Let's clear for simplicity and consistency with "Migration".

                // Wait, clearing might be dangerous if user clicks wrong button.
                // But "Migration" usually means "Replace".
                // Let's clear.
                await db.decks.clear();
                await db.images.clear();

                // Restore Decks
                await db.decks.bulkAdd(data.decks);

                // Restore Images
                const imagesToRestore: ImageItem[] = [];
                for (const imgMeta of data.images) {
                    const imgFile = zip.file(`images/${imgMeta.id}.png`);
                    let blob: Blob | null = null;

                    if (imgFile) {
                        blob = await imgFile.async("blob");
                    }

                    if (blob) {
                        imagesToRestore.push({
                            ...imgMeta,
                            imageData: blob
                        });
                    }
                }
                await db.images.bulkAdd(imagesToRestore);
            });

            setImportStatus('success');
            setTimeout(() => {
                onClose();
                window.location.reload(); // Reload to reflect changes
            }, 2000);

        } catch (error: any) {
            console.error("Import failed:", error);
            setImportStatus('error');
            setErrorMessage(error.message || "復元に失敗しました。");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">設定</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Backup Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Download size={18} className="text-primary-600" />
                            バックアップ（エクスポート）
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            現在のすべてのデータをZIPファイルとして保存します。<br />
                            機種変更時などに利用してください。
                        </p>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-50 text-primary-700 font-bold rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-50"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    作成中...
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    バックアップを作成
                                </>
                            )}
                        </button>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Restore Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Upload size={18} className="text-orange-600" />
                            復元（インポート）
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            バックアップファイル（ZIP）からデータを復元します。<br />
                            <span className="text-red-500 font-bold">※現在のデータはすべて上書きされます。</span>
                        </p>

                        <input
                            type="file"
                            accept=".zip"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-50 text-orange-700 font-bold rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-50"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    復元中...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    ファイルを読み込む
                                </>
                            )}
                        </button>

                        {importStatus === 'success' && (
                            <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 p-3 rounded-lg animate-fade-in">
                                <CheckCircle size={18} />
                                復元が完了しました。再読み込みします...
                            </div>
                        )}

                        {importStatus === 'error' && (
                            <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg animate-fade-in">
                                <AlertTriangle size={18} />
                                {errorMessage}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsModal;
