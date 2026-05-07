import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="p-6 flex flex-col gap-3">
      <h1 className="text-2xl font-black">페이지를 찾을 수 없어요</h1>
      <p className="text-sub text-sm">요청하신 경로가 존재하지 않아요.</p>
      <Link to="/" className="text-primary text-sm font-bold">
        ← 메인으로
      </Link>
    </div>
  );
}
