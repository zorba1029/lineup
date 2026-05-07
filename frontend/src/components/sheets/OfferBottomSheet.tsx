import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@/lib/validation';
import { ApiError } from '@/lib/api';
import { useCreateOffer } from '@/features/offers/useCreateOffer';
import { useUpdateOffer } from '@/features/offers/useUpdateOffer';
import type { OfferPublic } from '@/lib/types';

/**
 * 화면 07-08 (빌려주기 2-step bottom sheet). PLAN.md §1.D.
 * 신규/수정 동일 UI — `editingOffer` prop이 있으면 수정 모드.
 */
const RENTAL_TIME_PRESETS = ['5분 후', '10분 후', '20분 후', '30분 후'] as const;
const RETURN_TIME_PRESETS = ['1시간 내', '2시간 내', '3시간 내', '만나서 협의'] as const;

const schema = z.object({
  rental_time: z
    .string()
    .trim()
    .min(1, '대여 시간을 입력해주세요')
    .max(20, '20자 이하로 입력해주세요'),
  return_time: z
    .string()
    .trim()
    .min(1, '반납 시간을 입력해주세요')
    .max(20, '20자 이하로 입력해주세요'),
  rental_place: z
    .string()
    .trim()
    .min(1, '대여 장소를 입력해주세요')
    .max(60, '60자 이하로 입력해주세요'),
  return_place: z
    .string()
    .trim()
    .min(1, '반납 장소를 입력해주세요')
    .max(60, '60자 이하로 입력해주세요'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  requestId: number;
  requestName?: string;
  editingOffer?: OfferPublic;
}

export function OfferBottomSheet({
  open,
  onClose,
  requestId,
  requestName,
  editingOffer,
}: Props) {
  const navigate = useNavigate();
  const isEditing = !!editingOffer;
  const create = useCreateOffer(requestId);
  const update = useUpdateOffer(editingOffer?.id ?? 0, requestId);

  const [step, setStep] = useState<1 | 2>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rental_time: editingOffer?.rental_time ?? '',
      return_time: editingOffer?.return_time ?? '',
      rental_place: editingOffer?.rental_place ?? '',
      return_place: editingOffer?.return_place ?? '',
    },
  });

  // open / editingOffer 변경 시 폼/스텝 reset
  useEffect(() => {
    if (open) {
      reset({
        rental_time: editingOffer?.rental_time ?? '',
        return_time: editingOffer?.return_time ?? '',
        rental_place: editingOffer?.rental_place ?? '',
        return_place: editingOffer?.return_place ?? '',
      });
      setStep(1);
      setSubmitError(null);
    }
  }, [open, editingOffer, reset]);

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

  const rentalTime = watch('rental_time');
  const returnTime = watch('return_time');

  const handleNext = async () => {
    setSubmitError(null);
    const ok = await trigger(['rental_time', 'return_time']);
    if (ok) setStep(2);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      rental_time: values.rental_time.trim(),
      return_time: values.return_time.trim(),
      rental_place: values.rental_place.trim(),
      return_place: values.return_place.trim(),
    };
    try {
      if (isEditing) {
        await update.mutateAsync(payload);
        onClose();
      } else {
        const created = await create.mutateAsync(payload);
        onClose();
        navigate('/offers/registered', {
          state: { offer: created, requestName: requestName ?? '' },
          replace: true,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSubmitError(
            err.message || '이미 빌려주기를 등록했거나 다른 사용자가 먼저 매칭됐어요.',
          );
        } else if (err.status === 403) {
          setSubmitError(err.message || '권한이 없습니다.');
        } else {
          setSubmitError(err.message || '저장에 실패했습니다.');
        }
      } else {
        setSubmitError('네트워크 오류가 발생했습니다.');
      }
    }
  });

  const isPending = create.isPending || update.isPending;

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

        {/* Step indicator */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className={
              'h-2 w-2 rounded-full transition-colors ' +
              (step === 1 ? 'bg-primary' : 'bg-border')
            }
          />
          <span
            className={
              'h-2 w-2 rounded-full transition-colors ' +
              (step === 2 ? 'bg-primary' : 'bg-border')
            }
          />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {submitError ? (
            <div className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
              {submitError}
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className="text-lg font-bold text-text">언제 주고 받을까요?</h2>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text" htmlFor="rental_time">
                  대여 시간
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RENTAL_TIME_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={rentalTime === p}
                      onClick={() =>
                        setValue('rental_time', p, { shouldValidate: true })
                      }
                      className={
                        'rounded-lnb-sm border px-3 py-1.5 text-xs font-bold transition-colors ' +
                        (rentalTime === p
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border bg-card text-sub')
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  id="rental_time"
                  maxLength={20}
                  placeholder="직접 입력 (예: 오후 3시)"
                  className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
                  {...register('rental_time')}
                />
                {errors.rental_time ? (
                  <span className="text-xs text-accent">
                    {errors.rental_time.message}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text" htmlFor="return_time">
                  반납 시간
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RETURN_TIME_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={returnTime === p}
                      onClick={() =>
                        setValue('return_time', p, { shouldValidate: true })
                      }
                      className={
                        'rounded-lnb-sm border px-3 py-1.5 text-xs font-bold transition-colors ' +
                        (returnTime === p
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border bg-card text-sub')
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  id="return_time"
                  maxLength={20}
                  placeholder="직접 입력 (예: 내일 오전)"
                  className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
                  {...register('return_time')}
                />
                {errors.return_time ? (
                  <span className="text-xs text-accent">
                    {errors.return_time.message}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="mt-2 h-12 rounded-lnb bg-primary font-bold text-white shadow-lnb-sm transition-colors hover:bg-primary-dark"
              >
                다음
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text">어디서 주고 받을까요?</h2>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="rental_place"
                  className="text-sm font-bold text-text"
                >
                  대여 장소
                </label>
                <input
                  id="rental_place"
                  maxLength={60}
                  placeholder="예: 현관 앞, 엘리베이터 앞"
                  className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
                  {...register('rental_place')}
                />
                {errors.rental_place ? (
                  <span className="text-xs text-accent">
                    {errors.rental_place.message}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="return_place"
                  className="text-sm font-bold text-text"
                >
                  반납 장소
                </label>
                <input
                  id="return_place"
                  maxLength={60}
                  placeholder="예: 현관 앞, 엘리베이터 앞"
                  className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
                  {...register('return_place')}
                />
                {errors.return_place ? (
                  <span className="text-xs text-accent">
                    {errors.return_place.message}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="h-12 w-24 rounded-lnb border border-border bg-card font-bold text-sub disabled:opacity-50"
                >
                  ← 이전
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-12 flex-1 rounded-lnb bg-primary font-bold text-white shadow-lnb-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {isPending
                    ? '저장 중…'
                    : isEditing
                      ? '수정하기'
                      : '등록하기'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
