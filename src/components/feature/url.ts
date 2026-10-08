// The feature drawer lives in the URL as ?feature=<id> (see drawer-url.ts).
import { closeDrawer, openDrawer } from '@/components/drawer-url';

export const openFeature = (id: string) => openDrawer('feature', id);
export const closeFeature = () => closeDrawer('feature');
