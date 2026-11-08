import { Redirect, usePathname } from 'expo-router';
import { useUser } from '../../contexts/UserContext';

export default function GuestOnly({ children }) {
  const { user, loading, initializing } = useUser();
  const pathname = usePathname();

  if (initializing) return null;
  if (loading) return children;
  if (user) {
    const isLoginRoute = /(?:^|\/)login(?:\/|$)/i.test(pathname || '');
    if (isLoginRoute) return children;
    return <Redirect href="/home" />;
  }

  return children;
}
