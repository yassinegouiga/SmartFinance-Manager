
const { useState: useStateN } = React;

const NTYPE = {
  warn: { bg: "var(--warn-soft)", fg: "var(--warn)", ic: "alert" },
  info: { bg: "var(--info-soft)", fg: "var(--info)", ic: "bell" },
  pos: { bg: "var(--pos-soft)", fg: "var(--pos)", ic: "trophy" },
};

function NotificationsPage() {
  const { notifications, actions } = useStore();
  const nav = useNav();
  const [filter, setFilter] = useStateN("all");
  const unread = notifications.filter(n => !n.read).length;
  const shown = notifications.filter(n => filter === "all" || !n.read);

  return (
    <div>
      <PageHead deps={[unread, notifications.length]}>
        {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={actions.markAllRead}><Icon name="check" size={16} /> <span className="hide-mobile">Mark all read</span></button>}
        {notifications.length > 0 && <button className="btn btn-outline btn-sm" onClick={actions.clearNotifs}><Icon name="trash" size={15} /> <span className="hide-mobile">Clear</span></button>}
      </PageHead>

      {notifications.length > 0 && (
        <div className="segmented accent mb16" style={{ width: "fit-content" }}>
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          <button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>Unread {unread > 0 && `(${unread})`}</button>
        </div>
      )}

      <div className="card" style={{ padding: 8 }}>
        {shown.length === 0 ? (
          <EmptyState icon="bell" title={filter === "unread" ? "You're all caught up" : "No notifications"} body={filter === "unread" ? "No unread alerts right now." : "Budget alerts, bill reminders and goal updates will appear here."} />
        ) : shown.map(n => {
          const t = NTYPE[n.type] || NTYPE.info;
          return (
            <button key={n.id} className="tx-row" style={{ width: "100%", textAlign: "left", background: n.read ? "transparent" : "var(--accent-soft-2)", alignItems: "flex-start", padding: "14px 12px" }}
              onClick={() => { actions.markNotifRead(n.id); if (n.link) nav.setPage(n.link); }}>
              <div className="cat-ic" style={{ background: t.bg, color: t.fg }}><Icon name={t.ic} size={19} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="between"><span className="fw7">{n.title}</span><span className="t-xs faint nowrap" style={{ marginLeft: 10 }}>{n.time}</span></div>
                <div className="t-sm muted mt4" style={{ lineHeight: 1.45 }}>{n.body}</div>
              </div>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flex: "none", marginTop: 6 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.NotificationsPage = NotificationsPage;
