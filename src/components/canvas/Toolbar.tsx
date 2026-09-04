import React from 'react';

interface ToolbarProps {
  selectedNodeIds: string[];
  isSelectionMode: boolean;
  setIsSelectionMode: (val: boolean) => void;
  onAddAction: () => void;
  onAutoLayout: () => void;
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

  return (
    <div className="absolute top-16 left-3 right-3 z-40 pointer-events-none max-w-xl mx-auto">
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 pointer-events-auto">
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto w-full justify-between">
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={onAddAction}
              className="text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs bg-gray-900 hover:bg-gray-800 text-white"
            >
              ノード追加
            </button>

            {hasSelection && primarySelectedId && (
              <>
                <button
                  onClick={() => onConnectStart(primarySelectedId)}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs"
                >
                  接続追加
                </button>
                <button
                  onClick={onOpenEditModal}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs"
                >
                  詳細編集
                </button>
                <button
                  onClick={onOpenStyleModal}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs"
                >
                  スタイル変更
                </button>
              </>
            )}

            {/* モバイル版のみ表示する選択モードボタン */}
            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`md:hidden text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs ${
                isSelectionMode
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {isSelectionMode ? '選択モード解除' : '選択モード'}
            </button>

            <button
              onClick={onAutoLayout}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition shadow-2xs"
            >
              整列
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};