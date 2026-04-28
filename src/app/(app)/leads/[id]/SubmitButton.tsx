"use client";
import { useFormStatus } from "react-dom";

interface Props {
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function SubmitButton({ pendingLabel, disabled, className, children }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
