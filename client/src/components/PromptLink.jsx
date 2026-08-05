import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Simple Link wrapper that prompts when `isDirty` is true. This uses window.confirm fallback.
// For a custom modal you can lift state to a parent and call navigate programmatically after confirmation.
export function PromptLink({ to, isDirty, children, className }) {
  const navigate = useNavigate();

  const onClick = (e) => {
    if (!isDirty) return; // allow normal navigation
    e.preventDefault();

    const ok = window.confirm('Bạn có thay đổi chưa được lưu. Rời trang sẽ mất những thay đổi này?');
    if (ok) navigate(to);
  };

  return (
    <Link to={to} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
