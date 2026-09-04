import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { ConnectionType } from '../../types/mindmap';

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const updateConnectionType = useMindMapStore((state) => state.updateConnectionType);
  const deleteConnection = useMindMapStore((state) => state.deleteConnection);

  const connectionType = (data?.type as ConnectionType) || 'arrow';

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // グラデーション用ID（一意にする）
  const gradientId = `edge-grad-${id}`;

  // 接続タイプに応じた開始色（source）と終了色（target）の割り当て
  let startColor = '#2563eb'; // 濃い青
  let endColor = '#93c5fd';   // 薄い水色

  if (connectionType === 'arrow') {
    // 正方向: source(濃い) ➔ target(薄い)
    startColor = '#2563eb';
    endColor = '#93c5fd';
  } else if (connectionType === 'reverse_arrow') {
    // 逆方向: source(薄い) ⬅ target(濃い) ※グラデーションを逆に
    startColor = '#93c5fd';
    endColor = '#2563eb';
  } else if (connectionType === 'bi_arrow') {
    // 双方向: 両端とも同じ濃い色
    startColor = '#2563eb';
    endColor = '#2563eb';
  } else if (connectionType === 'line') {
    // 矢印なし直線: 落ち着いたグレーの単色
    startColor = '#94a3b8';
    endColor = '#94a3b8';
  }

  return (
    <>
      {/* SVGのグラデーション定義 */}
      <svg className="absolute w-full h-full overflow-visible pointer-events-none">
        <defs>
          <linearGradient
            id={gradientId}
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
      </svg>

      {/* グラデーションを適用したエッジ */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, strokeWidth: 3, stroke: `url(#${gradientId})` }}
      />

      {/* 中央のタップ判定 ＆ 設定メニュー呼び出し用ドット */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center justify-center cursor-pointer p-2"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          {/* 中央の小さな接続ポイント（タップ用） */}
          <span className="w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-md hover:scale-125 transition" />
        </div>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) translateY(24px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan bg-white border border-gray-300 shadow-xl rounded-lg p-2 flex flex-col gap-1.5 text-xs z-100 min-w-[140px]"
          >
            <div className="flex justify-between items-center border-b pb-1 font-bold text-gray-700">
              <span>接続設定</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400">タイプ変更</span>
              <button
                onClick={() => {
                  updateConnectionType(id, 'arrow');
                  setMenuOpen(false);
                }}
                className={`text-left px-2 py-1 rounded transition ${
                  connectionType === 'arrow' ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-100'
                }`}
              >
                ➔ 正方向 (濃 ➔ 薄)
              </button>
              <button
                onClick={() => {
                  updateConnectionType(id, 'reverse_arrow');
                  setMenuOpen(false);
                }}
                className={`text-left px-2 py-1 rounded transition ${
                  connectionType === 'reverse_arrow' ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-100'
                }`}
              >
                ⬅ 逆方向 (薄 ⬅ 濃)
              </button>
              <button
                onClick={() => {
                  updateConnectionType(id, 'bi_arrow');
                  setMenuOpen(false);
                }}
                className={`text-left px-2 py-1 rounded transition ${
                  connectionType === 'bi_arrow' ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-100'
                }`}
              >
                ⇄ 双方向 (均一色)
              </button>
              <button
                onClick={() => {
                  updateConnectionType(id, 'line');
                  setMenuOpen(false);
                }}
                className={`text-left px-2 py-1 rounded transition ${
                  connectionType === 'line' ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-100'
                }`}
              >
                ― 矢印なし直線
              </button>
            </div>

            <div className="border-t pt-1">
              <button
                onClick={() => {
                  deleteConnection(id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1 text-red-600 hover:bg-red-50 rounded font-semibold transition"
              >
                🗑 接続を削除
              </button>
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};