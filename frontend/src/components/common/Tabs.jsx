export default function Tabs({
  tabs = [],
  activeTab,
  onTabChange,
  className = '',
}) {
  return (
    <div className={`tab-bar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;

        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-item ${isActive ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
