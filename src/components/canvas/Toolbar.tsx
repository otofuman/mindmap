import React, { useState, useRef, useEffect } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface ToolbarProps {
  selectedNodeIds: string[];
  isSelectionMode: boolean;
  setIsSelectionMode: (val: boolean) => void;
  onAddAction: () => void;
  onAutoLayout: (mode: string) => void; // ストアの autoLayout を受け取れるように調整
  onConnectStart: (nodeId: string) => void;
  onOpenEditModal: () => void;
  onOpenStyleModal: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedNodeIds,
  isSelectionMode,
  setIsSelectionMode,
  onAddAction,
  onAutoLayout,
  onConnectStart,
  onOpenEditModal,
  onOpenStyleModal,
}) => {
  const hasSelection = selectedNodeIds.length > 0;
  const primarySelectedId = selectedNodeIds.length > 0 ? selectedNodeIds[0] : null;

  // 整列メニュー用のステートと参照
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const customLists = useMindMapStore((state) => state.document.customLists || []);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsLayoutMenuOpen(false);
      }
    };
    if (isLayoutMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLayoutMenuOpen]);

  const handleSelectLayout = (mode: string) => {
    onAutoLayout(mode);
    setIsLayoutMenuOpen(false);
  };

  return (
    <div className="absolute top-16 left-3 right-3 z-40 pointer-events-none max-w-xl mx-auto">
      {/* 
        NOTE: overflow-x-auto を持たせつつ、ポップアップメニューが切れないように 
        ここのコンテナから overflow-x-auto を外すか、メニューに relative を当てています 
      */}
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 pointer-events-auto">
        <div className="flex items-center gap-1.5 md:gap-2 w-full justify-between flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <button
              type="button"
              onClick={onAddAction}
              className="text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs bg-gray-900 hover:bg-gray-800 text-white cursor-pointer"
            >
              ノード追加
            </button>

            {hasSelection && primarySelectedId && (
              <>
                <button
                  type="button"
                  onClick={() => onConnectStart(primarySelectedId)}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs cursor-pointer"
                >
                  接続追加
                </button>
                <button
                  type="button"
                  onClick={onOpenEditModal}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs cursor-pointer"
                >
                  詳細編集
                </button>
                <button
                  type="button"
                  onClick={onOpenStyleModal}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs cursor-pointer"
                >
                  スタイル変更
                </button>
              </>
            )}

            {/* モバイル版のみ表示する選択モードボタン */}
            <button
              type="button"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`md:hidden text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs cursor-pointer ${
                isSelectionMode
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {isSelectionMode ? '選択モード解除' : '選択モード'}
            </button>

            {/* 整列ボタン ＋ ポップアップメニュー */}
            <div className="relative inline-block text-left" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsLayoutMenuOpen((prev) => !prev)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>📐 整列</span>
                <span className="text-[10px] text-gray-400">▼</span>
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-[9999] text-xs text-gray-700 focus:outline-none">
                  <div className="px-3 py-1.5 font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                    基本レイアウト
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectLayout('auto')}
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
                    onClick={() => handleSelectLayout('flow-top')}
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
                    onClick={() => handleSelectLayout('flow-left')}
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
                      <div className="px-3 py-1.5 font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                        カスタムリストで並べかえ
                      </div>

                      {customLists.map((list) => (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => handleSelectLayout(list.id)}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="font-medium truncate">{list.name}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {list.type}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};