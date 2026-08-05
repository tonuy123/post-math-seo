/**
 * MyProfile — thẻ chỉ đọc + form chỉnh sửa cho người dùng đang đăng nhập.
 * Sao chép từ trang "My Profile" cũ. Tái sử dụng cùng logic chỉnh sửa mà
 * UserManagement dùng cho thẻ hồ sơ nhúng của nó.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { RoleBadge } from '../../components/ui/Badge';
import { UserEditForm } from '../../components/UserEditForm';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api/users';
import { MAX_FEATURED_IMAGE_BYTES } from '../../utils/constants';
import { fileToBase64 } from '../../utils/helpers';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

export default function MyProfile() {
  const { t } = useTranslation();
  const { user: me, refresh } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const isDirty =
    !!draft && !!snapshot &&
    JSON.stringify(draft) !== JSON.stringify(snapshot);
  useUnsavedChangesGuard(isDirty);

  function openEdit() {
    const initial = {
      // API identifier = username (quy ước công khai). Firebase
      // UID nằm trong `firebaseUid` để dùng cho phía server sau này.
      id: me.username,
      firebaseUid: me.firebaseUid || me.id,
      username: me.username,
      password: '',
      role: me.role,
      avatar: me.avatar,
    };
    setSnapshot(initial);
    setDraft(initial);
  }

  function cancel() {
    setDraft(null);
    setSnapshot(null);
  }

  async function handleAvatarUpload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(t('invalidImage'), 'error'); return; }
    if (file.size > MAX_FEATURED_IMAGE_BYTES) { showToast(t('imageTooLarge', { size: 500 }), 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      setDraft((prev) => ({ ...prev, avatar: base64 }));
      showToast(t('avatarUpdated'), 'success');
    } catch { showToast(t('error'), 'error'); }
  }

  async function save() {
    const e = draft;
    if (!e.username?.trim()) { showToast(t('pleaseEnterTitle'), 'error'); return; }
    const payload = {};
    if (e.username !== me.username) payload.username = e.username.trim();
    if (e.password) payload.password = e.password;
    payload.avatar = e.avatar || null;
    try {
      await usersApi.update(e.id, payload);
      showToast(t('userSavedSuccess'), 'success');
      setDraft(null);
      setSnapshot(null);
      await refresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (!me) return null;

  return (
    <section>
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-wp-gray">
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </Button>
        <h2 className="text-xl font-semibold text-ink-primary m-0">{t('userManagement')}</h2>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-5 p-6 bg-white rounded shadow-sm border border-wp-gray">
          <Avatar src={me.avatar} size="lg" />
          <div className="flex-1">
            <div className="text-lg font-semibold text-ink-primary">{me.username}</div>
            <div className="text-sm text-ink-secondary"><RoleBadge role={me.role} /></div>
          </div>
          {!draft && (
            <Button variant="primary" onClick={openEdit}>
              {t('editMyProfile')}
            </Button>
          )}
        </div>
      </div>

      {draft && (
        <div className="bg-[#f6f7f7] border border-wp-gray-dark rounded p-6 mb-6">
          <h3 className="text-base font-semibold mb-5">{t('editUserAccount')}</h3>

          <div className="flex flex-col items-center mb-6">
            <button
              type="button"
              onClick={() => document.getElementById('my-profile-avatar').click()}
              className="w-[100px] h-[100px] rounded-full bg-wp-gray border-2 border-dashed border-wp-gray-dark flex items-center justify-center overflow-hidden hover:border-wp-blue"
            >
              {draft.avatar
                ? <img src={draft.avatar} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-xs text-ink-muted">{t('clickToUploadAvatar')}</span>}
            </button>
            <input id="my-profile-avatar" type="file" accept="image/*" className="hidden"
                   onChange={(ev) => handleAvatarUpload(ev.target.files?.[0])} />
            <p className="text-xs text-ink-secondary mt-2">{t('clickToUploadAvatar')}</p>
          </div>

          <UserEditForm
            value={draft}
            onChange={setDraft}
            mode="edit"
            isAdmin={me?.role === 'admin'}
            isSelf={true}
            onSave={save}
            onCancel={cancel}
          />
        </div>
      )}
    </section>
  );
}