import { Redirect } from 'expo-router';
import { useUser } from '../../contexts/UserContext';

export default function GuestOnly({ children }) {
  const { user, loading, initializing } = useUser();

  if (loading || initializing) return null;
  if (user) return <Redirect href="/(app)/home" />;

  return children;
}
