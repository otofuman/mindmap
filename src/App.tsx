import React, { useState } from 'react';
import { MindMapCanvas } from './components/canvas/MindMapCanvas';
import { DataGrid } from './components/grid/DataGrid';
import { Sidebar } from './components/sidebar/Sidebar';
import { useMindMapStore } from './store/useMindMapStore';

export const App: React.FC = () => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-100 relative">
      {/* メインレイアウト */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* キャンバスエリア (常に全画面表示) */}
        <div className="flex-1 h-full relative">
          <MindMapCanvas />
        </div>

        {/* PC用データグリッド（PC表示時は下部に固定） */}
        <div className="hidden md:block h-64 border-t border-gray-200 bg-white absolute bottom-0 left-0 right-0 z-10">
          <DataGrid />
        </div>

        {/* PC用サイドバー（md以上では常設右側表示） */}
        <div className="hidden md:block w-80 h-full border-l border-gray-200 z-10">
          <Sidebar />
        </div>
      </div>

      {/* ========================================================
          モバイル用 ボトムシート（Apple Pay画面風スライドアップ）
         ======================================================== */}
      {selectedNodeId && !isBottomSheetOpen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden animate-bounce">
          <button
            onClick={() => setIsBottomSheetOpen(true)}
            className="bg-gray-900 text-white font-semibold text-xs px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-gray-700"
          >
            <span>⚙️ 選択ノードの詳細を表示</span>
          </button>
        </div>
      )}

      {isBottomSheetOpen && (
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsBottomSheetOpen(false)}
        />
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 h-[70vh] bg-white rounded-t-3xl shadow-2xl z-50 md:hidden flex flex-col transition-transform duration-300 ease-out transform ${
          isBottomSheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsBottomSheetOpen(false)}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full cursor-pointer" />
        </div>

        <div className="flex justify-between items-center px-5 py-2 border-b">
          <h3 className="font-bold text-gray-800 text-sm">ノード詳細設定</h3>
          <button
            onClick={() => setIsBottomSheetOpen(false)}
            className="text-gray-400 hover:text-gray-600 font-bold text-base px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </div>
    </div>
  );
};

export default App;