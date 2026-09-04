import React from 'react';

interface NodeMenuProps {
  target: { id: string; x: number; y: number };
  onClose: () => void;
  onEdit: (id: string) => void;
  onConnect: (id: string) => void;
  onStyle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NodeMenu: React.FC<NodeMenuProps> = ({
  target,
  onClose,
  onEdit,
  onConnect,
  onStyle,
  onDelete,
}) => {
  return (
    <div
      style={{ top: target.y, left: target.x }}
      className="absolute z-[100] bg-white border border-gray-200 shadow-xl rounded-xl p-1 flex flex-col gap-0.5 min-w-[140px] pointer-events-auto"
    >
      <div className="flex justify-between items-center text-[10px] text-gray-400 px-2.5 py-1 font-medium border-b border-gray-100">
        <span>メニュー</span>
        <button onClick={onClose} className="hover:text-gray-600 font-bold px-1">
          ✕
        </button>
      </div>
      
      <button
        onClick={() => {
          onEdit(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        詳細編集
      </button>

      <button
        onClick={() => {
          onConnect(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        接続を追加
      </button>

      <button
        onClick={() => {
          onStyle(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        スタイルの変更
      </button>

      <button
        onClick={() => {
          if (window.confirm('選択したノードを削除してもよろしいですか？')) {
            onDelete(target.id);
            onClose();
          }
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition border-t border-gray-100 mt-0.5 pt-1"
      >
        削除
      </button>
    </div>
  );
};