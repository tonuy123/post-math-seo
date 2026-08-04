import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Edit, Trash2, ChevronUp } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { RoleBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { UserEditForm } from '../../components/UserEditForm';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { usersApi } from '../../services/api/users';
import { ROLES } from '../../utils/constants';
import { formatDate, fileToBase64 } from '../../utils/helpers';
import { MAX_FEATURED_IMAGE_BYTES } from '../../utils/constants';

export default function UserManagement() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const safeUsers = users || [];
  const [loading, setLoading] = useState(true);

  // Task 5: track editingUserId (id user đang mở inline form) + snapshot gốc để so sánh dirty.
  const [editingUserId, setEditingUserId] = useState(null);
  const [originalSnapshot, setOriginalSnapshot] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [addDraft, setAddDraft] = useState(null);

  const isAdmin = me?.role === ROLES.ADMIN;

  // Task 3: Navigation Guard khi form đang dirty.
  const isEditDirty =
    !!editDraft && !!originalSnapshot &&
    JSON.stringify(editDraft) !== JSON.stringify(originalSnapshot);
  const isAddDirty =
    !!addDraft && !!(addDraft.username?.trim() || addDraft.password || addDraft.avatar);
  useUnsavedChangesGuard(isEditDirty || isAddDirty);

  async function load() {
    setLoading(true);
    try {
      const { users: list } = await usersApi.list();
      setUsers(list ?? []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // ---- Add flow ----
  function openAdd() {
    const initial = { mode: 'add', username: '', password: '', role: ROLES.STAFF, avatar: null };
    setAddDraft(initial);
    setAddMode(true);
    setEditingUserId(null);
    setEditDraft(null);
    setOriginalSnapshot(null);
  }
  function cancelAdd() { setAddMode(false); setAddDraft(null); }

  async function handleAddAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(t('invalidImage'), 'error'); return; }
    if (file.size > MAX_FEATURED_IMAGE_BYTES) { showToast(t('imageTooLarge', { size: 500 }), 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      setAddDraft((prev) => ({ ...prev, avatar: base64 }));
    } catch { showToast(t('error'), 'error'); }
  }

  async function saveAdd() {
    const e = addDraft;
    if (!e.username?.trim() || !e.password) {
      showToast(t('pleaseEnterTitle'), 'error');
      return;
    }
    try {
      const payload = {
        username: e.username.trim(),
        password: e.password,
        avatar: e.avatar,
      };
      // Task 4: role chỉ gửi khi current user là Admin.
      if (isAdmin) payload.role = e.role;
      await usersApi.create(payload);
      showToast(t('userSavedSuccess'), 'success');
      setAddMode(false);
      setAddDraft(null);
      setOriginalSnapshot(null);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ---- Edit flow (inline accordion) ----
  function openEdit(u) {
    const snapshot = {
      // `id` here is the API identifier = username (the backend's
      // public convention). Firestore doc id (= Firebase UID) is kept
      // as `firebaseUid` for future use, but NOT sent on the wire.
      id: u.username,
      firebaseUid: u.firebaseUid || u.id,
      username: u.username || '',
      // Backend (khi ALLOW_PASSWORD_LEAK=1) trả password plaintext → fill vào ô input
      // để admin xem được mật khẩu hiện tại. User có thể nhấn icon mắt toggle show/hide.
      password: u.password || '',
      role: u.role || ROLES.STAFF,
      avatar: u.avatar || null,
    };
    setOriginalSnapshot(snapshot);
    setEditDraft(snapshot);
    setEditingUserId(snapshot.id);
    setAddMode(false);
    setAddDraft(null);
  }
  function cancelEdit() {
    setEditingUserId(null);
    setEditDraft(null);
    setOriginalSnapshot(null);
  }

  async function handleEditAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(t('invalidImage'), 'error'); return; }
    if (file.size > MAX_FEATURED_IMAGE_BYTES) { showToast(t('imageTooLarge', { size: 500 }), 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      setEditDraft((prev) => ({ ...prev, avatar: base64 }));
    } catch { showToast(t('error'), 'error'); }
  }

  async function saveEdit() {
    const e = editDraft;
    if (!e.username?.trim()) {
      showToast(t('pleaseEnterTitle'), 'error');
      return;
    }
    try {
      const original = safeUsers.find((u) => u.id === e.id);
      const payload = {};
      if (e.username !== original?.username) payload.username = e.username.trim();
      // Chỉ gửi password khi user đã thay đổi (so với snapshot hiện tại).
      // Tránh việc gửi lại password thật đang hiển thị → backend hash lại làm hỏng.
      if (e.password && e.password !== originalSnapshot?.password) {
        payload.password = e.password;
      }
      payload.avatar = e.avatar || null;
      // Task 4: role chỉ gửi khi current user là Admin và không phải edit chính mình.
      if (isAdmin && me?.id !== e.id && e.role && e.role !== original?.role) {
        payload.role = e.role;
      }
      await usersApi.update(e.id, payload);
      showToast(t('userSavedSuccess'), 'success');
      setEditingUserId(null);
      setEditDraft(null);
      setOriginalSnapshot(null);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function removeUser(u) {
    confirm({
      message: t('confirmDeleteUser'),
      danger: true,
      onConfirm: async () => {
        try {
          await usersApi.remove(u.username);
          showToast(t('userDeletedSuccess'), 'success');
          await load();
        } catch (e) { showToast(e.message, 'error'); }
      },
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-wp-gray">
        <div className="flex items-center gap-4">
          <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard')}>
            {t('backToDashboard')}
          </Button>
          <h2 className="text-xl font-semibold text-ink-primary m-0">{t('userManagement')}</h2>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openAdd}>
          {t('addNewStaff')}
        </Button>
      </div>

      {/* Profile card (self) — vì backend listUsers() filter ra chính admin,
          self không có row trong table, nên ta mở Edit form ngay dưới card này
          (không dùng accordion inline như row khác). */}
      {me && (
        <div className="mb-8">
          <div className="flex items-center gap-5 p-6 bg-white rounded shadow-sm border border-wp-gray">
            <Avatar src={me.avatar} size="lg" />
            <div className="flex-1">
              <div className="text-lg font-semibold text-ink-primary">{me.username}</div>
              <div className="text-sm text-ink-secondary"><RoleBadge role={me.role} /></div>
            </div>
            <Button variant="primary" onClick={() => openEdit({ id: me.username, firebaseUid: me.firebaseUid || me.id, username: me.username, role: me.role, avatar: me.avatar, password: '' })}>
              {t('editMyProfile')}
            </Button>
          </div>
        </div>
      )}

      {/* Self edit form — hiển thị khi editingUserId === me.username.
          Self không có row trong table (backend listUsers filter ra admin), nên form
          phải render ở đây thay vì accordion inline. */}
      {me && editingUserId === me.username && editDraft && (
        <div className="bg-[#f6f7f7] border border-wp-gray-dark rounded p-6 mb-6">
          <h3 className="text-base font-semibold mb-5">{t('editUserAccount')}</h3>
          <div className="flex flex-col items-center mb-6">
            <AvatarUploader avatar={editDraft.avatar} inputId={`avatar-input-self`} onPick={handleEditAvatar} />
          </div>
          <UserEditForm
            value={editDraft}
            onChange={setEditDraft}
            mode="edit"
            isAdmin={isAdmin}
            isSelf={true}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </div>
      )}

      {/* Add form vẫn hiển thị trên cùng khi bấm "Add New Staff" */}
      {addMode && addDraft && (
        <div className="bg-[#f6f7f7] border border-wp-gray-dark rounded p-6 mb-6">
          <h3 className="text-base font-semibold mb-5">{t('addNewStaffAccount')}</h3>
          <div className="flex flex-col items-center mb-6">
            <AvatarUploader avatar={addDraft.avatar} inputId="avatar-input-add" onPick={handleAddAvatar} />
          </div>
          <UserEditForm
            value={addDraft}
            onChange={setAddDraft}
            mode="add"
            isAdmin={isAdmin}
            isSelf={false}
            onSave={saveAdd}
            onCancel={cancelAdd}
          />
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded shadow-sm border border-wp-gray">
        {loading ? (
          <div className="p-10 text-center"><Spinner /></div>
        ) : safeUsers.length === 0 ? (
          <div className="p-16 text-center text-ink-muted">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-wp-gray text-ink-secondary uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t('username')}</th>
                <th className="px-4 py-3 text-left">{t('role')}</th>
                <th className="px-4 py-3 text-left">{t('createdAt')}</th>
                <th className="px-4 py-3 text-left">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {safeUsers.map((u) => {
                const isOpen = editingUserId === u.id;
                const isSelf = me?.username === u.username;
                return (
                  <UserRow
                    key={u.id}
                    user={u}
                    me={me}
                    isOpen={isOpen}
                    isSelf={isSelf}
                    isAdmin={isAdmin}
                    draft={isOpen ? editDraft : null}
                    onEdit={() => openEdit(u)}
                    onCancel={cancelEdit}
                    onDraftChange={setEditDraft}
                    onAvatar={handleEditAvatar}
                    onSave={saveEdit}
                    onRemove={removeUser}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ============================================================
 * Sub-component: UserRow + Inline Edit Form (accordion dưới row)
 * ============================================================ */
function UserRow({
  user, me, isOpen, isSelf, isAdmin,
  draft, onEdit, onCancel, onDraftChange, onAvatar, onSave, onRemove,
}) {
  const { t } = useTranslation();
  return (
    <>
      <tr className="border-t border-wp-gray hover:bg-[#f6f7f7]">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} size="sm" />
            <span className="font-medium text-ink-primary">{user.username}</span>
          </div>
        </td>
        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
        <td className="px-4 py-3 text-ink-muted">{formatDate(user.createdAt)}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <Button
            variant="secondary" size="sm"
            leftIcon={isOpen ? <ChevronUp size={12} /> : <Edit size={12} />}
            onClick={isOpen ? onCancel : onEdit}
            className="mr-2"
          >
            {isOpen ? t('cancel') : t('edit')}
          </Button>
          <Button
            variant="danger" size="sm" leftIcon={<Trash2 size={12} />}
            disabled={user.username === me?.username || user.role === ROLES.ADMIN}
            onClick={() => onRemove(user)}
          >
            {t('delete')}
          </Button>
        </td>
      </tr>
      {/* Task 5: Inline Edit Form (accordion) hiển thị ngay dưới row khi editingUserId === user.id */}
      {isOpen && draft && (
        <tr className="border-t border-wp-gray bg-[#f6f7f7]">
          <td colSpan={4} className="px-4 py-5">
            <div className="flex flex-col items-center mb-5">
              <AvatarUploader avatar={draft.avatar} inputId={`avatar-input-edit-${user.id}`} onPick={onAvatar} />
            </div>
            <UserEditForm
              value={draft}
              onChange={onDraftChange}
              mode="edit"
              isAdmin={isAdmin}
              isSelf={isSelf}
              onSave={onSave}
              onCancel={onCancel}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function AvatarUploader({ avatar, inputId, onPick }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => document.getElementById(inputId).click()}
        className="w-[100px] h-[100px] rounded-full bg-wp-gray border-2 border-dashed border-wp-gray-dark flex items-center justify-center overflow-hidden hover:border-wp-blue"
      >
        {avatar
          ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
          : <span className="text-xs text-ink-muted">{t('clickToUploadAvatar')}</span>}
      </button>
      <input id={inputId} type="file" accept="image/*" className="hidden"
             onChange={(e) => onPick(e.target.files?.[0])} />
      <p className="text-xs text-ink-secondary mt-2">{t('clickToUploadAvatar')}</p>
    </div>
  );
}