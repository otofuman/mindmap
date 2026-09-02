import React from 'react';
import { MindMapCanvas } from './components/canvas/MindMapCanvas';
import { DataGrid } from './components/grid/DataGrid';
import { Sidebar } from './components/sidebar/Sidebar';

export const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* メインエリア (キャンバス + サイドバー) */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 h-full relative">
          <MindMapCanvas />
        </div>
        <Sidebar />
      </div>

      {/* データグリッド (下部) */}
      <div className="h-64 border-t border-gray-200">
        <DataGrid />
      </div>
    </div>
  );
};

export default App;