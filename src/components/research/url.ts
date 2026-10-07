// The research drawer lives in the URL as ?research=<id> (see drawer-url.ts).
import { closeDrawer, openDrawer } from "@/components/drawer-url";

export const openResearch = (id: string) => openDrawer("research", id);
export const closeResearch = () => closeDrawer("research");
