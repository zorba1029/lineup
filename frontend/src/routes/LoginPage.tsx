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

/**
 * 화면 01 (로그인). PLAN.md §1.A.
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

  // login.error → form 상단 에러 메시지 매핑
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
    <div className="flex flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-text">라인이웃</h1>
        <p className="text-sm text-sub">같은 라인 이웃과 즉시 빌리고 빌려주세요</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent"
          >
            {formError}
          </div>
        ) : null}

        <Field label="아이디" htmlFor="username" error={errors.username?.message}>
          <input
            id="username"
            type="text"
            autoComplete="username"
            className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
            {...register('username')}
          />
        </Field>

        <Field label="비밀번호" htmlFor="password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-11 rounded-lnb-sm border border-border bg-card px-3 text-text outline-none focus:border-primary"
            {...register('password')}
          />
        </Field>

        <button
          type="submit"
          disabled={login.isPending}
          className="mt-2 h-12 rounded-lnb bg-primary font-bold text-white shadow-lnb-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {login.isPending ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="text-center text-sm text-sub">
        아직 계정이 없나요?{' '}
        <Link to="/signup" className="font-bold text-primary">
          회원가입
        </Link>
      </p>
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
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-bold text-text">
        {label}
      </label>
      {children}
      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </div>
  );
}
