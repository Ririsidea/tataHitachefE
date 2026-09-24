export default function QuantityStepper({ value, min = 0, max, onChange, decreaseLabel = 'Decrease quantity' }) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className="qty-stepper">
      <button type="button" onClick={decrease} disabled={value <= min} aria-label={decreaseLabel}>
        –
      </button>
      <span className="qty-value" aria-live="polite">{value}</span>
      <button type="button" onClick={increase} disabled={value >= max} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}
