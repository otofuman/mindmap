import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MindMapNode } from './MindMapNode';
import { useMindMapStore } from '../../store/useMindMapStore';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

const MindMapCanvasContent: React.FC = () => {
  const document = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const onNodesChange = useMindMapStore((state) => state.onNodesChange);
  const onEdgesChange = useMindMapStore((state) => state.onEdgesChange);
  const addTopic = useMindMapStore((state) => state.addTopic);
  const connectTopics = useMindMapStore((state) => state.connectTopics);
  const applyAutoLayout = useMindMapStore((state) => state.applyAutoLayout);

  const undo = useMindMapStore((state) => state.undo);
  const redo = useMindMapStore((state) => state.redo);
  const canUndo = useMindMapStore((state) => state.canUndo);
  const canRedo = useMindMapStore((state) => state.canRedo);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const nodes: Node[] = useMemo(() => {
    return document.topics.map((topic) => {
      const display = document.topicDisplays.find((d) => d.topicId === topic.id);
      return {
        id: topic.id,
        type: 'mindMapNode',
        position: display ? display.position : { x: 0, y: 0 },
        selected: topic.id === selectedNodeId,
        data: { label: topic.title, topic },
      };
    });
  }, [document.topics, document.topicDisplays, selectedNodeId]);

  const edges: Edge[] = useMemo(() => {
    return document.connections.map((conn) => ({
      id: conn.id,
      source: conn.sourceTopicId,
      target: conn.targetTopicId,
      type: 'straight',
      style: { stroke: '#475569', strokeWidth: 2 },
    }));
  }, [document.connections]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        connectTopics(params.source, params.target);
      }
    },
    [connectTopics]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail === 2) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addTopic('新しいトピック', position);
      }
    },
    [screenToFlowPosition, addTopic]
  );

  const addChildNode = useCallback(
    (parentNodeId: string) => {
      const parentNode = nodes.find((n) => n.id === parentNodeId);
      if (!parentNode) return;

      const childPosition = {
        x: parentNode.position.x + 220,
        y: parentNode.position.y + (Math.random() * 80 - 40),
      };

      addTopic('サブトピック', childPosition, parentNodeId);
    },
    [nodes, addTopic]
  );

  const handleAutoLayout = useCallback(() => {
    applyAutoLayout('LR');
    setTimeout(() => {
      fitView({ duration: 300 });
    }, 50);
  }, [applyAutoLayout, fitView]);

  // キーボードショートカット（Ctrl+Z, Ctrl+Y, Tab）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const selectedNode = nodes.find((n) => n.selected);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative focus:outline-none">
      {/* ツールバー */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur shadow-md border border-gray-200 rounded-lg p-2 flex gap-2 items-center">
        {/* Undo / Redo ボタン */}
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`px-2 py-1 text-xs font-semibold rounded border transition ${
              canUndo
                ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
            }`}
            title="元に戻す (Ctrl+Z)"
          >
            ↩ 戻す
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`px-2 py-1 text-xs font-semibold rounded border transition ${
              canRedo
                ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
            }`}
            title="やり直す (Ctrl+Y)"
          >
            ↪ 進む
          </button>
        </div>

        <div className="w-[1px] h-4 bg-gray-300 mx-1" />

        {selectedNode && (
          <>
            <span className="text-xs text-gray-500 font-medium px-2">
              選択中: {String(selectedNode.data.label)}
            </span>
            <button
              onClick={() => addChildNode(selectedNode.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition"
            >
              + 子ノードを追加 (Tab)
            </button>
            <div className="w-[1px] h-4 bg-gray-300 mx-1" />
          </>
        )}

        <button
          onClick={handleAutoLayout}
          className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded transition"
        >
          🪄 自動整列
        </button>
      </div>

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