import { Folder, FolderPlus, Layers, Inbox, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Button from '../../components/common/Button';

export default function FolderSidebar({
  folders = [],
  selectedFolderId,
  isUncategorizedSelected,
  onSelectAll,
  onSelectUncategorized,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  totalDeckCount = 0,
  uncategorizedDeckCount = 0,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  const toggleMenu = (e, folderId) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === folderId ? null : folderId);
  };

  return (
    <aside className="folder-sidebar">
      <div className="folder-sidebar-header">
        <h2 className="sidebar-title">Thư mục</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateFolder}
          icon={FolderPlus}
        >
          Thêm
        </Button>
      </div>

      <nav className="folder-nav">
        {/* All Decks */}
        <div
          className={`folder-nav-item ${selectedFolderId === null && !isUncategorizedSelected ? 'is-active' : ''}`}
          onClick={onSelectAll}
        >
          <div className="folder-nav-item-left">
            <Layers size={18} className="folder-icon" />
            <span className="folder-name">Tất cả bộ từ</span>
          </div>
          <span className="folder-count">{totalDeckCount}</span>
        </div>

        {/* Uncategorized Decks */}
        <div
          className={`folder-nav-item ${isUncategorizedSelected ? 'is-active' : ''}`}
          onClick={onSelectUncategorized}
        >
          <div className="folder-nav-item-left">
            <Inbox size={18} className="folder-icon" />
            <span className="folder-name">Chưa phân loại</span>
          </div>
          <span className="folder-count">{uncategorizedDeckCount}</span>
        </div>

        <div className="sidebar-divider" />

        {/* User Folders List */}
        <div className="user-folders-list">
          {folders.length === 0 ? (
            <div className="empty-folders-hint">
              <Folder size={28} className="text-muted" style={{ margin: '0 auto 8px' }} />
              <p>Chưa có thư mục nào.</p>
              <button
                type="button"
                className="link-btn"
                onClick={onCreateFolder}
              >
                + Tạo thư mục đầu tiên
              </button>
            </div>
          ) : (
            folders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              const isMenuOpen = activeMenuId === folder.id;

              return (
                <div
                  key={folder.id}
                  className={`folder-nav-item ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectFolder(folder.id)}
                >
                  <div className="folder-nav-item-left">
                    <Folder size={18} className="folder-icon" />
                    <span className="folder-name" title={folder.name}>
                      {folder.name}
                    </span>
                  </div>

                  <div className="folder-nav-item-right" onClick={(e) => e.stopPropagation()}>
                    <span className="folder-count">{folder.deckCount}</span>
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={(e) => toggleMenu(e, folder.id)}
                      title="Tùy chọn thư mục"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {isMenuOpen && (
                      <div className="dropdown-menu">
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditFolder(folder);
                          }}
                        >
                          <Edit2 size={14} /> Đổi tên
                        </button>
                        <button
                          type="button"
                          className="dropdown-item text-danger"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDeleteFolder(folder);
                          }}
                        >
                          <Trash2 size={14} /> Xóa thư mục
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </nav>
    </aside>
  );
}
