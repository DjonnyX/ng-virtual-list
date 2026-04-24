import { objectAsReadonly } from "../utils/object";
import { linearСarousel } from "./linear-carousel";
import { eventHorizonСarousel } from "./event-horizon-carousel";
import { carouselDeckOfCards } from "./carousel-deck-of-cards";
import { carouselDeckOfCards3D } from "./carousel-deck-of-cards-3d";

export const ItemTransformations = objectAsReadonly({
    EVENT_HORIZON_CAROUSEL: eventHorizonСarousel,
    LINEAR_CAROUSEL: linearСarousel,
    CAROUSEL_DECK_OF_CARDS: carouselDeckOfCards,
    CAROUSEL_DECK_OF_CARDS_3D: carouselDeckOfCards3D,
});
