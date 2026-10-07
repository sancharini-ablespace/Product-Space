// The POC drawer lives in the URL as ?poc=<id> (see drawer-url.ts).
import { closeDrawer, openDrawer } from "@/components/drawer-url";

export const openPoc = (id: string) => openDrawer("poc", id);
export const closePoc = () => closeDrawer("poc");
/** From the POC drawer to a requested feature's drawer. */
export const openFeatureFromPoc = (featureId: string) => openDrawer("feature", featureId);
