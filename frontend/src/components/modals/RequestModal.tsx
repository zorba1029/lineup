import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@/lib/validation';
import { CATEGORIES, type Category } from '@/lib/categories';
import { useCreateRequest } from '@/features/requests/useCreateRequest';
import { ApiError } from '@/lib/api';

const schema = z.object({
  name: z
    .string()
    .min(1, '물건 이름을 입력해주세요')
    .max(80, '80자 이하로 입력해주세요'),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: '카테고리를 선택해주세요' }),
  }),
  description: z
    .string()
    .min(1, '간단한 설명을 입력해주세요')
    .max(200, '200자 이하로 입력해주세요'),
  urgent: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface RequestPrefill {
  name?: string;
  category?: Category;
  description?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: RequestPrefill | null;
}

const INPUT_CLS =
  'h-12 w-full rounded-[10px] border border-wd-border-default bg-wd-bg-primary px-3.5 text-[15px] text-wd-fg-primary outline-none transition-colors placeholder:text-wd-fg-quaternary focus:border-wd-primary';

/**
 * "도움이 필요해요" 등록 sheet. Wanted DS lu-sheet 톤.
 */
export function RequestModal({ open, onClose, prefill }: Props) {
  const create = useCreateRequest();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: '기타',
      description: '',
      urgent: false,
    },
  });

  const category = watch('category');
  const urgent = watch('urgent');

  useEffect(() => {
    if (open) {
      reset({
        name: prefill?.name ?? '',
        category: prefill?.category ?? '기타',
        description: prefill?.description ?? '',
        urgent: false,
      });
      setSubmitError(null);
    } else {
      reset({ name: '', category: '기타', description: '', urgent: false });
      setSubmitError(null);
    }
  }, [open, prefill, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const created = await create.mutateAsync(values);
      onClose();
      navigate(`/requests/${created.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message || '등록에 실패했습니다.'
          : '네트워크 오류가 발생했습니다.',
      );
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-mobile animate-wd-slide-up rounded-t-3xl bg-wd-bg-primary px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-3.5 h-1 w-[42px] rounded-full bg-wd-border-strong" />

        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[19px] font-extrabold tracking-tight text-wd-fg-primary">
            도움이 필요해요
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-wd-bg-tertiary text-wd-fg-tertiary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
          {submitError ? (
            <div className="rounded-lg border border-wd-negative/30 bg-wd-negative-soft px-3 py-2 text-[13px] text-wd-negative">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-[13px] font-bold text-wd-fg-primary">
              물건 이름
            </label>
            <input
              id="name"
              autoFocus
              maxLength={80}
              placeholder="예: 전동 드릴, 케이크 틀"
              className={INPUT_CLS}
              {...register('name')}
            />
            {errors.name ? (
              <span className="text-[12px] text-wd-negative">{errors.name.message}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-wd-fg-primary">카테고리</span>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setValue('category', c as Category, { shouldValidate: true })
                    }
                    aria-pressed={active}
                    className={
                      'inline-flex h-10 items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors ' +
                      (active
                        ? 'border-wd-primary bg-wd-primary-soft text-wd-primary'
                        : 'border-wd-border-default bg-wd-bg-primary text-wd-fg-tertiary')
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {errors.category ? (
              <span className="text-[12px] text-wd-negative">{errors.category.message}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-[13px] font-bold text-wd-fg-primary">
              설명
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={200}
              placeholder="언제, 얼마나 필요한지 한 줄로 알려주세요"
              className="w-full resize-none rounded-[10px] border border-wd-border-default bg-wd-bg-primary px-3.5 py-3 text-[15px] text-wd-fg-primary outline-none transition-colors placeholder:text-wd-fg-quaternary focus:border-wd-primary"
              {...register('description')}
            />
            {errors.description ? (
              <span className="text-[12px] text-wd-negative">{errors.description.message}</span>
            ) : null}
          </div>

          <label
            className={
              'flex items-center justify-between rounded-[10px] border px-3.5 py-3 transition-colors ' +
              (urgent
                ? 'border-wd-accent bg-wd-accent-soft'
                : 'border-wd-border-default bg-wd-bg-primary')
            }
          >
            <div className="flex flex-col gap-0.5">
              <span
                className={
                  'text-[14px] font-bold ' +
                  (urgent ? 'text-wd-accent' : 'text-wd-fg-primary')
                }
              >
                급해요
              </span>
              <span className="text-[11px] text-wd-fg-tertiary">
                목록에서 보라색으로 강조 표시돼요
              </span>
            </div>
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setValue('urgent', e.target.checked)}
              className="h-5 w-5"
              style={{ accentColor: 'var(--wd-color-accent)' }}
            />
          </label>

          <button
            type="submit"
            disabled={create.isPending}
            className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-wd-primary text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98] disabled:opacity-50"
          >
            {create.isPending ? '등록 중…' : '같은 라인 이웃에게 알림 보내기'}
          </button>
        </form>
      </div>
    </div>
  );
}
