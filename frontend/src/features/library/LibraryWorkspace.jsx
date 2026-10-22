import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { folderService } from '../../services/folderService';
import { deckService } from '../../services/deckService';
import FolderPanel from '../folders/FolderPanel';
import DeckList from '../decks/DeckList';
import CreateFolderModal from '../folders/CreateFolderModal';
import DeleteFolderModal from '../folders/DeleteFolderModal';
import DeckFormModal from '../decks/DeckFormModal';
import MoveDeckModal from '../decks/MoveDeckModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Toast from '../../components/common/Toast';
import { Folder, Search, ArrowUpDown, Plus } from 'lucide-react';

export default function LibraryWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const outletContext = useOutletContext() || {};
  const globalSearchQuery = outletContext.searchQuery ?? '';
  const setGlobalSearchQuery = outletContext.setSearchQuery ?? (() => {});

  const [folders, setFolders] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Sorting state
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | name_asc | count_desc

  // Read folder filter state from URL search parameters
  const folderIdParam = searchParams.get('folderId');
  const isUncategorizedParam = searchParams.get('uncategorized') === 'true';

  const selectedFolderId = folderIdParam ? Number(folderIdParam) : null;
  const isUncategorizedSelected = !folderIdParam && isUncategorizedParam;

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const [isDeckFormOpen, setIsDeckFormOpen] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState(null);
  const [deckToMove, setDeckToMove] = useState(null);
  const [deckToDelete, setDeckToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getFolders();
      setFolders(data || []);
      outletContext.refreshFolders?.();
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách thư mục', 'error');
    }
  }, [outletContext]);

  // Load decks according to folder filter
  const loadDecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isUncategorizedSelected) {
        params.uncategorized = true;
      } else if (selectedFolderId !== null) {
        params.folderId = selectedFolderId;
      }
      const data = await deckService.getDecks(params);
      setDecks(data || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách bộ từ', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, isUncategorizedSelected]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const uncategorizedDeckCount = decks.filter((d) => d.folderId == null).length;

  // Folder actions
  const handleSelectAll = () => {
    setSearchParams({});
  };

  const handleSelectUncategorized = () => {
    setSearchParams({ uncategorized: 'true' });
  };

  const handleSelectFolder = (id) => {
    setSearchParams({ folderId: String(id) });
  };

  const handleCreateOrEditFolder = async (name) => {
    try {
      if (folderToEdit) {
        await folderService.renameFolder(folderToEdit.id, name);
        showToast('Đổi tên thư mục thành công');
      } else {
        await folderService.createFolder(name);
        showToast('Tạo thư mục thành công');
      }
      setIsCreateFolderOpen(false);
      setFolderToEdit(null);
      await loadFolders();
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý thư mục', 'error');
    }
  };

  const handleQuickCreateFolder = async (name) => {
    try {
      const newFolder = await folderService.createFolder(name);
      showToast('Đã tạo thư mục mới');
      await loadFolders();
      return newFolder;
    } catch (err) {
      showToast(err.message || 'Lỗi tạo thư mục', 'error');
      throw err;
    }
  };

  const handleDeleteFolderConfirm = async (folderId, mode) => {
    try {
      await folderService.deleteFolder(folderId, mode);
      showToast('Xóa thư mục thành công');
      setFolderToDelete(null);
      if (selectedFolderId === folderId) {
        setSearchParams({});
      }
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa thư mục', 'error');
    }
  };

  // Deck actions
  const handleOpenCreateDeck = () => {
    setDeckToEdit(null);
    setIsDeckFormOpen(true);
  };

  const handleOpenEditDeck = async (deck) => {
    try {
      const fullDeck = await deckService.getDeck(deck.id);
      setDeckToEdit(fullDeck);
      setIsDeckFormOpen(true);
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết bộ từ vựng', 'error');
    }
  };

  const handleSaveDeck = async (deckData) => {
    try {
      if (deckToEdit) {
        await deckService.updateDeck(deckToEdit.id, deckData);
        showToast('Cập nhật bộ từ vựng thành công');
      } else {
        await deckService.createDeck(deckData);
        showToast('Tạo bộ từ vựng thành công');
      }
      setIsDeckFormOpen(false);
      setDeckToEdit(null);
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu bộ từ vựng', 'error');
    }
  };

  const handleMoveDeckConfirm = async (deckId, targetFolderId) => {
    try {
      await deckService.moveDeck(deckId, targetFolderId);
      showToast('Chuyển thư mục thành công');
      setDeckToMove(null);
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi chuyển thư mục', 'error');
    }
  };

  const handleDeleteDeckConfirm = async () => {
    if (!deckToDelete) return;
    try {
      await deckService.deleteDeck(deckToDelete.id);
      showToast('Đã xóa bộ từ vựng');
      setDeckToDelete(null);
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa bộ từ vựng', 'error');
    }
  };

  // Filter and sort decks
  const filteredAndSortedDecks = useMemo(() => {
    let result = [...decks];

    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_asc':
          return a.name.localeCompare(b.name, 'vi');
        case 'count_desc':
          return (b.cardCount || 0) - (a.cardCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [decks, globalSearchQuery, sortBy]);

  // Selected folder title
  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const currentFolderName = isUncategorizedSelected
    ? 'Chưa phân loại'
    : currentFolder
    ? currentFolder.name
    : 'Tất cả bộ từ vựng';

  return (
    <div className="library-workspace-page">
      {/* Page Header Row */}
      <div className="main-page-header-row">
        <div className="main-title-group">
          <div className="main-title-flex">
            <Folder size={26} className="main-folder-title-icon" />
            <h1 className="main-page-title">{currentFolderName}</h1>
          </div>
          <p className="main-page-subtitle">
            {filteredAndSortedDecks.length} bộ từ vựng được tìm thấy
          </p>
        </div>

        <button
          type="button"
          className="monochrome-btn-primary"
          onClick={handleOpenCreateDeck}
        >
          <Plus size={16} />
          <span>Tạo bộ từ vựng</span>
        </button>
      </div>

      {/* Toolbar Row */}
      <div className="main-toolbar-row">
        <div className="toolbar-search-wrapper">
          <Search size={16} className="toolbar-search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Tìm kiếm bộ từ vựng..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-sort-wrapper">
          <ArrowUpDown size={15} className="toolbar-sort-icon" />
          <select
            className="toolbar-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sắp xếp bộ từ vựng"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name_asc">A-Z</option>
            <option value="count_desc">Số lượng thẻ</option>
          </select>
        </div>
      </div>

      {/* Two-Column Area */}
      <div className="workspace-columns">
        {/* Column A: Left Folder Panel */}
        <FolderPanel
          folders={folders}
          selectedFolderId={selectedFolderId}
          isUncategorizedSelected={isUncategorizedSelected}
          onSelectAll={handleSelectAll}
          onSelectUncategorized={handleSelectUncategorized}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={() => {
            setFolderToEdit(null);
            setIsCreateFolderOpen(true);
          }}
          onEditFolder={(folder) => {
            setFolderToEdit(folder);
            setIsCreateFolderOpen(true);
          }}
          onDeleteFolder={(folder) => setFolderToDelete(folder)}
          totalDeckCount={decks.length}
          uncategorizedDeckCount={uncategorizedDeckCount}
        />

        {/* Column B: Right Deck Area */}
        <DeckList
          decks={filteredAndSortedDecks}
          onCreateDeck={handleOpenCreateDeck}
          onOpenDeck={(deck) => navigate(`/decks/${deck.id}`)}
          onEditDeck={(deck) => handleOpenEditDeck(deck)}
          onMoveDeck={(deck) => setDeckToMove(deck)}
          onDeleteDeck={(deck) => setDeckToDelete(deck)}
          loading={loading}
          isFilteredBySearch={Boolean(globalSearchQuery.trim())}
        />
      </div>

      {/* Modals & Dialogs */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => {
          setIsCreateFolderOpen(false);
          setFolderToEdit(null);
        }}
        onSubmit={handleCreateOrEditFolder}
        folderToEdit={folderToEdit}
      />

      <DeleteFolderModal
        isOpen={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
        folder={folderToDelete}
        onConfirm={handleDeleteFolderConfirm}
      />

      <DeckFormModal
        isOpen={isDeckFormOpen}
        onClose={() => {
          setIsDeckFormOpen(false);
          setDeckToEdit(null);
        }}
        onSubmit={handleSaveDeck}
        folders={folders}
        onCreateFolderQuick={handleQuickCreateFolder}
        currentFolderId={selectedFolderId}
        deckToEdit={deckToEdit}
      />

      <MoveDeckModal
        isOpen={Boolean(deckToMove)}
        onClose={() => setDeckToMove(null)}
        deck={deckToMove}
        folders={folders}
        onConfirm={handleMoveDeckConfirm}
      />

      <ConfirmDialog
        isOpen={Boolean(deckToDelete)}
        onClose={() => setDeckToDelete(null)}
        onConfirm={handleDeleteDeckConfirm}
        title="Xóa bộ từ vựng"
        message={`Bạn có chắc chắn muốn xóa bộ từ vựng "${deckToDelete?.name}"? Các thẻ từ và tiến độ học tập gắn liền với bộ từ này sẽ bị xóa vĩnh viễn.`}
        confirmText="Xác nhận xóa"
        confirmVariant="danger"
      />

      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
