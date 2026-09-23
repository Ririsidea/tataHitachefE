import { useState } from 'react';
import { TextBox } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { eyeIcon, eyeSlashIcon } from '@progress/kendo-svg-icons';

export default function PasswordInput({ value, onChange, autoComplete, required, autoFocus }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <TextBox
        value={value}
        onChange={onChange}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
        suffix={() => (
          <Button
            type="button"
            fillMode="flat"
            className="password-toggle-btn"
            svgIcon={visible ? eyeSlashIcon : eyeIcon}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            tabIndex={-1}
          />
        )}
      />
    </div>
  );
}
