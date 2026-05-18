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
 * 빌려주기 2-step bottom sheet. Wanted DS lu-sheet 톤.
 * Step 1: 대여/반납 시간 (preset chip rows + 직접 입력)
 * Step 2: 대여/반납 장소
 */
const RENTAL_TIME_PRESETS = ['5분 후', '10분 후', '20분 후', '30분 후'] as const;
const RETURN_TIME_PRESETS = ['1시간 내', '2시간 내', '3시간 내', '만나서 협의'] as const;

const schema = z.object({
  rental_time: z.string().trim().min(1, '대여 시간을 입력해주세요').max(20, '20자 이하로 입력해주세요'),
  return_time: z.string().trim().min(1, '반납 시간을 입력해주세요').max(20, '20자 이하로 입력해주세요'),
  rental_place: z.string().trim().min(1, '대여 장소를 입력해주세요').max(60, '60자 이하로 입력해주세요'),
  return_place: z.string().trim().min(1, '반납 장소를 입력해주세요').max(60, '60자 이하로 입력해주세요'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  requestId: number;
  requestName?: string;
  editingOffer?: OfferPublic;
}

const INPUT_CLS =
  'h-12 w-full rounded-[10px] border border-wd-border-default bg-wd-bg-primary px-3.5 text-[15px] text-wd-fg-primary outline-none transition-colors placeholder:text-wd-fg-quaternary focus:border-wd-primary';

const PRESET_CHIP =
  'inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors';

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
      <div className="w-full max-w-mobile animate-wd-slide-up rounded-t-3xl bg-wd-bg-primary px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-3 h-1 w-[42px] rounded-full bg-wd-border-strong" />

        {/* Step indicator: 2 dots */}
        <div className="mb-3 flex items-center justify-center gap-1.5">
          <span
            className={`h-[7px] w-[7px] rounded-full ${step === 1 ? 'bg-wd-primary' : 'bg-wd-border-default'}`}
          />
          <span
            className={`h-[7px] w-[7px] rounded-full ${step === 2 ? 'bg-wd-primary' : 'bg-wd-border-default'}`}
          />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
          {submitError ? (
            <div className="rounded-lg border border-wd-negative/30 bg-wd-negative-soft px-3 py-2 text-[13px] text-wd-negative">
              {submitError}
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className="text-[19px] font-extrabold tracking-tight text-wd-fg-primary">
                언제 주고 받을까요?
              </h2>
              {requestName ? (
                <p className="-mt-3 text-[12px] text-wd-fg-tertiary">
                  <strong className="text-wd-fg-secondary">{requestName}</strong>
                  을(를) 빌려드릴 시간 선택
                </p>
              ) : null}

              <PresetField
                label="대여 시간"
                presets={RENTAL_TIME_PRESETS}
                current={rentalTime}
                onPick={(p) => setValue('rental_time', p, { shouldValidate: true })}
                inputId="rental_time"
                inputProps={register('rental_time')}
                inputPlaceholder="직접 입력 (예: 오후 3시)"
                error={errors.rental_time?.message}
              />

              <PresetField
                label="반납 시간"
                presets={RETURN_TIME_PRESETS}
                current={returnTime}
                onPick={(p) => setValue('return_time', p, { shouldValidate: true })}
                inputId="return_time"
                inputProps={register('return_time')}
                inputPlaceholder="직접 입력 (예: 내일 오전)"
                error={errors.return_time?.message}
              />

              <button
                type="button"
                onClick={handleNext}
                className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-wd-primary text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98]"
              >
                다음
              </button>
            </>
          ) : (
            <>
              <h2 className="text-[19px] font-extrabold tracking-tight text-wd-fg-primary">
                어디서 주고 받을까요?
              </h2>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="rental_place" className="text-[13px] font-bold text-wd-fg-primary">
                  대여 장소
                </label>
                <input
                  id="rental_place"
                  maxLength={60}
                  placeholder="예: 현관 앞, 엘리베이터 앞"
                  className={INPUT_CLS}
                  {...register('rental_place')}
                />
                {errors.rental_place ? (
                  <span className="text-[12px] text-wd-negative">{errors.rental_place.message}</span>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="return_place" className="text-[13px] font-bold text-wd-fg-primary">
                  반납 장소
                </label>
                <input
                  id="return_place"
                  maxLength={60}
                  placeholder="예: 현관 앞, 엘리베이터 앞"
                  className={INPUT_CLS}
                  {...register('return_place')}
                />
                {errors.return_place ? (
                  <span className="text-[12px] text-wd-negative">{errors.return_place.message}</span>
                ) : null}
              </div>

              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="inline-flex h-12 w-24 items-center justify-center gap-1 rounded-xl border border-wd-border-default bg-wd-bg-primary text-[14px] font-bold text-wd-fg-primary transition-colors hover:bg-wd-bg-tertiary disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                    <path
                      d="M15 6l-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-wd-primary text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? '저장 중…' : isEditing ? '수정하기' : '등록하기'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function PresetField({
  label,
  presets,
  current,
  onPick,
  inputId,
  inputProps,
  inputPlaceholder,
  error,
}: {
  label: string;
  presets: readonly string[];
  current: string;
  onPick: (p: string) => void;
  inputId: string;
  inputProps: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  inputPlaceholder: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-bold text-wd-fg-primary">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = current === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(p)}
              className={
                PRESET_CHIP +
                ' ' +
                (active
                  ? 'border-wd-primary bg-wd-primary-soft text-wd-primary'
                  : 'border-wd-border-default bg-wd-bg-primary text-wd-fg-tertiary')
              }
            >
              {p}
            </button>
          );
        })}
      </div>
      <input
        id={inputId}
        maxLength={20}
        placeholder={inputPlaceholder}
        className={INPUT_CLS}
        {...inputProps}
      />
      {error ? <span className="text-[12px] text-wd-negative">{error}</span> : null}
    </div>
  );
}
