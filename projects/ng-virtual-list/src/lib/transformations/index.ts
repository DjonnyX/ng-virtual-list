import { objectAsReadonly } from "../utils/object";
import { linearСarousel } from "./linear-carousel";
import { eventHorizonСarousel } from "./event-horizon-carousel";
import { carouselLinearFading } from "./linear-fading-carousel";
import { carouselLinearFading3D } from "./linear-fading-carousel-3d";

export const ItemTransformations = objectAsReadonly({
    EVENT_HORIZON_CAROUSEL: eventHorizonСarousel,
    LINEAR_CAROUSEL: linearСarousel,
    CAROUSEL_LINEAR_FADING: carouselLinearFading,
    CAROUSEL_LINEAR_FADING_3D: carouselLinearFading3D,
});
