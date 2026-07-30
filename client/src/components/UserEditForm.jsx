/**
 * UserEditForm — controlled component, dùng cho cả Add và Edit user.
 *
 * Áp dụng:
 *   - Task 1: Password input có toggle show/hide bằng icon con mắt.
 *   - Task 2: Grid đều cho cụm Username & Password (md:grid-cols-2).
 *   - Task 4: Select Role (Manager/Staff) — CHỈ hiển thị và CHỈ gửi lên API khi
 *     người đang đăng nhập là Admin. Staff/Manager không thấy dropdown.
 *
 * Controlled: parent truyền `value` và `onChange` để có thể tính isDirty.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Save, X } from 'lucide-react';

import { Button } from './ui/Button';
import { Input, Label, Select } from './ui/Input';
import { ROLES } from '../utils/constants';

export function UserEditForm({
  value,
  onChange,
  mode,
  isAdmin,
  isSelf, // true nếu đang edit chính mình
  onSave,
  onCancel,
}) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  function set(field, v) {
    onChange?.({ ...value, [field]: v });
  }

  const canEditRole = isAdmin && (mode === 'add' || !isSelf);

  // Edit mode: backend trả về password plaintext (khi ALLOW_PASSWORD_LEAK=1), hiển thị
  // trực tiếp trong input. Icon mắt toggle giữa ẩn (password) / hiện (text).
  // Add mode: input rỗng, user gõ mới.
  const isEdit = mode === 'edit';

  return (
    <div>
      {/* Task 2: Grid đều 2 cột cho Username + Password (cùng cụm ngang hàng). */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ue-username-${mode}`}>{t('username')}</Label>
          <Input
            id={`ue-username-${mode}`}
            value={value.username || ''}
            onChange={(e) => set('username', e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ue-password-${mode}`}>{t('password')}</Label>
          {/* Task 1: type="password" mặc định + icon con mắt toggle.
              Edit mode hiển thị password thật (backend trả về plaintext khi
              ALLOW_PASSWORD_LEAK=1). User click icon mắt → toggle text/password.
              Add mode thì input trống, user tự gõ. */}
          <div className="relative">
            <Input
              id={`ue-password-${mode}`}
              type={showPassword ? 'text' : 'password'}
              value={value.password || ''}
              onChange={(e) => set('password', e.target.value)}
              autoComplete={isEdit ? 'off' : 'new-password'}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              title={showPassword ? t('hidePassword') : t('showPassword')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-secondary hover:text-ink-primary"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {isEdit && (
            <p className="text-xs text-ink-muted m-0">
              {t('passwordHintLeaveBlank', { defaultValue: 'Mật khẩu hiện tại. Để trống và nhập mới nếu muốn đổi.' })}
            </p>
          )}
        </div>

        {/* Task 4: Role select — chỉ hiển thị khi current user là Admin. */}
        {canEditRole && (
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor={`ue-role-${mode}`}>{t('role')}</Label>
            <Select
              id={`ue-role-${mode}`}
              value={value.role || ROLES.STAFF}
              onChange={(e) => set('role', e.target.value)}
            >
              <option value={ROLES.MANAGER}>{t('manager')}</option>
              <option value={ROLES.STAFF}>{t('staff')}</option>
            </Select>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-5 pt-5 border-t border-wp-gray-dark">
        <Button variant="primary" leftIcon={<Save size={14} />} onClick={() => onSave?.(value)}>
          {t('saveUser')}
        </Button>
        <Button variant="secondary" leftIcon={<X size={14} />} onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}