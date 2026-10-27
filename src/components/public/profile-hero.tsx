'use client';
import { useSearchParams } from 'next/navigation';
import { ProfileHeroView } from './profile-hero-view';
export function ProfileHero(
  props: Omit<Parameters<typeof ProfileHeroView>[0], 'variant'>,
) {
  const params = useSearchParams();
  return <ProfileHeroView {...props} variant={params.get('variant')} />;
}
