import React, { useState, useRef, useEffect } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

export const AutoLayoutMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const autoLayout = useMindMapStore((state) => state.autoLayout);
  const customLists = useMindMapStore((state) => state.document.customLists || []);

  // メニュー外クリックで閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (mode: string) => {
    autoLayout(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 shadow-2xs transition cursor-pointer"
        title="自動整列・レイアウト"
      >
        <span>📐 整列</span>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-[9999] text-xs text-gray-700 focus:outline-none">
          <div className="px-3 py-1.5 font-bold text-gray-400 uppercase tracking-wider text-[10px]">基本レイアウト</div>
          
          <button
            type="button"
            onClick={() => handleSelect('auto')}
            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition cursor-pointer"
          >
            <span>✨</span>
            <div>
              <div className="font-medium">自動最適化</div>
              <div className="text-[10px] text-gray-400">ノード密度を考慮した最適配置</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect('flow-top')}
            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition cursor-pointer"
          >
            <span>⬇️</span>
            <div>
              <div className="font-medium">フロー（上から）</div>
              <div className="text-[10px] text-gray-400">上下方向の流れを優先</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect('flow-left')}
            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition cursor-pointer"
          >
            <span>➡️</span>
            <div>
              <div className="font-medium">フロー（左から）</div>
              <div className="text-[10px] text-gray-400">左右方向の流れを優先</div>
            </div>
          </button>

          {customLists.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <div className="px-3 py-1.5 font-bold text-gray-400 uppercase tracking-wider text-[10px]">カスタムリストで並べかえ</div>
              
              {customLists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => handleSelect(list.id)}
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="font-medium truncate">{list.name}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{list.type}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};