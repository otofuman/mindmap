import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MindMapNode } from './MindMapNode';

// カスタムノードの型マッピング
const nodeTypes = {
  mindMapNode: MindMapNode,
};

// 初期ノードデータ
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'mindMapNode',
    position: { x: 250, y: 150 },
    data: { label: 'メインアイデア' },
  },
];

const initialEdges: Edge[] = [];

const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const MindMapCanvasContent: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // 接続処理（ストレート線に設定）
  const onConnect: OnConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, type: 'straight', style: { stroke: '#475569', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  // ダブルクリックで新規ノード作成
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail === 2) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNodeId = generateId();
        const newNode: Node = {
          id: newNodeId,
          type: 'mindMapNode',
          position,
          data: { label: '新しいトピック' },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [screenToFlowPosition, setNodes]
  );

  // 子ノード追加
  const addChildNode = useCallback(
    (parentNodeId: string) => {
      const parentNode = nodes.find((n) => n.id === parentNodeId);
      if (!parentNode) return;

      const childNodeId = generateId();
      const childPosition = {
        x: parentNode.position.x + 220,
        y: parentNode.position.y + (Math.random() * 80 - 40),
      };

      const newChildNode: Node = {
        id: childNodeId,
        type: 'mindMapNode',
        position: childPosition,
        data: { label: 'サブトピック' },
      };

      const newEdge: Edge = {
        id: `e_${parentNodeId}-${childNodeId}`,
        source: parentNodeId,
        target: childNodeId,
        type: 'straight',
        style: { stroke: '#475569', strokeWidth: 2 },
      };

      setNodes((nds) => nds.concat(newChildNode));
      setEdges((eds) => eds.concat(newEdge));
    },
    [nodes, setNodes, setEdges]
  );

  // ショートカット操作
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const selectedNode = nodes.find((n) => n.selected);
        if (selectedNode) {
          addChildNode(selectedNode.id);
        }
      }
    },
    [nodes, addChildNode]
  );

  const selectedNode = nodes.find((n) => n.selected);

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative focus:outline-none"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {selectedNode && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur shadow-md border border-gray-200 rounded-lg p-2 flex gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium px-2">
            選択中: {String(selectedNode.data.label)}
          </span>
          <button
            onClick={() => addChildNode(selectedNode.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition"
          >
            + 子ノードを追加 (Tab)
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onClick={onPaneClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};

export const MindMapCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <MindMapCanvasContent />
    </ReactFlowProvider>
  );
};