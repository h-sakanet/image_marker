import React from 'react';
import { House, Pen, Eraser, Undo2, Maximize } from 'lucide-react';

export type ToolType = 'pen' | 'eraser';

interface ToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onUndo: () => void;
    canUndo: boolean;
    onBack: () => void;
    disabled?: boolean;
    onFitScreen?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    activeTool,
    onToolChange,
    onUndo,
    canUndo,
    onBack,
    disabled,
    onFitScreen
}) => {
    return (
        <div className={`fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 transition-opacity duration-200 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Home */}
            <button
                onClick={onBack}
                className="pointer-events-auto p-3 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center w-12 h-12"
                title="ホームに戻る"
            >
                <House size={24} />
            </button>

            {/* Spacer */}
            <div className="h-4" />

            {/* Tools Group */}
            {onFitScreen && (
                <button
                    onClick={onFitScreen}
                    className="pointer-events-auto p-3 rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center w-12 h-12"
                    title="画面に合わせる"
                >
                    <Maximize size={24} />
                </button>
            )}

            <button
                onClick={() => onToolChange('pen')}
                className={`pointer-events-auto p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center w-12 h-12 ${activeTool === 'pen' ? 'bg-primary-600 text-white ring-2 ring-primary-300' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="ペン"
            >
                <Pen size={24} />
            </button>

            <button
                onClick={() => onToolChange('eraser')}
                className={`pointer-events-auto p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center w-12 h-12 ${activeTool === 'eraser' ? 'bg-primary-600 text-white ring-2 ring-primary-300' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="消しゴム"
            >
                <Eraser size={24} />
            </button>

            {/* Spacer */}
            <div className="h-4" />

            {/* Undo */}
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`pointer-events-auto p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center w-12 h-12 ${!canUndo ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="元に戻す"
            >
                <Undo2 size={24} />
            </button>
        </div>
    );
};

export default Toolbar;
