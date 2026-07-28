export const AMENITY_META: Record<string, { label: string; icon: string }> = {
  tv: { label: 'TV screen', icon: '📺' },
  projector: { label: 'Projector', icon: '📽️' },
  whiteboard: { label: 'Whiteboard', icon: '🖊️' },
  videoconf: { label: 'Video conference', icon: '📹' },
};

export function amenityLabel(key: string): string {
  return AMENITY_META[key]?.label ?? key;
}

export function amenityIcon(key: string): string {
  return AMENITY_META[key]?.icon ?? '•';
}
