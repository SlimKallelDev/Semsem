import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  FileText,
  FileWarning,
  Flag,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PawPrint,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiRequest } from "./api";
import LocationAutocompleteFields from "./components/LocationAutocompleteFields";

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "reports", label: "Reports", icon: Flag },
];

const PROFILE_TYPES = [
  ["pet_owner", "Pet Owner"],
  ["veterinarian", "Veterinarian"],
  ["refuge", "Refuge"],
  ["associations", "Association"],
  ["breeders", "Breeder"],
  ["pet_sitters", "Pet Sitter"],
  ["groomer", "Groomer"],
  ["pet_shops", "Pet Shop"],
  ["boarding", "Boarding"],
];

const STATUS_LABELS = {
  active: "Active",
  blocked: "Blocked",
  published: "Published",
  suspended: "Suspended",
  banned: "Banned",
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
  actioned: "Action taken",
  approved: "Approved",
  archived: "Archived",
};

const REPORT_REASON_LABELS = {
  spam: "Spam or scam",
  misleading: "False or misleading information",
  inappropriate: "Inappropriate content",
  harassment: "Harassment or abuse",
  other: "Other reason",
};

const getStoredSession = () => {
  try {
    const value = JSON.parse(localStorage.getItem("semsem-admin-session"));
    return value?.token && value?.user?.role === "admin" ? value : null;
  } catch {
    return null;
  }
};

const formatDate = (value, withTime = false) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const profileTypeLabel = (value) =>
  PROFILE_TYPES.find(([id]) => id === value)?.[1] || value || "Not set";

function StatusBadge({ value }) {
  return (
    <span className={`status-badge status-${value || "unknown"}`}>
      {STATUS_LABELS[value] || value || "Unknown"}
    </span>
  );
}

function Avatar({ user, size = "medium" }) {
  const initial = String(user?.name || user?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return user?.avatar ? (
    <img className={`avatar avatar-${size}`} src={user.avatar} alt="" />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`}>{initial}</span>
  );
}

function IconButton({ label, danger = false, children, ...props }) {
  return (
    <button
      className={`icon-button ${danger ? "icon-button-danger" : ""}`}
      aria-label={label}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function LoadingRows({ columns = 5 }) {
  return (
    <tr>
      <td colSpan={columns}>
        <div className="loading-state">
          <RefreshCw size={18} className="spin" />
          Loading data...
        </div>
      </td>
    </tr>
  );
}

function EmptyRows({ columns = 5, text }) {
  return (
    <tr>
      <td colSpan={columns}>
        <div className="empty-state">{text}</div>
      </td>
    </tr>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span>
        Page <strong>{page}</strong> of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result?.user?.role !== "admin") {
        throw new Error("This account does not have administrator access.");
      }
      onLogin(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <img src="/semsem-logo.png" alt="Semsem" />
          <div>
            <strong>Semsem</strong>
            <span>Admin Portal</span>
          </div>
        </div>
        <div className="login-copy">
          <ShieldCheck size={28} />
          <h1>Administrator Portal</h1>
          <p>
            Sign in to manage accounts, appointments, and platform
            moderation.
          </p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <div className="form-error">
              <CircleAlert size={17} />
              {error}
            </div>
          ) : null}
          <button className="primary-button login-button" disabled={loading}>
            {loading ? <RefreshCw size={17} className="spin" /> : <ShieldCheck size={17} />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div className="login-aside-content">
          <span>Secure console</span>
          <h2>Semsem's essential operations, all in one place.</h2>
          <div className="login-feature-list">
            <p><Users size={18} /> Accounts and profiles</p>
            <p><PawPrint size={18} /> Linked pets</p>
            <p><CalendarDays size={18} /> Appointments</p>
            <p><Flag size={18} /> Reports</p>
          </div>
        </div>
      </aside>
    </main>
  );
}

function DashboardPage({ request }) {
  const [data, setData] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageYear, setUsageYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await request("/admin/dashboard"));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    setUsageLoading(true);
    request(`/admin/analytics/usage?year=${usageYear}`)
      .then((response) => {
        if (active) setUsage(response);
      })
      .finally(() => {
        if (active) setUsageLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, usageYear]);

  const stats = [
    { label: "Users", value: data?.counts?.users, icon: Users, detail: `${data?.counts?.activeUsers || 0} active · ${data?.counts?.blockedUsers || 0} blocked` },
    { label: "Pets", value: data?.counts?.pets, icon: PawPrint, detail: "Registered profiles" },
    { label: "Posts", value: data?.counts?.posts, icon: FileText, detail: `${data?.counts?.publishedPosts || 0} published · ${data?.counts?.blockedPosts || 0} blocked` },
    { label: "Appointments", value: data?.counts?.appointments, icon: CalendarDays, detail: `${data?.counts?.pendingAppointments || 0} pending` },
    { label: "Reports", value: data?.counts?.reports, icon: Flag, detail: `${data?.counts?.pendingReports || 0} to review` },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Overview"
        description="Monitor platform activity and the items that need your attention."
        action={
          <button className="secondary-button" type="button" onClick={load}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        }
      />
      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon, detail }) => (
          <article className="stat-card" key={label}>
            <div className="stat-icon"><Icon size={21} /></div>
            <div>
              <span>{label}</span>
              <strong>{loading ? "—" : value || 0}</strong>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="data-section usage-chart-section">
        <div className="section-heading">
          <div>
            <h2>Monthly active users</h2>
            <p>Unique users who performed an action in the application each month</p>
          </div>
          <select
            className="year-select"
            value={usageYear}
            onChange={(event) => setUsageYear(Number(event.target.value))}
          >
            {(usage?.availableYears || [usageYear]).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="usage-chart">
          {usageLoading ? (
            <div className="loading-state">
              <RefreshCw size={18} className="spin" />
              Loading usage analytics...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usage?.months || []} margin={{ top: 12, right: 24, left: -12, bottom: 4 }}>
                <CartesianGrid stroke="#e7ece8" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6f7972", fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#6f7972", fontSize: 12 }} />
                <Tooltip
                  cursor={{ stroke: "#b9c8bd", strokeWidth: 1 }}
                  contentStyle={{ border: "1px solid #d9e0db", borderRadius: 7, fontSize: 12 }}
                  formatter={(value) => [value, "Active users"]}
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  name="Active users"
                  stroke="#2f9e55"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#ffffff", stroke: "#2f9e55", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="data-section">
          <div className="section-heading">
            <div>
              <h2>Recent appointments</h2>
              <p>Latest updated requests</p>
            </div>
            <CalendarDays size={20} />
          </div>
          <div className="table-wrap compact-table">
            <table>
              <thead><tr><th>Participants</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? <LoadingRows columns={3} /> : null}
                {!loading && !data?.recentAppointments?.length ? <EmptyRows columns={3} text="No appointments yet." /> : null}
                {data?.recentAppointments?.map((item) => (
                  <tr key={item._id}>
                    <td><strong>{item.requester?.name || "User"}</strong><small>with {item.provider?.name || "Provider"}</small></td>
                    <td>{formatDate(item.requestedFor, true)}</td>
                    <td><StatusBadge value={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="data-section">
          <div className="section-heading">
            <div>
              <h2>Recent reports</h2>
              <p>Moderation queue</p>
            </div>
            <FileWarning size={20} />
          </div>
          <div className="table-wrap compact-table">
            <table>
              <thead><tr><th>Post</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? <LoadingRows columns={3} /> : null}
                {!loading && !data?.recentReports?.length ? <EmptyRows columns={3} text="No reports yet." /> : null}
                {data?.recentReports?.map((item) => (
                  <tr key={item._id}>
                    <td><strong>{item.post?.title || "Deleted post"}</strong><small>by {item.reporter?.name || "User"}</small></td>
                    <td>{REPORT_REASON_LABELS[item.reason] || item.reason}</td>
                    <td><StatusBadge value={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function UserEditModal({ user, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    country: user.country || "",
    governorate: user.governorate || user.city || "",
    profileType: user.profileType || "pet_owner",
    role: user.role || "user",
    status: user.status || "active",
  });
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Modal
      title="Edit profile"
      subtitle={`Account ${user.email}`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="button" onClick={() => onSave(form)} disabled={saving}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            Save changes
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label>Full name<input value={form.name} onChange={update("name")} /></label>
        <label>Email<input type="email" value={form.email} onChange={update("email")} /></label>
        <label>Phone<input value={form.phone} onChange={update("phone")} /></label>
        <LocationAutocompleteFields
          country={form.country}
          governorate={form.governorate}
          onChange={(location) =>
            setForm((current) => ({ ...current, ...location }))
          }
        />
        <label>Profile type<select value={form.profileType} onChange={update("profileType")}>{PROFILE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Role<select value={form.role} onChange={update("role")}><option value="user">User</option><option value="admin">Admin</option></select></label>
        <label>Status<select value={form.status} onChange={update("status")}><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
      </div>
    </Modal>
  );
}

function UsersPage({ request, notify, currentUser }) {
  const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [petsByUser, setPetsByUser] = useState({});
  const [petsLoading, setPetsLoading] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      setData(await request(`/admin/users?${params}`));
    } finally {
      setLoading(false);
    }
  }, [page, request, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const togglePets = async (user) => {
    if (expanded === user._id) {
      setExpanded(null);
      return;
    }
    setExpanded(user._id);
    if (petsByUser[user._id]) return;
    setPetsLoading(user._id);
    try {
      const response = await request(`/admin/users/${user._id}/pets`);
      setPetsByUser((current) => ({ ...current, [user._id]: response.pets || [] }));
    } finally {
      setPetsLoading(null);
    }
  };

  const saveUser = async (form) => {
    setSaving(true);
    try {
      await request(`/admin/users/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      notify("Profile updated.");
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name}'s account and all related data?`)) return;
    setDeleting(user._id);
    try {
      await request(`/admin/users/${user._id}`, { method: "DELETE" });
      notify("Account and related data deleted.");
      await load();
    } finally {
      setDeleting(null);
    }
  };

  const toggleUserStatus = async (user) => {
    const nextStatus = user.status === "blocked" ? "active" : "blocked";
    if (
      nextStatus === "blocked" &&
      !window.confirm(`Block ${user.name}? They will be signed out and hidden from Semsem.`)
    ) return;

    setUpdatingStatus(user._id);
    try {
      await request(`/admin/users/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      notify(nextStatus === "blocked" ? "Account blocked." : "Account activated.");
      await load();
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Profiles" title="User management" description={`${data.total} accounts registered on Semsem.`} />
      <section className="data-section">
        <div className="table-toolbar">
          <div className="search-field"><Search size={17} /><input placeholder="Search by name, email, or phone" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Profile</th><th>Type</th><th>Role</th><th>Status</th><th>Pets</th><th>Joined</th><th className="actions-column">Actions</th></tr></thead>
            <tbody>
              {loading ? <LoadingRows columns={7} /> : null}
              {!loading && !data.items.length ? <EmptyRows columns={7} text="No users match these filters." /> : null}
              {!loading && data.items.map((user) => (
                <UserRows
                  key={user._id}
                  user={user}
                  currentUser={currentUser}
                  expanded={expanded === user._id}
                  pets={petsByUser[user._id]}
                  petsLoading={petsLoading === user._id}
                  deleting={deleting === user._id}
                  updatingStatus={updatingStatus === user._id}
                  onToggle={() => togglePets(user)}
                  onEdit={() => setEditing(user)}
                  onToggleStatus={() => toggleUserStatus(user)}
                  onDelete={() => deleteUser(user)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      </section>
      {editing ? <UserEditModal user={editing} onClose={() => setEditing(null)} onSave={saveUser} saving={saving} /> : null}
    </>
  );
}

function UserRows({ user, currentUser, expanded, pets, petsLoading, deleting, updatingStatus, onToggle, onEdit, onToggleStatus, onDelete }) {
  return (
    <>
      <tr className={expanded ? "row-expanded" : ""}>
        <td><div className="profile-cell"><Avatar user={user} /><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td>
        <td>{profileTypeLabel(user.profileType)}</td>
        <td>{user.role === "admin" ? <span className="role-admin"><ShieldCheck size={14} /> Admin</span> : "User"}</td>
        <td><StatusBadge value={user.status} /></td>
        <td><button className="pet-count-button" type="button" onClick={onToggle}><PawPrint size={16} /> {user.petCount || 0} {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button></td>
        <td>{formatDate(user.createdAt)}</td>
        <td className="actions-column"><div className="row-actions"><IconButton label={user.status === "blocked" ? "Activate account" : "Block account"} danger={user.status !== "blocked"} onClick={onToggleStatus} disabled={updatingStatus || user._id === currentUser?._id}>{updatingStatus ? <RefreshCw size={17} className="spin" /> : user.status === "blocked" ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</IconButton><IconButton label="Edit" onClick={onEdit}><Pencil size={17} /></IconButton><IconButton label="Delete" danger onClick={onDelete} disabled={deleting || user._id === currentUser?._id}>{deleting ? <RefreshCw size={17} className="spin" /> : <Trash2 size={17} />}</IconButton></div></td>
      </tr>
      {expanded ? (
        <tr className="details-row">
          <td colSpan={7}>
            <div className="pet-details">
              <div className="pet-details-heading"><PawPrint size={18} /><strong>Pets linked to {user.name}</strong></div>
              {petsLoading ? <div className="loading-state"><RefreshCw size={17} className="spin" /> Loading pets...</div> : null}
              {!petsLoading && !pets?.length ? <div className="empty-inline">No pets are linked to this account.</div> : null}
              {!petsLoading && pets?.length ? (
                <div className="pet-list">
                  {pets.map((pet) => (
                    <article className="pet-item" key={pet._id}>
                      {pet.image || pet.images?.[0] ? <img src={pet.image || pet.images[0]} alt="" /> : <span className="pet-image-fallback"><PawPrint size={19} /></span>}
                      <div><strong>{pet.name}</strong><small>{pet.type}{pet.breed ? ` · ${pet.breed}` : ""}</small></div>
                      <span>{[pet.location?.governorate || pet.location?.city, pet.location?.country].filter(Boolean).join(", ") || "Location unavailable"}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PostEditModal({ post, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    title: post.title || "",
    description: post.description || "",
    status: ["blocked", "rejected", "archived"].includes(post.status)
      ? "blocked"
      : "published",
  });

  return (
    <Modal
      title="Edit post"
      subtitle={`Published by ${post.user?.name || "Unknown user"}`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="button" onClick={() => onSave(form)} disabled={saving}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            Save changes
          </button>
        </>
      }
    >
      <div className="form-stack">
        <label>
          Title
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            rows="6"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="published">Published</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
      </div>
    </Modal>
  );
}

function PostInteractionsModal({ data, loading, onClose }) {
  const [tab, setTab] = useState("likes");
  const items = tab === "likes" ? data?.likes || [] : data?.comments || [];

  return (
    <Modal
      title="Post interactions"
      subtitle={data?.post?.title || "Loading post..."}
      onClose={onClose}
      wide
    >
      <div className="interaction-summary">
        <div><Heart size={18} /><strong>{data?.likes?.length || 0}</strong><span>Likes</span></div>
        <div><MessageCircle size={18} /><strong>{data?.comments?.length || 0}</strong><span>Comments</span></div>
      </div>
      <div className="interaction-tabs">
        <button type="button" className={tab === "likes" ? "active" : ""} onClick={() => setTab("likes")}>
          <Heart size={16} /> Likes
        </button>
        <button type="button" className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>
          <MessageCircle size={16} /> Comments
        </button>
      </div>
      {loading ? (
        <div className="loading-state"><RefreshCw size={18} className="spin" /> Loading interactions...</div>
      ) : null}
      {!loading && !items.length ? (
        <div className="empty-state">No {tab} on this post yet.</div>
      ) : null}
      {!loading && items.length ? (
        <div className="interaction-list">
          {items.map((item) => (
            <article key={item._id}>
              <Avatar user={item.user} size="small" />
              <div>
                <strong>{item.user?.name || "Deleted user"}</strong>
                <small>{item.user?.email || formatDate(item.createdAt, true)}</small>
                {tab === "comments" ? <p>{item.text}</p> : null}
              </div>
              <time>{formatDate(item.createdAt, true)}</time>
            </article>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

function PostsPage({ request, notify }) {
  const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [moderating, setModerating] = useState(null);
  const [interactionsPost, setInteractionsPost] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [interactionsLoading, setInteractionsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      setData(await request(`/admin/posts?${params}`));
    } finally {
      setLoading(false);
    }
  }, [page, request, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const savePost = async (form) => {
    setSaving(true);
    try {
      await request(`/admin/posts/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      notify("Post updated.");
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm(`Permanently delete "${post.title}" and all its likes, comments, and reports?`)) return;
    setDeleting(post._id);
    try {
      await request(`/admin/posts/${post._id}`, { method: "DELETE" });
      notify("Post and related interactions deleted.");
      await load();
    } finally {
      setDeleting(null);
    }
  };

  const togglePostStatus = async (post) => {
    const nextStatus = post.status === "blocked" ? "published" : "blocked";
    setModerating(post._id);
    try {
      await request(`/admin/posts/${post._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      notify(nextStatus === "blocked" ? "Post blocked." : "Post published.");
      await load();
    } finally {
      setModerating(null);
    }
  };

  const openInteractions = async (post) => {
    setInteractionsPost(post);
    setInteractions(null);
    setInteractionsLoading(true);
    try {
      setInteractions(await request(`/admin/posts/${post._id}/interactions`));
    } finally {
      setInteractionsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Community content"
        title="Post management"
        description={`${data.total} posts published on Semsem.`}
      />
      <section className="data-section">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              placeholder="Search by title, description, or pet type"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Author</th>
                <th>Type</th>
                <th>Status</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Published</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows columns={8} /> : null}
              {!loading && !data.items.length ? <EmptyRows columns={8} text="No posts match these filters." /> : null}
              {!loading && data.items.map((post) => (
                <tr key={post._id}>
                  <td>
                    <div className="post-cell">
                      {post.image || post.images?.[0] ? (
                        <img src={post.image || post.images[0]} alt="" />
                      ) : (
                        <span><FileText size={18} /></span>
                      )}
                      <div><strong>{post.title}</strong><small>{post.description}</small></div>
                    </div>
                  </td>
                  <td><strong>{post.user?.name || "Deleted user"}</strong><small>{post.user?.email}</small></td>
                  <td>{post.type}</td>
                  <td><StatusBadge value={post.status} /></td>
                  <td><span className="interaction-count"><Heart size={15} /> {post.likesCount || 0}</span></td>
                  <td><span className="interaction-count"><MessageCircle size={15} /> {post.commentsCount || 0}</span></td>
                  <td>{formatDate(post.createdAt)}</td>
                  <td className="actions-column">
                    <div className="row-actions">
                      <IconButton label="View likes and comments" onClick={() => openInteractions(post)}><Eye size={17} /></IconButton>
                      <IconButton label={post.status === "blocked" ? "Publish post" : "Block post"} danger={post.status !== "blocked"} onClick={() => togglePostStatus(post)} disabled={moderating === post._id}>
                        {moderating === post._id ? <RefreshCw size={17} className="spin" /> : post.status === "blocked" ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
                      </IconButton>
                      <IconButton label="Edit post" onClick={() => setEditing(post)}><Pencil size={17} /></IconButton>
                      <IconButton label="Delete post" danger onClick={() => deletePost(post)} disabled={deleting === post._id}>
                        {deleting === post._id ? <RefreshCw size={17} className="spin" /> : <Trash2 size={17} />}
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      </section>
      {editing ? <PostEditModal post={editing} onClose={() => setEditing(null)} onSave={savePost} saving={saving} /> : null}
      {interactionsPost ? (
        <PostInteractionsModal
          data={interactions}
          loading={interactionsLoading}
          onClose={() => {
            setInteractionsPost(null);
            setInteractions(null);
          }}
        />
      ) : null}
    </>
  );
}

function AppointmentEditModal({ item, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    status: item.status,
    requestedFor: toDateTimeLocal(item.requestedFor),
    note: item.note || "",
  });
  return (
    <Modal
      title="Edit appointment"
      subtitle={`${item.requester?.name || "User"} with ${item.provider?.name || "Provider"}`}
      onClose={onClose}
      footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="button" onClick={() => onSave({ ...form, requestedFor: new Date(form.requestedFor).toISOString() })} disabled={saving || !form.requestedFor}>{saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}Save changes</button></>}
    >
      <div className="form-stack">
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></label>
        <label>Date and time<input type="datetime-local" value={form.requestedFor} onChange={(event) => setForm({ ...form, requestedFor: event.target.value })} /></label>
        <label>Note<textarea rows="5" maxLength="500" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
      </div>
    </Modal>
  );
}

function AppointmentsPage({ request, notify }) {
  const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (status) params.set("status", status);
      setData(await request(`/admin/appointments?${params}`));
    } finally {
      setLoading(false);
    }
  }, [page, request, status]);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    setSaving(true);
    try {
      await request(`/admin/appointments/${editing._id}`, { method: "PATCH", body: JSON.stringify(form) });
      notify("Appointment updated.");
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader eyebrow="Schedule" title="Appointment management" description={`${data.total} requests and appointments recorded.`} />
      <section className="data-section">
        <div className="table-toolbar table-toolbar-end">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Requester</th><th>Provider</th><th>Pet</th><th>Scheduled date</th><th>Note</th><th>Status</th><th className="actions-column">Action</th></tr></thead>
            <tbody>
              {loading ? <LoadingRows columns={7} /> : null}
              {!loading && !data.items.length ? <EmptyRows columns={7} text="No appointments found." /> : null}
              {!loading && data.items.map((item) => (
                <tr key={item._id}>
                  <td><div className="profile-cell"><Avatar user={item.requester} size="small" /><div><strong>{item.requester?.name || "Deleted account"}</strong><small>{item.requester?.email}</small></div></div></td>
                  <td><strong>{item.provider?.name || "Deleted account"}</strong><small>{profileTypeLabel(item.provider?.profileType)}</small></td>
                  <td>{item.pets?.map((pet) => pet.name).join(", ") || item.otherPet || "Not specified"}</td>
                  <td>{formatDate(item.requestedFor, true)}</td>
                  <td className="note-cell">{item.note || "—"}</td>
                  <td><StatusBadge value={item.status} /></td>
                  <td className="actions-column"><IconButton label="Edit appointment" onClick={() => setEditing(item)}><Pencil size={17} /></IconButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      </section>
      {editing ? <AppointmentEditModal item={editing} onClose={() => setEditing(null)} onSave={save} saving={saving} /> : null}
    </>
  );
}

function ReportEditModal({ report, onClose, onSave, saving }) {
  const [form, setForm] = useState({ status: report.status, postStatus: report.post?.status === "blocked" ? "blocked" : "published" });
  return (
    <Modal
      title="Review report"
      subtitle={report.post?.title || "Deleted post"}
      onClose={onClose}
      wide
      footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="button" onClick={() => onSave(form)} disabled={saving}>{saving ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}Apply decision</button></>}
    >
      <div className="report-review">
        <section>
          <span className="field-caption">Reason</span>
          <strong>{REPORT_REASON_LABELS[report.reason] || report.reason}</strong>
          <p>{report.details || "No additional details were provided."}</p>
        </section>
        <section>
          <span className="field-caption">Post</span>
          <strong>{report.post?.title || "Post unavailable"}</strong>
          <p>{report.post?.description || "The post has been deleted."}</p>
        </section>
      </div>
      <div className="form-grid report-form-grid">
        <label>Report decision<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="actioned">Action taken</option></select></label>
        <label>Post status<select value={form.postStatus} onChange={(event) => setForm({ ...form, postStatus: event.target.value })} disabled={!report.post}><option value="published">Published</option><option value="blocked">Blocked</option></select></label>
      </div>
    </Modal>
  );
}

function ReportsPage({ request, notify }) {
  const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (status) params.set("status", status);
      setData(await request(`/admin/reports?${params}`));
    } finally { setLoading(false); }
  }, [page, request, status]);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    setSaving(true);
    try {
      await request(`/admin/reports/${reviewing._id}`, { method: "PATCH", body: JSON.stringify(form) });
      notify("Report reviewed.");
      setReviewing(null);
      await load();
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader eyebrow="Moderation" title="Report management" description={`${data.total} reports submitted by the community.`} />
      <section className="data-section">
        <div className="table-toolbar table-toolbar-end">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="pending">Pending review</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="actioned">Action taken</option></select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Post</th><th>Reported by</th><th>Reason</th><th>Details</th><th>Date</th><th>Status</th><th className="actions-column">Action</th></tr></thead>
            <tbody>
              {loading ? <LoadingRows columns={7} /> : null}
              {!loading && !data.items.length ? <EmptyRows columns={7} text="No reports found." /> : null}
              {!loading && data.items.map((report) => (
                <tr key={report._id}>
                  <td><strong>{report.post?.title || "Deleted post"}</strong><small>{report.post?.user?.name ? `by ${report.post.user.name}` : ""}</small></td>
                  <td><div className="profile-cell"><Avatar user={report.reporter} size="small" /><div><strong>{report.reporter?.name || "Deleted account"}</strong><small>{report.reporter?.email}</small></div></div></td>
                  <td>{REPORT_REASON_LABELS[report.reason] || report.reason}</td>
                  <td className="note-cell">{report.details || "—"}</td>
                  <td>{formatDate(report.createdAt, true)}</td>
                  <td><StatusBadge value={report.status} /></td>
                  <td className="actions-column"><IconButton label="Review report" onClick={() => setReviewing(report)}><Eye size={17} /></IconButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      </section>
      {reviewing ? <ReportEditModal report={reviewing} onClose={() => setReviewing(null)} onSave={save} saving={saving} /> : null}
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(getStoredSession);
  const [section, setSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [fatalError, setFatalError] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("semsem-admin-session");
    setSession(null);
  }, []);

  const request = useCallback(
    async (path, options = {}) => {
      try {
        setFatalError("");
        return await apiRequest(path, { ...options, token: session?.token });
      } catch (error) {
        if (
          error.status === 401 ||
          (error.status === 403 && error.message.toLowerCase().includes("blocked"))
        ) {
          logout();
        } else {
          setFatalError(error.message);
        }
        throw error;
      }
    },
    [logout, session?.token]
  );

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const login = (result) => {
    const nextSession = { token: result.token, user: result.user };
    localStorage.setItem("semsem-admin-session", JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const currentNav = useMemo(
    () => NAV_ITEMS.find((item) => item.id === section),
    [section]
  );

  if (!session) return <LoginScreen onLogin={login} />;

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img src="/semsem-logo.png" alt="" />
          <div><strong>Semsem</strong><span>Administration</span></div>
          <IconButton label="Close menu" onClick={() => setSidebarOpen(false)}><X size={18} /></IconButton>
        </div>
        <nav>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? "nav-active" : ""} type="button" onClick={() => { setSection(id); setSidebarOpen(false); }}>
              <Icon size={19} />
              {label}
              {id === "reports" ? <span className="nav-dot" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Avatar user={session.user} size="small" />
          <div><strong>{session.user.name}</strong><span>Administrator</span></div>
          <IconButton label="Sign out" onClick={logout}><LogOut size={17} /></IconButton>
        </div>
      </aside>
      {sidebarOpen ? <button className="sidebar-overlay" type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} /> : null}
      <main className="main-area">
        <div className="mobile-topbar">
          <IconButton label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></IconButton>
          <div><strong>Semsem</strong><span>{currentNav?.label}</span></div>
          <Avatar user={session.user} size="small" />
        </div>
        <div className="page-content">
          {fatalError ? <div className="error-banner"><CircleAlert size={18} />{fatalError}<button type="button" onClick={() => setFatalError("")}><X size={16} /></button></div> : null}
          {section === "dashboard" ? <DashboardPage request={request} /> : null}
          {section === "users" ? <UsersPage request={request} notify={notify} currentUser={session.user} /> : null}
          {section === "posts" ? <PostsPage request={request} notify={notify} /> : null}
          {section === "appointments" ? <AppointmentsPage request={request} notify={notify} /> : null}
          {section === "reports" ? <ReportsPage request={request} notify={notify} /> : null}
        </div>
      </main>
      {toast ? <div className="toast"><CheckCircle2 size={18} />{toast}</div> : null}
    </div>
  );
}
