import React from 'react';
import type { ConnectionType } from '../../types/mindmap';

interface EdgeMenuProps {
  target: { id: string; x: number; y: number };
  connectionType: ConnectionType;
  onClose: () => void;
  onUpdateType: (type: ConnectionType) => void;
  onDelete: () => void;
}

export const EdgeMenu: React.FC<EdgeMenuProps> = ({
  target,
  connectionType,
  onClose,
  onUpdateType,
  onDelete,
}) => {
  return (
    <div
      style={{ top: target.y, left: target.x }}
      className="absolute z-[9999] bg-white border border-gray-200 shadow-2xl rounded-xl p-1 flex flex-col gap-0.5 min-w-[140px] pointer-events-auto"
    >
      <div className="flex justify-between items-center text-[10px] text-gray-400 px-2.5 py-1 font-medium border-b border-gray-100">
        <span>接続設定</span>
        <button
          onClick={onClose}
          className="hover:text-gray-600 font-bold px-1"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-400 px-2.5 py-0.5">タイプ変更</span>
        <button
          onClick={() => {
            onUpdateType(target.id, 'arrow');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
            connectionType === 'arrow'
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          正方向
        </button>
        <button
          onClick={() => {
            onUpdateType(target.id, 'reverse_arrow');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
            connectionType === 'reverse_arrow'
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          逆方向
        </button>
        <button
          onClick={() => {
            onUpdateType(target.id, 'bi_arrow');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
            connectionType === 'bi_arrow'
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          双方向
        </button>
        <button
          onClick={() => {
            onUpdateType(target.id, 'line');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
            connectionType === 'line'
              ? 'bg-blue-100 text-blue-700 font-bold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          矢印なし
        </button>
      </div>

      <div className="border-t border-gray-100 mt-0.5 pt-0.5">
        <button
          onClick={() => {
            onDelete(target.id);
            onClose();
          }}
          className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          接続を削除
        </button>
      </div>
    </div>
  );
};