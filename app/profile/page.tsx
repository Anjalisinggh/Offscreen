import ProfileLoader from '@/components/profile-loader';

export const metadata = { title: 'Profile · Offscreen' };

// personal, so it's loaded in the browser from the API (components/profile-loader.tsx)
export default function Profile() {
  return <ProfileLoader />;
}
