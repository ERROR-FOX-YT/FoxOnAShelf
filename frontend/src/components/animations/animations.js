/**
 * Booked™ - Animaciones con anime.js (https://animejs.com).
 *
 * Funciones reutilizables. Cada componente puede llamarlas con la ref
 * apropiada — anime.js está en dependencies en frontend/package.json.
 */
import anime from 'animejs';

export function cardEntrance(targets, delay = 0) {
  return anime({
    targets,
    translateY: [16, 0],
    opacity:    [0, 1],
    duration:   650,
    delay:      anime.stagger(80, { start: delay }),
    easing:     'easeOutCubic'
  });
}

export function bannerEntrance(target) {
  return anime({
    targets: target,
    opacity: [0, 1],
    translateY: [-20, 0],
    scale: [0.98, 1],
    duration: 700,
    easing: 'easeOutBack'
  });
}

export function buttonPulse(target) {
  return anime({
    targets: target,
    scale: [1, 1.06, 1],
    duration: 220,
    easing: 'easeInOutSine'
  });
}

export function loadingDots(target) {
  return anime({
    targets: target,
    translateY: [0, -6, 0],
    delay:    anime.stagger(120),
    duration: 700,
    loop:     true,
    easing:   'easeInOutSine'
  });
}

export function announcementShimmer(target) {
  return anime({
    targets: target,
    backgroundPosition: ['0% 0%', '200% 0%'],
    duration: 2200,
    loop: true,
    easing: 'linear'
  });
}

export default anime;
