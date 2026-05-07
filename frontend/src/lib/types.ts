/**
 * 백엔드 API와 공유하는 도메인 타입.
 * 백엔드 응답이 snake_case `line_no`를 그대로 내려주므로 동일하게 둠.
 */

export interface User {
  id: number;
  username: string;
  name: string;
  dong: string;
  unit: string;
  line_no: string;
  phone: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: User;
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'bad_request'
  | 'conflict'
  | 'not_found'
  | 'forbidden'
  | 'internal_error';

export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
}

/**
 * 게시글 작성자 정보 (BE 응답 그대로 snake_case 유지).
 * `phone`은 status='matched'일 때만 포함된다 (M3에서는 항상 미존재).
 */
export interface RequestAuthor {
  id: number;
  name: string;
  dong: string;
  unit: string;
  line_no: string;
  phone?: string;
}

export type RequestStatus = 'open' | 'matched' | 'expired' | 'cancelled';

export interface RequestPublic {
  id: number;
  name: string;
  category: string;
  description: string;
  urgent: boolean;
  status: RequestStatus;
  start_time: string;
  expires_at: string;
  created_at: string;
  author: RequestAuthor;
}

export interface RequestListResponse {
  items: RequestPublic[];
}

/**
 * Offer 도메인 타입.
 * `phone`은 status='matched' && (현재 사용자가 request 작성자 + offer가 accepted) 일 때만 채워짐.
 */
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Offerer {
  id: number;
  name: string;
  dong: string;
  unit: string;
  line_no: string;
  phone?: string;
}

export interface OfferPublic {
  id: number;
  request_id: number;
  rental_time: string;
  return_time: string;
  rental_place: string;
  return_place: string;
  status: OfferStatus;
  created_at: string;
  offerer: Offerer;
}

/**
 * GET /api/v1/requests/:id 응답.
 * - 작성자: 자기 글의 모든 offer (cancelled 제외)
 * - 이웃: 자기가 등록한 offer만
 */
export interface RequestDetailResponse {
  request: RequestPublic;
  offers: OfferPublic[];
  pending_offer_count: number;
}

/**
 * POST /api/v1/offers/:id/accept 응답.
 * 양 당사자(request 작성자/offer 작성자) 모두의 phone이 채워져 옴.
 */
export interface MatchedResponse {
  request: RequestPublic;
  offer: OfferPublic;
}
