import { useState } from 'react';
import { Layers, FileText, Folder, MoreVertical, Edit2, Trash2, Plus } from 'lucide-react';

export default function FolderPanel({
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
    <div className="folder-panel-card">
      <div className="folder-panel-header">
        <span className="folder-panel-title">Danh mục</span>
        <button
          type="button"
          className="folder-add-btn"
          onClick={onCreateFolder}
          title="Tạo thư mục mới"
        >
          <Plus size={15} />
          <span>Thêm thư mục</span>
        </button>
      </div>

      <nav className="folder-panel-nav">
        {/* All Decks Item */}
        <div
          className={`folder-panel-item ${
            selectedFolderId === null && !isUncategorizedSelected ? 'is-active' : ''
          }`}
          onClick={onSelectAll}
          role="button"
          tabIndex={0}
        >
          <div className="folder-panel-item-left">
            <Layers size={17} className="folder-item-icon" />
            <span className="folder-item-name">Tất cả bộ từ vựng</span>
          </div>
          <span className="folder-count-pill">{totalDeckCount}</span>
        </div>

        {/* Uncategorized Item */}
        <div
          className={`folder-panel-item ${isUncategorizedSelected ? 'is-active' : ''}`}
          onClick={onSelectUncategorized}
          role="button"
          tabIndex={0}
        >
          <div className="folder-panel-item-left">
            <FileText size={17} className="folder-item-icon" />
            <span className="folder-item-name">Chưa phân loại</span>
          </div>
          <span className="folder-count-pill">{uncategorizedDeckCount}</span>
        </div>

        <div className="sidebar-divider" style={{ margin: '12px 0' }} />

        {/* User Folders Section */}
        <div className="user-folders-scroll-area">
          {folders.length === 0 ? (
            <div className="folder-empty-state">
              <Folder size={32} className="folder-empty-icon" />
              <p className="folder-empty-text">Chưa có thư mục nào.</p>
              <button
                type="button"
                className="folder-empty-link"
                onClick={onCreateFolder}
              >
                + Tạo thư mục đầu tiên
              </button>
            </div>
          ) : (
            folders.map((folder) => {
              const isSelected = selectedFolderId === folder.id && !isUncategorizedSelected;
              const isMenuOpen = activeMenuId === folder.id;

              return (
                <div
                  key={folder.id}
                  className={`folder-panel-item ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectFolder(folder.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="folder-panel-item-left">
                    <Folder size={17} className="folder-item-icon" />
                    <span className="folder-item-name" title={folder.name}>
                      {folder.name}
                    </span>
                  </div>

                  <div
                    className="folder-panel-item-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="folder-count-pill">{folder.deckCount || 0}</span>
                    <button
                      type="button"
                      className="folder-more-btn"
                      onClick={(e) => toggleMenu(e, folder.id)}
                      title="Tùy chọn thư mục"
                      aria-label="Tùy chọn thư mục"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {isMenuOpen && (
                      <div className="dropdown-menu folder-dropdown-menu">
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
    </div>
  );
}
