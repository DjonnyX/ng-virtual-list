const userAgent = navigator.userAgent.toLowerCase();

export const IS_FIREFOX = /firefox/.test(userAgent);

export const IS_CROME = /chrome/.test(userAgent);

export const IS_SAFARI = /(safari)/.test(userAgent);

export const IS_IOS = /(iphone|ipad|ipod)/.test(userAgent);

export const IS_ANDROID = /android/.test(userAgent);

export const IS_EDGE = /edge/.test(userAgent);

export const IS_XIAOMI = /xiaomi/.test(userAgent);

export const FIREFOX_SCROLLBAR_OVERLAP_SIZE = 12;
