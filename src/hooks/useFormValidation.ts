import { useState } from 'react';
import { z } from 'zod';

interface UseFormValidationResult<T> {
  errors: Record<string, string>;
  hasError: (field: string) => boolean;
  getError: (field: string) => string | undefined;
  validate: (data: unknown) => boolean;
  clearError: (field: string) => void;
  clearErrors: () => void;
}

export function useFormValidation<T>(schema: z.ZodSchema<T>): UseFormValidationResult<T> {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(data: unknown): boolean {
    const result = schema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  function hasError(field: string): boolean {
    return Boolean(errors[field]);
  }

  function getError(field: string): string | undefined {
    return errors[field];
  }

  function clearError(field: string): void {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function clearErrors(): void {
    setErrors({});
  }

  return { errors, hasError, getError, validate, clearError, clearErrors };
}
