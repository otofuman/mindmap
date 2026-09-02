import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection, // ← ここに type を追加しました
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 初期テスト用ノード（トピック）データ
const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 250, y: 150 },
    data: { label: 'メインアイデア' },
    style: { backgroundColor: '#ffffff', color: '#333', border: '2px solid #2563eb', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '2',
    position: { x: 100, y: 300 },
    data: { label: 'サブトピック A' },
    style: { backgroundColor: '#ffffff', color: '#333', border: '1px solid #64748b', borderRadius: '8px', padding: '8px' },
  },
  {
    id: '3',
    position: { x: 400, y: 300 },
    data: { label: 'サブトピック B' },
    style: { backgroundColor: '#ffffff', color: '#333', border: '1px solid #64748b', borderRadius: '8px', padding: '8px' },
  },
];

// 初期テスト用接続データ
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e1-3', source: '1', target: '3', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
];

export const MindMapCanvas: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 接続の追加処理
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};