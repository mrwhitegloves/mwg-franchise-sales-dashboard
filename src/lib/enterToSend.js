// Chat box Enter key (2026-11-19).
// Laptop / desktop: Enter sends, Shift + Enter = new line (as before).
// Phone / tablet (touch screen, no mouse): the keyboard has no Shift, so Enter = new line
// and the message goes with the Send button.
export function isTouchDevice() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  // primary input is a finger and nothing can hover → phone / tablet
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** true when this keydown should send the message */
export function enterSends(e) {
  if (e.key !== "Enter" || e.shiftKey) return false;
  if (e.nativeEvent?.isComposing || e.isComposing) return false;   // IME / predictive text still composing
  return !isTouchDevice();
}
