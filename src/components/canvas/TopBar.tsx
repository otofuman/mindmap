import React, { useState, useRef } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { SettingsModal } from '../modals/SettingsModal';
import { CustomListSettingsModal } from '../modals/CustomListSettingsModal';

interface TopBarProps {
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onExportJSON, onImportJSON }) => {
  const mapDocument = useMindMapStore((state) => state.document);
  const loadDocument = useMindMapStore((state) => state.loadDocument); // 🌟 新規作成用にストアから取得
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCustomListSettingsModal, setShowCustomListSettingsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirty = useMindMapStore((state) => state.isDirty);

  const handleTitleClick = () => {
    const currentTitle = mapDocument.meta.title || 'マインドマップ';
    const newTitle = window.prompt('マインドマップ名を入力:', currentTitle);
    if (newTitle !== null) {
      useMindMapStore.setState((state) => ({
        document: {
          ...state.document,
          meta: { ...state.document.meta, title: newTitle.trim() || 'マインドマップ' }
        }
      }));
    }
  };

  // 🌟 新規作成の処理（初期ドキュメントをロード）
  const handleNewMap = () => {
    if (isDirty && !window.confirm('保存されていない変更があります。新しいマインドマップを作成しますか？')) {
      return;
    }
    if (!isDirty && !window.confirm('新しいマインドマップを作成しますか？')) {
      return;
    }

    // 初期状態のドキュメント構造
    const freshDocument = {
      meta: {
        id: `doc_${Date.now()}`,
        title: '無題のマインドマップ',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        savedAs: null,
        showGrid: true,
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
          shape: 'rounded_rectangle' as const,
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

    loadDocument(freshDocument);
  };

  return (
    <>
      <div className="absolute top-3 left-3 right-3 z-50 pointer-events-none max-w-xl mx-auto">
        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 pointer-events-auto relative">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-2 py-1 hover:bg-gray-100 rounded-lg text-gray-700 transition shrink-0 font-medium text-xs"
            >
              ≡
            </button>
            <span
              onClick={handleTitleClick}
              className="font-medium text-gray-800 text-xs md:text-sm truncate cursor-pointer hover:text-blue-600 transition"
              title="クリックして名前を変更"
            >
              {mapDocument.meta.title || 'マインドマップ'}{isDirty && ' *'}
            </span>
          </div>

          <div className="hidden md:flex gap-1.5 items-center">
            {/* 🌟 新規作成ボタン */}
            <button
              onClick={handleNewMap}
              className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition font-medium shadow-2xs flex items-center gap-1"
              title="新しいマインドマップを作成"
            >
              ＋ 新規
            </button>

            {/* 設定（一般設定モーダルを開く） */}
            <button
              onClick={() => {
                setShowSettingsModal(true);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-medium shadow-2xs flex items-center gap-1"
              title="一般設定"
            >
              設定
            </button>

            <button
              onClick={() => setShowCustomListSettingsModal(true)}
              className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-medium shadow-2xs"
              title="カスタムリスト設定"
            >
              リスト管理
            </button>
            <button
              onClick={onExportJSON}
              className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-medium shadow-2xs"
            >
              保存
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-medium shadow-2xs"
            >
              開く
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="absolute left-0 top-12 bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 min-w-[140px] z-[100] pointer-events-auto">
              
              {/* 🌟 モバイルメニュー用：新規作成 */}
              <button
                onClick={() => {
                  handleNewMap();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                ＋ 新規作成
              </button>

              {/* 設定（一般設定モーダルを開く） */}
              <button
                onClick={() => {
                  setShowSettingsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                設定
              </button>

              <button
                onClick={() => {
                  setShowCustomListSettingsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                リスト管理
              </button>
              <button
                onClick={() => {
                  onExportJSON();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                保存
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                開く
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportJSON}
          className="hidden"
        />
      </div>

      {/* 一般設定モーダル */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* カスタムリスト設定モーダル */}
      {showCustomListSettingsModal && (
        <CustomListSettingsModal onClose={() => setShowCustomListSettingsModal(false)} />
      )}
    </>
  );
};