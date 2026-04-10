import { Redirect } from 'expo-router';
import { useUser } from '../../contexts/UserContext';

export default function UserOnly({ children }) {
  const { user, loading, initializing } = useUser();

  if (loading || initializing) return null; // or loader
  if (!user) return <Redirect href="/(auth)/login" />;

  return children;
}
