import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="text-2xl font-black text-wd-fg-primary">페이지를 찾을 수 없어요</h1>
      <p className="text-[13px] text-wd-fg-tertiary">요청하신 경로가 존재하지 않아요.</p>
      <Link to="/" className="text-[13px] font-bold text-wd-primary">
        ← 메인으로
      </Link>
    </div>
  );
}
