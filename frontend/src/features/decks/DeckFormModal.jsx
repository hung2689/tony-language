import { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Tabs from '../../components/common/Tabs';
import BulkImportTab from '../bulkimport/BulkImportTab';
import { useStudyPlan } from '../studyplan/StudyPlanContext';
import { Plus, Trash2, FolderPlus, Edit3, Upload, Sparkles, AlertCircle } from 'lucide-react';

const emptyCard = () => ({
  id: null,
  term: '',
  definition: '',
  pronunciation: '',
  partOfSpeech: '',
  example: '',
  synonymsText: '',
});

export default function DeckFormModal({
  isOpen,
  onClose,
  onSubmit,
  folders = [],
  onCreateFolderQuick,
  currentFolderId = null,
  deckToEdit = null,
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [cards, setCards] = useState([emptyCard()]);
  const [errors, setErrors] = useState({});
  const [quickFolderName, setQuickFolderName] = useState('');
  const [isQuickFolderOpen, setIsQuickFolderOpen] = useState(false);
  const { activePlan } = useStudyPlan();
  const [addToStudyPlan, setAddToStudyPlan] = useState(false);

  useEffect(() => {
    if (deckToEdit) {
      setName(deckToEdit.name || '');
      setDescription(deckToEdit.description || '');
      setFolderId(deckToEdit.folderId ? String(deckToEdit.folderId) : '');
      if (deckToEdit.cards && deckToEdit.cards.length > 0) {
        setCards(
          deckToEdit.cards.map((c) => ({
            id: c.id || null,
            term: c.term || '',
            definition: c.definition || '',
            pronunciation: c.pronunciation || '',
            partOfSpeech: c.partOfSpeech || '',
            example: c.example || '',
            synonymsText: Array.isArray(c.synonyms) ? c.synonyms.join('; ') : '',
          }))
        );
      } else {
        setCards([emptyCard()]);
      }
    } else {
      setName('');
      setDescription('');
      setFolderId(currentFolderId ? String(currentFolderId) : '');
      setCards([emptyCard(), emptyCard()]);
    }
    setErrors({});
    setActiveTab('manual');
    setIsQuickFolderOpen(false);
  }, [deckToEdit, currentFolderId, isOpen]);

  const isEditing = Boolean(deckToEdit);

  const handleCardChange = (index, field, value) => {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    if (errors[`card_${index}_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`card_${index}_${field}`];
        return next;
      });
    }
  };

  const handleAddCard = () => {
    setCards((prev) => [...prev, emptyCard()]);
  };

  const handleRemoveCard = (index) => {
    if (cards.length <= 1) {
      alert('Bộ từ vựng cần có ít nhất 1 thẻ từ');
      return;
    }
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateQuickFolder = async () => {
    if (!quickFolderName.trim()) return;
    try {
      const newFolder = await onCreateFolderQuick(quickFolderName.trim());
      if (newFolder?.id) {
        setFolderId(String(newFolder.id));
      }
      setQuickFolderName('');
      setIsQuickFolderOpen(false);
    } catch {
      // Error handled by parent toast
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If user is on bulk tab, guide them to click "Thêm X thẻ vào bộ từ" first
    if (activeTab === 'bulk') {
      setErrors({ general: 'Vui lòng nhấn nút "Thêm thẻ vào bộ từ" trong tab Bulk Import trước, sau đó nhấn Hoàn thành.' });
      return;
    }

    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Tên bộ từ vựng không được để trống';
    }

    if (cards.length === 0) {
      newErrors.general = 'Cần có ít nhất 1 thẻ từ';
    }

    // Validate each card
    const normalizedTerms = new Set();
    cards.forEach((c, idx) => {
      const termTrimmed = c.term.trim();
      const defTrimmed = c.definition.trim();

      if (!termTrimmed) {
        newErrors[`card_${idx}_term`] = 'Vui lòng nhập thuật ngữ';
      } else {
        const lower = termTrimmed.toLowerCase();
        if (normalizedTerms.has(lower)) {
          newErrors[`card_${idx}_term`] = `Thuật ngữ "${termTrimmed}" bị trùng trong bộ từ`;
        } else {
          normalizedTerms.add(lower);
        }
      }

      if (!defTrimmed) {
        newErrors[`card_${idx}_definition`] = 'Vui lòng nhập định nghĩa';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payloadCards = cards.map((c) => ({
      id: c.id || null,
      term: c.term.trim(),
      definition: c.definition.trim(),
      pronunciation: c.pronunciation ? c.pronunciation.trim() : null,
      partOfSpeech: c.partOfSpeech ? c.partOfSpeech.trim() : null,
      example: c.example ? c.example.trim() : null,
      synonyms: c.synonymsText
        ? c.synonymsText
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    }));

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      folderId: folderId ? Number(folderId) : null,
      cards: payloadCards,
      addToStudyPlan: !isEditing && addToStudyPlan,
    });
  };

  const handleBulkImportCards = (importedCards) => {
    setCards((prev) => {
      // If current cards list only contains initial blank cards, replace them
      const isInitialEmpty =
        prev.length <= 2 && prev.every((c) => !c.term.trim() && !c.definition.trim());
      if (isInitialEmpty) {
        return importedCards;
      }
      return [...prev, ...importedCards];
    });
    // Seamlessly transition back to manual tab for review
    setActiveTab('manual');
  };

  const tabs = [
    { id: 'manual', label: 'Nhập thủ công', icon: <Edit3 size={15} /> },
    { id: 'bulk', label: 'Bulk import', icon: <Upload size={15} /> },
    { id: 'ai', label: 'Tạo bằng AI', icon: <Sparkles size={15} />, badge: 'Sắp ra mắt', disabled: true },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Chỉnh sửa bộ từ vựng' : 'Tạo bộ từ vựng mới'}
      maxWidth="860px"
    >
      <form onSubmit={handleSubmit} className="deck-form">
        {errors.general && (
          <div className="alert-banner alert-danger">
            <AlertCircle size={16} />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Deck Basic Info */}
        <div className="deck-form-info-grid">
          <Input
            label="Tên bộ từ vựng"
            required
            placeholder="Ví dụ: Oxford 3000, 50 động từ bất quy tắc..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={errors.name}
          />

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Thư mục lưu trữ</label>
              {!isQuickFolderOpen && (
                <button
                  type="button"
                  className="link-btn-sm"
                  onClick={() => setIsQuickFolderOpen(true)}
                >
                  <FolderPlus size={14} style={{ marginRight: '3px' }} />
                  + Tạo thư mục mới
                </button>
              )}
            </div>

            {isQuickFolderOpen ? (
              <div className="quick-folder-input-row">
                <input
                  type="text"
                  className="form-input form-input-sm"
                  placeholder="Nhập tên thư mục mới..."
                  value={quickFolderName}
                  onChange={(e) => setQuickFolderName(e.target.value)}
                  autoFocus
                />
                <Button size="sm" variant="primary" onClick={handleCreateQuickFolder}>
                  Lưu
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsQuickFolderOpen(false)}>
                  Hủy
                </Button>
              </div>
            ) : (
              <select
                className="form-select"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">-- Chưa phân loại (Không có thư mục) --</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <Input
          label="Mô tả bộ từ (tùy chọn)"
          placeholder="Mô tả mục đích hoặc chủ đề học tập..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {!isEditing && activePlan && (
          <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={addToStudyPlan}
                onChange={(e) => setAddToStudyPlan(e.target.checked)}
              />
              <span>Thêm bộ từ này vào lộ trình ôn tập &quot;{activePlan.name}&quot;</span>
            </label>
          </div>
        )}

        <div className="sidebar-divider" style={{ margin: '20px 0' }} />

        {/* 3-Tab Interface */}
        <div className="deck-terms-header">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <span className="deck-terms-count">Tổng cộng: {cards.length} thẻ</span>
        </div>

        {/* Tab Content */}
        <div style={{ display: activeTab === 'bulk' ? 'block' : 'none' }}>
          <BulkImportTab
            existingCards={cards}
            onImportCards={handleBulkImportCards}
          />
        </div>

        <div style={{ display: activeTab === 'manual' ? 'block' : 'none' }}>
          {/* Cards list (Manual Entry) */}
            <div className="deck-cards-editor">
              {cards.map((card, index) => (
                <div key={card.id || index} className="card-editor-item">
                  <div className="card-editor-header">
                    <span className="card-number">#{index + 1}</span>
                    <button
                      type="button"
                      className="card-remove-btn"
                      onClick={() => handleRemoveCard(index)}
                      title="Xóa thẻ này"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="card-editor-row-1">
                    <div className="form-group flex-2">
                      <label className="form-label-sm">
                        Thuật ngữ (Term) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors[`card_${index}_term`] ? 'is-invalid' : ''}`}
                        placeholder="VD: Essential"
                        value={card.term}
                        onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                      />
                      {errors[`card_${index}_term`] && (
                        <span className="form-error-sm">{errors[`card_${index}_term`]}</span>
                      )}
                    </div>

                    <div className="form-group flex-3">
                      <label className="form-label-sm">
                        Định nghĩa (Definition) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors[`card_${index}_definition`] ? 'is-invalid' : ''}`}
                        placeholder="VD: Cần thiết, thiết yếu"
                        value={card.definition}
                        onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                      />
                      {errors[`card_${index}_definition`] && (
                        <span className="form-error-sm">{errors[`card_${index}_definition`]}</span>
                      )}
                    </div>
                  </div>

                  <div className="card-editor-row-2">
                    <div className="form-group flex-1">
                      <label className="form-label-sm">Phiên âm (IPA)</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="VD: /ɪˈsen.ʃəl/"
                        value={card.pronunciation}
                        onChange={(e) => handleCardChange(index, 'pronunciation', e.target.value)}
                      />
                    </div>

                    <div className="form-group flex-1">
                      <label className="form-label-sm">Từ loại</label>
                      <select
                        className="form-select form-input-sm"
                        value={card.partOfSpeech}
                        onChange={(e) => handleCardChange(index, 'partOfSpeech', e.target.value)}
                      >
                        <option value="">-- Chọn --</option>
                        <option value="noun">Danh từ (noun)</option>
                        <option value="verb">Động từ (verb)</option>
                        <option value="adjective">Tính từ (adjective)</option>
                        <option value="adverb">Trạng từ (adverb)</option>
                        <option value="noun phrase">Cụm danh từ (noun phrase)</option>
                        <option value="verb phrase">Cụm động từ (verb phrase)</option>
                        <option value="phrasal verb">Cụm động từ (phrasal verb)</option>
                        <option value="preposition">Giới từ (preposition)</option>
                        <option value="conjunction">Liên từ (conjunction)</option>
                        <option value="pronoun">Đại từ (pronoun)</option>
                        <option value="interjection">Thán từ (interjection)</option>
                        <option value="idiom">Thành ngữ (idiom)</option>
                        <option value="phrase">Cụm từ (phrase)</option>
                        {card.partOfSpeech &&
                          !['noun', 'verb', 'adjective', 'adverb', 'noun phrase', 'verb phrase', 'phrasal verb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'idiom', 'phrase']
                            .includes(card.partOfSpeech.toLowerCase()) && (
                            <option value={card.partOfSpeech}>
                              {card.partOfSpeech} (Tùy chỉnh)
                            </option>
                          )}
                      </select>
                    </div>

                    <div className="form-group flex-2">
                      <label className="form-label-sm">Từ đồng nghĩa (phân cách bằng ;)</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="VD: vital; crucial; necessary"
                        value={card.synonymsText}
                        onChange={(e) => handleCardChange(index, 'synonymsText', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="card-editor-row-3">
                    <div className="form-group full-width">
                      <label className="form-label-sm">Câu ví dụ (Example)</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="VD: Water is essential for all living organisms."
                        value={card.example}
                        onChange={(e) => handleCardChange(index, 'example', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="add-card-button-wrapper">
              <Button
                variant="outline"
                onClick={handleAddCard}
                icon={Plus}
                className="w-full"
              >
                Thêm thẻ từ mới
              </Button>
            </div>
          </div>

        <div className="modal-footer" style={{ marginTop: '24px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Đang lưu bộ từ...' : isEditing ? 'Cập nhật bộ từ' : 'Hoàn thành tạo bộ từ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
