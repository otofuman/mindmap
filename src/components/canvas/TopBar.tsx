import React, { useState, useRef } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface TopBarProps {
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onExportJSON, onImportJSON }) => {
  const mapDocument = useMindMapStore((state) => state.document);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleClick = () => {
    const currentTitle = mapDocument.meta.title || 'マインドマップ';
    const newTitle = window.prompt('マインドマップ名を入力:', currentTitle);
    if (newTitle !== null) {
      useMindMapStore.setState((state) => ({
        document: {
          ...state.document,
          meta: { ...state.document.meta, title: newTitle.trim() || 'マインドマップ' }
        }
      }));
    }
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-50 pointer-events-none max-w-xl mx-auto">
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 pointer-events-auto relative">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="px-2 py-1 hover:bg-gray-100 rounded-lg text-gray-700 transition shrink-0 font-medium text-xs"
          >
            ≡
          </button>
          <span
            onClick={handleTitleClick}
            className="font-medium text-gray-800 text-xs md:text-sm truncate cursor-pointer hover:text-blue-600 transition"
            title="クリックして名前を変更"
          >
            {mapDocument.meta.title || 'マインドマップ'}
          </span>
        </div>

        <div className="hidden md:flex gap-1.5">
          <button
            onClick={onExportJSON}
            className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-medium shadow-2xs"
          >
            保存
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-medium shadow-2xs"
          >
            開く
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute left-0 top-12 bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 min-w-[140px] z-[100] pointer-events-auto">
            <button
              onClick={() => {
                onExportJSON();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              保存
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              開く
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={onImportJSON}
        className="hidden"
      />
    </div>
  );
};