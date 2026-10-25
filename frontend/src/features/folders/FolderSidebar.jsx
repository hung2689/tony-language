import { Folder, FolderPlus, Layers, Inbox, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuState, setMenuState] = useState(null); // { folder, position }
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

      const scrollArea = e.currentTarget.closest('.user-folders-list');
      const scrollAreaRect = scrollArea?.getBoundingClientRect();
      const spaceBelowInContainer = scrollAreaRect ? scrollAreaRect.bottom - rect.bottom : spaceBelow;

      const shouldFlipUp =
        (spaceBelow < menuHeight + 12 || spaceBelowInContainer < menuHeight - 10) &&
        spaceAbove > menuHeight;

      let top = shouldFlipUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
      let left = rect.right - menuWidth;

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
      if (e.key === 'Escape') closeMenu();
    };

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
              const isMenuOpen = menuState?.folder?.id === folder.id;

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
                      className={`icon-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                      onClick={(e) => toggleMenu(e, folder)}
                      title="Tùy chọn thư mục"
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
    </aside>
  );
}
