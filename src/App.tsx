import React, { useState } from 'react';
import { MindMapCanvas } from './components/canvas/MindMapCanvas';
import { DataGrid } from './components/grid/DataGrid';
import { Sidebar } from './components/sidebar/Sidebar';

export const App: React.FC = () => {
  // スマホ表示時のアクティブタブ ('canvas' | 'grid' | 'sidebar')
  const [mobileTab, setMobileTab] = useState<'canvas' | 'grid' | 'sidebar'>('canvas');

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* PC表示 (md以上): 従来通りの3分割レイアウト / スマホ表示: タブ切替 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* キャンバスエリア */}
        <div
          className={`flex-1 h-full relative ${
            mobileTab === 'canvas' ? 'block' : 'hidden md:block'
          }`}
        >
          <MindMapCanvas />
        </div>

        {/* サイドバー（属性編集） */}
        <div
          className={`w-full md:w-80 h-full ${
            mobileTab === 'sidebar' ? 'block' : 'hidden md:block'
          }`}
        >
          <Sidebar />
        </div>
      </div>

      {/* データグリッド（PC表示時は下部固定 / スマホ時はタブ選択時のみ全画面表示） */}
      <div
        className={`h-64 border-t border-gray-200 ${
          mobileTab === 'grid' ? 'block flex-1' : 'hidden md:block'
        }`}
      >
        <DataGrid />
      </div>

      {/* スマホ用ボトムナビゲーションバー (md未満で表示) */}
      <div className="md:hidden flex border-t border-gray-300 bg-white text-xs z-20">
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-3 text-center font-semibold ${
            mobileTab === 'canvas' ? 'text-blue-600 border-t-2 border-blue-600 bg-blue-50/50' : 'text-gray-600'
          }`}
        >
          🗺️ マップ
        </button>
        <button
          onClick={() => setMobileTab('grid')}
          className={`flex-1 py-3 text-center font-semibold ${
            mobileTab === 'grid' ? 'text-blue-600 border-t-2 border-blue-600 bg-blue-50/50' : 'text-gray-600'
          }`}
        >
          📊 データ
        </button>
        <button
          onClick={() => setMobileTab('sidebar')}
          className={`flex-1 py-3 text-center font-semibold ${
            mobileTab === 'sidebar' ? 'text-blue-600 border-t-2 border-blue-600 bg-blue-50/50' : 'text-gray-600'
          }`}
        >
          ⚙️ 属性編集
        </button>
      </div>
    </div>
  );
};

export default App;