export const SESSION_EXPIRED_EVENT = 'miniflow:session-expired';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = RequestInit & { expireSession?: boolean };
function errorMessage(status: number, path: string) {
  if (status === 401)
    return path === '/auth/login'
      ? 'Email hoặc mật khẩu không đúng.'
      : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 409) return 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.';
  if (status === 403) return 'Yêu cầu bị từ chối. Vui lòng tải lại trang và thử lại.';
  if (status === 404) return 'Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.';
  if (status === 400) return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.';
  return 'Không kết nối được máy chủ. Vui lòng thử lại.';
}

export async function apiRequest<T>(path: string, options: Options = {}): Promise<T> {
  const { expireSession = true, ...requestOptions } = options;
  const base = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...requestOptions,
      headers: {
        ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
        ...requestOptions.headers,
      },
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.');
  }
  if (!response.ok) {
    if (response.status === 401 && expireSession && typeof window !== 'undefined')
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError(response.status, errorMessage(response.status, path));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
