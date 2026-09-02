import React, { useState } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { Topic, Connection } from '../../types/mindmap';

export const DataGrid: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'topics' | 'connections'>('topics');

  const document = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const deleteTopic = useMindMapStore((state) => state.deleteTopic);

  return (
    <div className="w-full h-full flex flex-col bg-white border-t border-gray-200 text-xs">
      {/* タブ切替バー */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 gap-2">
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-3 py-1.5 font-semibold rounded-t border-t border-l border-r transition ${
            activeTab === 'topics'
              ? 'bg-white text-blue-600 border-gray-200 border-b-transparent -mb-px'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          Topics テーブル ({document.topics.length})
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-3 py-1.5 font-semibold rounded-t border-t border-l border-r transition ${
            activeTab === 'connections'
              ? 'bg-white text-blue-600 border-gray-200 border-b-transparent -mb-px'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          Connections テーブル ({document.connections.length})
        </button>
      </div>

      {/* テーブル表示領域 */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'topics' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-gray-600">
                <th className="p-2 font-medium">ID</th>
                <th className="p-2 font-medium">タイトル</th>
                <th className="p-2 font-medium">詳細メモ</th>
                <th className="p-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {document.topics.map((topic: Topic) => {
                const isSelected = topic.id === selectedNodeId;
                return (
                  <tr
                    key={topic.id}
                    className={`border-b border-gray-100 transition hover:bg-blue-50/50 ${
                      isSelected ? 'bg-blue-100/70 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2 font-mono text-gray-500">{topic.id}</td>
                    <td className="p-2 text-gray-800">{topic.title}</td>
                    <td className="p-2 text-gray-600">
                      {topic.detailMemo || <span className="text-gray-400 italic">なし</span>}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => deleteTopic(topic.id)}
                        className="text-red-600 hover:text-red-800 hover:underline"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-gray-600">
                <th className="p-2 font-medium">ID</th>
                <th className="p-2 font-medium">接続元 (Source)</th>
                <th className="p-2 font-medium">接続先 (Target)</th>
              </tr>
            </thead>
            <tbody>
              {document.connections.map((conn: Connection) => {
                const source = document.topics.find((t) => t.id === conn.sourceTopicId);
                const target = document.topics.find((t) => t.id === conn.targetTopicId);
                return (
                  <tr key={conn.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 font-mono text-gray-500">{conn.id}</td>
                    <td className="p-2 font-mono">
                      {source ? `${source.title} (${source.id})` : conn.sourceTopicId}
                    </td>
                    <td className="p-2 font-mono">
                      {target ? `${target.title} (${target.id})` : conn.targetTopicId}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};