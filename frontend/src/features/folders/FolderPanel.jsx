import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuState, setMenuState] = useState(null); // { folder, position: { top, left, width } }
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const toggleMenu = (e, folder) => {
    e.stopPropagation();
    if (menuState?.folder?.id === folder.id) {
      setMenuState(null);
      triggerRef.current = null;
    } else {
      triggerRef.current = e.currentTarget;
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 146;
      const menuHeight = 84;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Check space below in scroll area container as well as viewport
      const scrollArea = e.currentTarget.closest('.user-folders-scroll-area');
      const scrollAreaRect = scrollArea?.getBoundingClientRect();
      const spaceBelowInContainer = scrollAreaRect ? scrollAreaRect.bottom - rect.bottom : spaceBelow;

      // Auto-flip upwards if not enough room below in viewport OR if near the bottom edge of folder list
      const shouldFlipUp =
        (spaceBelow < menuHeight + 12 || spaceBelowInContainer < menuHeight - 10) &&
        spaceAbove > menuHeight;

      let top = shouldFlipUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
      let left = rect.right - menuWidth;

      // Ensure dropdown stays within viewport boundaries
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (top < 8) top = 8;

      setMenuState({
        folder,
        position: { top, left, width: menuWidth },
      });
    }
  };

  useEffect(() => {
    if (!menuState) return;

    const closeMenu = () => {
      setMenuState(null);
      triggerRef.current = null;
    };

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    // Close on any scroll (captures container scroll in .user-folders-scroll-area and window scroll)
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState]);

  const handleEdit = (folder) => {
    setMenuState(null);
    triggerRef.current = null;
    onEditFolder(folder);
  };

  const handleDelete = (folder) => {
    setMenuState(null);
    triggerRef.current = null;
    onDeleteFolder(folder);
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
              const isMenuOpen = menuState?.folder?.id === folder.id;

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
                      className={`folder-more-btn ${isMenuOpen ? 'is-active' : ''}`}
                      onClick={(e) => toggleMenu(e, folder)}
                      title="Tùy chọn thư mục"
                      aria-label="Tùy chọn thư mục"
                      aria-expanded={isMenuOpen}
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </nav>

      {/* Render context menu in Portal outside any overflow/clip parent */}
      {menuState &&
        createPortal(
          <div
            ref={menuRef}
            className="dropdown-menu folder-dropdown-portal"
            style={{
              position: 'fixed',
              top: `${menuState.position.top}px`,
              left: `${menuState.position.left}px`,
              width: `${menuState.position.width}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
            aria-label="Tùy chọn thư mục"
          >
            <button
              type="button"
              className="dropdown-item"
              onClick={() => handleEdit(menuState.folder)}
              role="menuitem"
            >
              <Edit2 size={14} />
              <span>Đổi tên</span>
            </button>
            <button
              type="button"
              className="dropdown-item text-danger"
              onClick={() => handleDelete(menuState.folder)}
              role="menuitem"
            >
              <Trash2 size={14} />
              <span>Xóa thư mục</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
