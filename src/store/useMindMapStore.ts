import { create } from 'zustand';
import type {
  Topic,
  Connection,
  TopicDisplay,
  ConnectionDisplay,
  MindMapDocument,
  ConnectionType
} from '../types/mindmap';
import { type NodeChange, type EdgeChange } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';
import { BASE_NODE_HEIGHT } from '../config/mindmapConfig';

interface MindMapState {
  document: MindMapDocument;
  selectedNodeIds: string[];

  past: MindMapDocument[];
  future: MindMapDocument[];

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addTopic: (title: string, position: { x: number; y: number }, parentTopicId?: string) => string;
  connectTopics: (sourceId: string, targetId: string) => void;
  deleteTopic: (topicId: string) => void;
  applyAutoLayout: (direction?: 'LR' | 'TB') => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  loadDocument: (newDocument: MindMapDocument) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  updateTopicDisplay: (topicId: string, updates: Partial<TopicDisplay>) => void;
  
  connectingSourceId: string | null;
  setConnectingSourceId: (id: string | null) => void;
  handleNodeTapForConnect: (targetNodeId: string) => void;

  updateConnectionType: (connectionId: string, type: ConnectionType) => void;
  deleteConnection: (connectionId: string) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void; // 選択解除用の明確な関数を追加
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialDocument: MindMapDocument = {
  meta: {
    id: 'doc_1',
    title: '無題のマインドマップ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
  },
  schema: {
    topicColumns: [],
    connectionColumns: [],
  },
  topics: [
    {
      id: 'topic_1',
      title: 'メインアイデア',
      detailMemo: '',
      customValues: {},
    },
  ],
  connections: [],
  topicDisplays: [
    {
      topicId: 'topic_1',
      shape: 'rounded_rectangle',
      position: { x: 250, y: 150 },
      size: 1,
      backgroundColor: '#ffffff',
      textColor: '#333333',
    },
  ],
  connectionDisplays: [],
  customLists: [],
  history: [],
};

const pushHistory = (state: MindMapState, newDocument: MindMapDocument) => {
  return {
    past: [...state.past, state.document],
    future: [],
    document: newDocument,
    canUndo: true,
    canRedo: false,
  };
};

export const useMindMapStore = create<MindMapState>((set, get) => ({
  document: initialDocument,
  selectedNodeIds: [],

  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  connectingSourceId: null,

  setConnectingSourceId: (id: string | null) => set({ connectingSourceId: id }),
  setSelectedNodeIds: (ids: string[]) => set({ selectedNodeIds: ids }),
  clearSelection: () => set({ selectedNodeIds: [], connectingSourceId: null }), // 完全クリア

  handleNodeTapForConnect: (targetNodeId: string) => {
    const { connectingSourceId, connectTopics } = get();

    if (!connectingSourceId) {
      set({ connectingSourceId: targetNodeId });
    } else if (connectingSourceId === targetNodeId) {
      set({ connectingSourceId: null });
    } else {
      connectTopics(connectingSourceId, targetNodeId);
      set({ connectingSourceId: null });
    }
  },

  onNodesChange: (changes: NodeChange[]) => {
    const currentSelectedIds = [...get().selectedNodeIds];
    let idsChanged = false;

    changes.forEach((c) => {
      if (c.type === 'select') {
        idsChanged = true;
        if (c.selected) {
          if (!currentSelectedIds.includes(c.id)) {
            currentSelectedIds.push(c.id);
          }
        } else {
          const index = currentSelectedIds.indexOf(c.id);
          if (index > -1) {
            currentSelectedIds.splice(index, 1);
          }
        }
      } else if (c.type === 'remove') {
        get().deleteTopic(c.id);
        return;
      }
    });

    const removeChange = changes.find((c) => c.type === 'remove');
    if (removeChange && removeChange.type === 'remove') {
      return;
    }

    const positionChanges = changes.filter((c) => c.type === 'position');
    if (positionChanges.length > 0) {
      set((state) => {
        const newTopicDisplays = state.document.topicDisplays.map((display) => {
          const change = positionChanges.find((c) => c.id === display.topicId);
          if (change && change.type === 'position' && change.position) {
            return {
              ...display,
              position: change.position,
            };
          }
          return display;
        });

        const newDocument = {
          ...state.document,
          topicDisplays: newTopicDisplays,
        };

        return {
          ...pushHistory(state, newDocument),
          selectedNodeIds: idsChanged ? currentSelectedIds : state.selectedNodeIds,
        };
      });
    } else if (idsChanged) {
      set({ selectedNodeIds: currentSelectedIds });
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const removeChange = changes.find((c) => c.type === 'remove');
    if (removeChange && removeChange.type === 'remove') {
      set((state) => {
        const newDocument = {
          ...state.document,
          connections: state.document.connections.filter((c) => c.id !== removeChange.id),
        };
        return pushHistory(state, newDocument);
      });
    }
  },

  addTopic: (title: string, position: { x: number; y: number }, parentTopicId?: string) => {
    const newTopicId = generateId();
    const newConnectionId = generateId();

    const newTopic: Topic = {
      id: newTopicId,
      title,
      detailMemo: '',
      customValues: {},
    };

    const newTopicDisplay: TopicDisplay = {
      topicId: newTopicId,
      shape: 'rounded_rectangle',
      position,
      size: 1,
      backgroundColor: '#ffffff',
      textColor: '#333333',
    };

    set((state) => {
      const nextTopics = [...state.document.topics, newTopic];
      const nextTopicDisplays = [...state.document.topicDisplays, newTopicDisplay];
      const nextConnections = [...state.document.connections];

      if (parentTopicId) {
        nextConnections.push({
          id: newConnectionId,
          sourceTopicId: parentTopicId,
          targetTopicId: newTopicId,
          type: 'line',
          memo: '',
          customValues: {},
        });
      }

      const newDocument = {
        ...state.document,
        topics: nextTopics,
        topicDisplays: nextTopicDisplays,
        connections: nextConnections,
      };

      return {
        ...pushHistory(state, newDocument),
        selectedNodeIds: [newTopicId],
      };
    });

    return newTopicId;
  },

  connectTopics: (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const { document } = get();
    const existingSame = document.connections.find(
      (c) => c.sourceTopicId === sourceId && c.targetTopicId === targetId
    );
    if (existingSame) return;

    const existingReverse = document.connections.find(
      (c) => c.sourceTopicId === targetId && c.targetTopicId === sourceId
    );

    if (existingReverse) {
      if (existingReverse.type === 'bi_arrow') return;
      set((state) => {
        const newConnections = state.document.connections.map((c) =>
          c.id === existingReverse.id ? { ...c, type: 'bi_arrow' as ConnectionType } : c
        );
        const newDocument = { ...state.document, connections: newConnections };
        return pushHistory(state, newDocument);
      });
      return;
    }

    const newConnectionId = `conn-${Date.now()}`;
    const newConn: Connection = {
      id: newConnectionId,
      sourceTopicId: sourceId,
      targetTopicId: targetId,
      type: 'arrow' as ConnectionType,
      memo: '',
      customValues: {},
    };

    const newConnDisplay: ConnectionDisplay = {
      connectionId: newConnectionId,
      style: 'solid',
      routing: 'straight',
      color: '#475569',
      strokeWidth: 2,
    };

    set((state) => {
      const newDocument = {
        ...state.document,
        connections: [...state.document.connections, newConn],
        connectionDisplays: [...state.document.connectionDisplays, newConnDisplay],
      };
      return pushHistory(state, newDocument);
    });
  },

  deleteTopic: (topicId: string) => {
    set((state) => {
      const newDocument = {
        ...state.document,
        topics: state.document.topics.filter((t) => t.id !== topicId),
        topicDisplays: state.document.topicDisplays.filter((td) => td.topicId !== topicId),
        connections: state.document.connections.filter(
          (c) => c.sourceTopicId !== topicId && c.targetTopicId !== topicId
        ),
      };

      return {
        ...pushHistory(state, newDocument),
        selectedNodeIds: state.selectedNodeIds.filter((id) => id !== topicId),
      };
    });
  },

  applyAutoLayout: (direction = 'LR') => {
    set((state) => {
      const newTopicDisplays = getLayoutedElements(
        state.document.topics,
        state.document.connections,
        state.document.topicDisplays,
        direction
      );

      const newDocument = {
        ...state.document,
        topicDisplays: newTopicDisplays,
      };

      return pushHistory(state, newDocument);
    });
  },

  undo: () => {
    const { past, document, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      document: previous,
      past: newPast,
      future: [document, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { past, document, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      document: next,
      past: [...past, document],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },
  
  loadDocument: (newDocument: MindMapDocument) => {
    set({
      document: newDocument,
      selectedNodeIds: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  updateTopic: (topicId: string, updates: Partial<Topic>) => {
    set((state) => {
      const newTopics = state.document.topics.map((t) =>
        t.id === topicId ? { ...t, ...updates } : t
      );
      const newDocument = {
        ...state.document,
        topics: newTopics,
      };
      return pushHistory(state, newDocument);
    });
  },

  updateTopicDisplay: (topicId: string, updates: Partial<TopicDisplay>) => {
    set((state) => {
      const newDisplays = state.document.topicDisplays.map((d) =>
        d.topicId === topicId ? { ...d, ...updates } : d
      );
      const newDocument = {
        ...state.document,
        topicDisplays: newDisplays,
      };
      return pushHistory(state, newDocument);
    });
  },

  updateMultipleTopicDisplays: (topicIds: string[], updates: Partial<TopicDisplay>) => {
    set((state) => {
      const updatedDisplays = state.document.topicDisplays.map((display) => {
        if (topicIds.includes(display.topicId)) {
          return { ...display, ...updates };
        }
        return display;
      });
      const newDocument = {
        ...state.document,
        topicDisplays: updatedDisplays,
      };
      return {
        ...pushHistory(state, newDocument),
      };
    });
  },

  updateConnectionType: (connectionId: string, type: ConnectionType) => {
    set((state) => {
      const newConnections = state.document.connections.map((c) =>
        c.id === connectionId ? { ...c, type } : c
      );
      const newDocument = { ...state.document, connections: newConnections };
      return pushHistory(state, newDocument);
    });
  },

  deleteConnection: (connectionId: string) => {
    set((state) => {
      const newConnections = state.document.connections.filter((c) => c.id !== connectionId);
      const newDisplays = state.document.connectionDisplays.filter(
        (d) => d.connectionId !== connectionId
      );
      const newDocument = {
        ...state.document,
        connections: newConnections,
        connectionDisplays: newDisplays,
      };
      return pushHistory(state, newDocument);
    });
  },
}));