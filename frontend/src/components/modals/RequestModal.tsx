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
  /** NudgeBanner에서 추천 항목으로 모달을 열 때 사용. */
  prefill?: RequestPrefill | null;
}

/**
 * "도움이 필요해요" 등록 시트.
 * 모바일 bottom sheet 스타일 — backdrop + 아래에서 슬라이드 업.
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

  // 열릴 때 prefill 적용 / 닫힐 때 폼 리셋
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

  // ESC로 닫기
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
      if (err instanceof ApiError) {
        setSubmitError(err.message || '등록에 실패했습니다.');
      } else {
        setSubmitError('네트워크 오류가 발생했습니다.');
      }
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
      <div className="w-full max-w-mobile rounded-t-lnb bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-lnb">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">도움이 필요해요</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="text-2xl leading-none text-sub"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {submitError ? (
            <div className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-bold text-text">
              물건 이름
            </label>
            <input
              id="name"
              autoFocus
              maxLength={80}
              placeholder="예: 전동 드릴, 케이크 틀"
              className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
              {...register('name')}
            />
            {errors.name ? (
              <span className="text-xs text-accent">{errors.name.message}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-text">카테고리</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setValue('category', c as Category, { shouldValidate: true })
                  }
                  aria-pressed={category === c}
                  className={
                    'rounded-lnb-sm border px-3 py-1.5 text-xs font-bold transition-colors ' +
                    (category === c
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border bg-card text-sub')
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            {errors.category ? (
              <span className="text-xs text-accent">
                {errors.category.message}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-bold text-text">
              설명
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={200}
              placeholder="언제, 얼마나 필요한지 한 줄로 알려주세요"
              className="rounded-lnb-sm border border-border bg-card px-3 py-2 text-text outline-none focus:border-primary"
              {...register('description')}
            />
            {errors.description ? (
              <span className="text-xs text-accent">
                {errors.description.message}
              </span>
            ) : null}
          </div>

          <label className="flex items-center justify-between rounded-lnb-sm border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text">급해요</span>
              <span className="text-xs text-sub">목록에서 강조 표시돼요</span>
            </div>
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setValue('urgent', e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <button
            type="submit"
            disabled={create.isPending}
            className="mt-2 h-12 rounded-lnb bg-primary font-bold text-white shadow-lnb-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {create.isPending ? '등록 중…' : '같은 라인 이웃에게 알림 보내기'}
          </button>
        </form>
      </div>
    </div>
  );
}
