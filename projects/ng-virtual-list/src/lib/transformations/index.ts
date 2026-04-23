import { objectAsReadonly } from "../utils/object";
import { carouselEventHorizon } from "./carousel-event-horizon";

export const ItemTransformations = objectAsReadonly({
    CAROUSEL_EVENT_HORIZON: carouselEventHorizon,
});
