import { useQuery } from '@tanstack/react-query';

export function useAuth() {
  // For now, bypass auth check - always authenticated
  return {
    user: {
      id: '43963086',
      email: 'timfulker@gmail.com',
      firstName: 'Tim',
      lastName: 'Fulker',
      isAdmin: true,
      tier: 'enterprise',
      isActive: true
    },
    isAuthenticated: true,
    isLoading: false,
    refetch: () => {}
  };
}