import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function Page() {
  return <AuthForm />;
}
