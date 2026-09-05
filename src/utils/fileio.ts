import type { MindMapDocument } from "../types/mindmap";

export const exportJSON = (
    mapDocument: MindMapDocument, 
    markAllAsSaved?: () => void // ストア側のisSavedをtrueにするコールバック関数
) => {
    const currentMapTitle = mapDocument.meta.title || 'mindmap';
    const inputFileName = window.prompt('保存するファイル名を入力してください:', currentMapTitle);
    if (inputFileName === null) return;

    const sanitizedTitle = inputFileName.trim() || currentMapTitle;
    const fileName = sanitizedTitle.endsWith('.json') ? sanitizedTitle : `${sanitizedTitle}.json`;

    // 1. ストア側で保持しているUndo/Redo履歴などの isSaved を true に更新
    if (markAllAsSaved) {
        markAllAsSaved();
    }

    const jsonString = JSON.stringify(mapDocument, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    mapDocument.meta.savedAs = url;
    saveMetaToCookie(mapDocument);
};

export const importJSON = (
    e: React.ChangeEvent<HTMLInputElement>,
    loadDocument: (doc: MindMapDocument) => void,
    fitView: (options?: { duration: number }) => void
) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
    try {
        const parsed = JSON.parse(event.target?.result as string) as MindMapDocument;
        if (parsed.topics && parsed.connections && parsed.topicDisplays) {
        loadDocument(parsed);
        setTimeout(() => fitView({ duration: 300 }), 50);
            saveLastlyOpenedDocumentPathToCookie(file.name);
            console.log(file.name);
        } else {
            alert('無効なフォーマットです。');
        }
    } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
    }
    };
    reader.readAsText(file);
    e.target.value = '';
}

export const saveMetaToCookie = (mapDocument: MindMapDocument) => {
    if (mapDocument.meta.savedAs){
        setCookie('lastlyOpenedDocument', mapDocument.meta.savedAs)
    }
};

export const saveLastlyOpenedDocumentPathToCookie = (name: string) => {
    if (name){
        setCookie('lastlyOpenedDocument', name)
    }
};

/**
 * Cookieに値を保存する
 */
export const setCookie = (name: string, value: string, days: number = 7) => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
};

/**
 * Cookieから値を取得する
 */
export const getCookie = (name: string): string | null => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};