import { useState } from 'react';

import { formatCurrencyFr, sanitizeMoneyInput } from '@/lib/money';

type CurrencyInputProps = {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  focusClassName?: string;
  activeFocusClassName?: string;
};

export default function CurrencyInput({
  value,
  onChange,
  className = '',
  focusClassName = 'focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md',
  activeFocusClassName = '',
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = !isFocused && value ? formatCurrencyFr(value) : value;

  return (
    <input
      type="text"
      className={`w-full h-full p-2 bg-transparent outline-none text-right transition-colors ${focusClassName} ${className} ${isFocused ? activeFocusClassName : ''}`}
      value={displayValue}
      onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
}
