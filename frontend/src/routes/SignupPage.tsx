import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { zodResolver } from '@/lib/validation';
import { useSignup } from '@/features/auth/useSignup';
import { ApiError } from '@/lib/api';
import { DetailHeader } from '@/components/layout/DetailHeader';

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, '아이디는 3자 이상 입력해주세요')
      .max(40, '아이디는 40자 이하로 입력해주세요'),
    password: z.string().min(6, '비밀번호는 6자 이상 입력해주세요'),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
    name: z
      .string()
      .min(1, '이름을 입력해주세요')
      .max(40, '이름은 40자 이하로 입력해주세요'),
    dong: z
      .string()
      .min(2, '동을 입력해주세요 (예: 101동)')
      .max(10, '동은 10자 이하로 입력해주세요')
      .regex(/동$/, '"동"으로 끝나야 해요 (예: 101동)'),
    unit: z
      .string()
      .min(2, '호수를 입력해주세요 (예: 101호)')
      .max(10, '호수는 10자 이하로 입력해주세요')
      .regex(/호$/, '"호"로 끝나야 해요 (예: 101호)'),
    phone: z
      .string()
      .min(9, '전화번호를 정확히 입력해주세요')
      .max(20, '전화번호가 너무 길어요'),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: '비밀번호가 일치하지 않아요',
    path: ['passwordConfirm'],
  });

type SignupForm = z.infer<typeof signupSchema>;

const INPUT_CLS =
  'h-12 w-full rounded-[10px] border border-wd-border-default bg-wd-bg-primary px-3.5 text-[15px] text-wd-fg-primary outline-none transition-colors placeholder:text-wd-fg-quaternary focus:border-wd-primary';

/**
 * 화면 02 (회원가입). Wanted DS lu-auth + DetailHeader 패턴.
 */
export function SignupPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const signup = useSignup();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      password: '',
      passwordConfirm: '',
      name: '',
      dong: '',
      unit: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!signup.error) {
      setFormError(null);
      return;
    }
    if (signup.error instanceof ApiError) {
      if (signup.error.status === 409) {
        setError('username', {
          type: 'server',
          message: '이미 사용 중인 아이디예요',
        });
        setFormError(null);
        return;
      }
      setFormError(signup.error.message || '회원가입에 실패했습니다.');
      return;
    }
    setFormError('네트워크 오류가 발생했습니다.');
  }, [signup.error, setError]);

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const payload = {
      username: values.username,
      password: values.password,
      name: values.name,
      dong: values.dong,
      unit: values.unit,
      phone: values.phone,
    };
    signup.mutate(payload);
  });

  return (
    <div className="flex min-h-full flex-col">
      <DetailHeader title="회원가입" onBack={() => navigate('/login')} />

      <div className="flex flex-col gap-4 px-6 pb-6 pt-5">
        <div>
          <h2 className="font-display text-[22px] font-extrabold tracking-tight text-wd-fg-primary">
            우리 라인 이웃으로 시작해요
          </h2>
          <p className="mt-1.5 text-[13px] text-wd-fg-tertiary">
            같은 동·라인 이웃에게만 글이 보여요.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError ? (
            <div
              role="alert"
              className="rounded-[10px] border border-wd-negative/30 bg-wd-negative-soft px-3 py-2 text-[13px] text-wd-negative"
            >
              {formError}
            </div>
          ) : null}

          <Field label="아이디" htmlFor="username" error={errors.username?.message}>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="3자 이상"
              className={INPUT_CLS}
              {...register('username')}
            />
          </Field>

          <Field label="비밀번호" htmlFor="password" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="6자 이상"
              className={INPUT_CLS}
              {...register('password')}
            />
          </Field>

          <Field
            label="비밀번호 확인"
            htmlFor="passwordConfirm"
            error={errors.passwordConfirm?.message}
          >
            <input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              className={INPUT_CLS}
              {...register('passwordConfirm')}
            />
          </Field>

          <Field label="이름" htmlFor="name" error={errors.name?.message}>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="예: 홍길동"
              className={INPUT_CLS}
              {...register('name')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="동" htmlFor="dong" error={errors.dong?.message}>
              <input
                id="dong"
                type="text"
                placeholder="101동"
                className={INPUT_CLS}
                {...register('dong')}
              />
            </Field>
            <Field label="호수" htmlFor="unit" error={errors.unit?.message}>
              <input
                id="unit"
                type="text"
                placeholder="101호"
                className={INPUT_CLS}
                {...register('unit')}
              />
            </Field>
          </div>

          <Field label="전화번호" htmlFor="phone" error={errors.phone?.message}>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="010-1234-5678"
              className={INPUT_CLS}
              {...register('phone')}
            />
            <span className="text-[11px] text-wd-fg-tertiary">
              거래가 성사된 이웃에게만 공개됩니다.
            </span>
          </Field>

          <button
            type="submit"
            disabled={signup.isPending}
            className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-wd-primary px-5 text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98] disabled:opacity-50"
          >
            {signup.isPending ? '가입 중…' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-[13px] text-wd-fg-tertiary">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="font-bold text-wd-primary">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-bold text-wd-fg-primary">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[12px] text-wd-negative">{error}</span>
      ) : null}
    </div>
  );
}
