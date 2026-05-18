import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { zodResolver } from '@/lib/validation';
import { useLogin } from '@/features/auth/useLogin';
import { ApiError } from '@/lib/api';

const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

type LoginForm = z.infer<typeof loginSchema>;

const INPUT_CLS =
  'h-12 w-full rounded-[10px] border border-wd-border-default bg-wd-bg-primary px-3.5 text-[15px] text-wd-fg-primary outline-none transition-colors placeholder:text-wd-fg-quaternary focus:border-wd-primary';

/**
 * 화면 01 (로그인). Wanted DS lu-auth 톤 + "오늘의 라인이웃" 카드 신규.
 */
export function LoginPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    if (!login.error) {
      setFormError(null);
      return;
    }
    if (login.error instanceof ApiError) {
      if (login.error.status === 401) {
        setFormError('아이디 또는 비밀번호가 일치하지 않습니다.');
        return;
      }
      setFormError(login.error.message || '로그인에 실패했습니다.');
      return;
    }
    setFormError('네트워크 오류가 발생했습니다.');
  }, [login.error]);

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values);
  });

  return (
    <div className="flex min-h-full flex-col gap-6 px-6 pb-6 pt-8">
      {/* brand block */}
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-wd-primary font-display text-[22px] font-black text-white">
          옆
        </div>
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-wd-fg-primary">
            옆집마켓
          </h1>
          <p className="mt-1 text-[13px] text-wd-fg-tertiary">
            같은 라인 이웃과 즉시 빌리고 빌려주세요
          </p>
        </div>
      </div>

      {/* 오늘의 라인이웃 */}
      <div className="rounded-xl bg-wd-primary-soft px-3.5 py-3.5 text-[12px] font-semibold leading-relaxed text-wd-primary">
        <div className="mb-1 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM5 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[11px] font-extrabold tracking-wider">오늘의 라인이웃</span>
        </div>
        101동 01라인 이웃 6세대가 함께해요. 같은 라인 사람만 글을 볼 수 있어요.
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
            className={INPUT_CLS}
            {...register('username')}
          />
        </Field>

        <Field label="비밀번호" htmlFor="password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={INPUT_CLS}
            {...register('password')}
          />
        </Field>

        <button
          type="submit"
          disabled={login.isPending}
          className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-wd-primary px-5 text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98] disabled:opacity-50"
        >
          {login.isPending ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="text-center text-[13px] text-wd-fg-tertiary">
        처음이신가요?{' '}
        <Link to="/signup" className="font-bold text-wd-primary">
          회원가입
        </Link>
      </p>

      <div className="mt-auto rounded-[10px] bg-wd-bg-tertiary px-3 py-3 text-[11px] leading-relaxed text-wd-fg-tertiary">
        <span className="font-bold text-wd-fg-secondary">
          전화번호는 거래 성사 시점에만 공개
        </span>
        됩니다. <br />
        같은 동·라인 이웃이 아니면 글이 보이지 않아요.
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
