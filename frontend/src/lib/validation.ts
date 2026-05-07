import { z } from 'zod';
import type { FieldValues, Resolver } from 'react-hook-form';

/**
 * react-hook-form용 minimal zod resolver.
 * `@hookform/resolvers`를 추가하지 않기 위해 자체 구현.
 */
export function zodResolver<T extends FieldValues>(schema: z.ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      // 한 필드의 첫 번째 에러만 노출 (RHF 표준 동작)
      if (path && !errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }
    return {
      values: {},
      errors: errors as never,
    };
  };
}
