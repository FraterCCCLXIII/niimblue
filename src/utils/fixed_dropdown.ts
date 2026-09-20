import Dropdown from "bootstrap/js/dist/dropdown";

/** Svelte action so Bootstrap menus use the viewport instead of overflow parents. */
export function fixedDropdown(node: HTMLElement) {
  Dropdown.getInstance(node)?.dispose();
  const instance = Dropdown.getOrCreateInstance(node, {
    boundary: "viewport",
    popperConfig: (defaultConfig: Record<string, unknown> = {}) => ({
      ...defaultConfig,
      strategy: "fixed",
    }),
  });

  return {
    destroy() {
      instance.dispose();
    },
  };
}
