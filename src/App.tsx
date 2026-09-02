import React from 'react';
import { MindMapCanvas } from './components/canvas/MindMapCanvas';
import { DataGrid } from './components/grid/DataGrid';

export const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* 上部: マインドマップキャンバス (65%) */}
      <div className="h-[65%] w-full relative">
        <MindMapCanvas />
      </div>

      {/* 下部: TanStack Table データグリッド (35%) */}
      <div className="h-[35%] w-full">
        <DataGrid />
      </div>
    </div>
  );
};

export default App;