import { useState } from 'react';
import { TextBox } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { eyeIcon, eyeSlashIcon } from '@progress/kendo-svg-icons';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export default function PasswordInput({ value, onChange, autoComplete, required, autoFocus }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <TextBox
        value={value}
        onChange={(e) => onChange(String(e.value ?? ''))}
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
